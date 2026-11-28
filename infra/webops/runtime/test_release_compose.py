import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('release_compose', Path(__file__).with_name('release-compose.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
IMAGE = 'sha256:' + 'a' * 64

class ReleaseComposeTests(unittest.TestCase):
    def test_pinned_model_preserves_isolation_and_project(self):
        config = release.model(IMAGE)
        self.assertEqual(config['name'], 'runtime')
        worker, gateway = config['services'].values()
        for service in (worker, gateway):
            self.assertEqual(service['image'], IMAGE)
            self.assertEqual(service['pull_policy'], 'never')
            self.assertEqual(service['restart'], 'no')
            self.assertEqual(service['user'], '1000:1000')
            self.assertTrue(service['read_only'])
            self.assertEqual(service['cap_drop'], ['ALL'])
            self.assertEqual(service['ipc'], 'private')
            self.assertNotIn('ports', service)
            self.assertNotIn('build', service)
        self.assertNotIn('volumes', worker)
        self.assertEqual(worker['networks'], {'worker_internal': {'ipv4_address': '172.30.0.3'}})
        self.assertEqual(gateway['networks']['worker_internal']['ipv4_address'], '172.30.0.2')
        self.assertFalse(gateway['volumes'][0]['bind']['create_host_path'])
        self.assertTrue(config['networks']['worker_internal']['internal'])

    def test_mutable_tags_short_ids_and_injection_rejected(self):
        for value in ['local:latest', 'a' * 64, 'sha256:abcd', IMAGE + '\n', '${IMAGE}', None]:
            with self.assertRaises(ValueError): release.model(value)

    def test_private_deterministic_file_no_overwrite_and_separate_rollback(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            receipt = release.prepare(IMAGE, root)
            file = Path(receipt['path'])
            data = file.read_bytes()
            self.assertEqual(receipt['sha256'], hashlib.sha256(data).hexdigest())
            self.assertEqual(file.stat().st_mode & 0o777, 0o600)
            self.assertFalse(receipt['deployed'])
            self.assertFalse(receipt['imageVerified'])
            with self.assertRaises(FileExistsError): release.prepare(IMAGE, root)
            self.assertEqual(file.read_bytes(), data)
            other = release.prepare('sha256:' + 'b' * 64, root)
            self.assertNotEqual(other['path'], receipt['path'])
            self.assertEqual(len(list(root.iterdir())), 2)

    def test_unsafe_directory_and_sanitized_cli(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            root.chmod(0o755)
            with self.assertRaises(ValueError): release.prepare(IMAGE, root)
            result = subprocess.run([sys.executable, release.__file__, IMAGE, name], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout), {'prepared': False, 'reason': 'release_compose_failed'})
            self.assertEqual(list(root.iterdir()), [])

    def test_verification_is_read_only_and_rejects_digest_or_image_drift(self):
        with tempfile.TemporaryDirectory() as name:
            receipt = release.prepare(IMAGE, Path(name))
            file = Path(receipt['path'])
            before = file.read_bytes(), file.stat().st_mtime_ns, sorted(Path(name).iterdir())
            result = release.verify(IMAGE, file, receipt['sha256'])
            self.assertTrue(result['configurationVerified'])
            self.assertFalse(result['imageVerified'])
            self.assertFalse(result['deployed'])
            for digest in ['0' * 64, '', None]:
                with self.assertRaises(ValueError): release.verify(IMAGE, file, digest)
            with self.assertRaises(ValueError): release.verify('sha256:' + 'b' * 64, file, receipt['sha256'])
            self.assertEqual(before, (file.read_bytes(), file.stat().st_mtime_ns, sorted(Path(name).iterdir())))

    def test_matching_digest_does_not_allow_changed_model_or_noncanonical_bytes(self):
        with tempfile.TemporaryDirectory() as name:
            receipt = release.prepare(IMAGE, Path(name))
            file = Path(receipt['path'])
            original = file.read_bytes()
            changed = json.loads(original)
            changed['services']['webops-worker']['privileged'] = True
            for data in [json.dumps(changed).encode(), original + b' ', b'not JSON', b'x' * 16385]:
                file.write_bytes(data)
                with self.assertRaises(ValueError):
                    release.verify(IMAGE, file, hashlib.sha256(data).hexdigest())
                self.assertEqual(file.read_bytes(), data)

    def test_namespace_drift_rejected_even_with_matching_digest(self):
        with tempfile.TemporaryDirectory() as name:
            receipt = release.prepare(IMAGE, Path(name))
            file = Path(receipt['path'])
            for service in ['webops-worker', 'webops-egress-gateway']:
                for mode in [None, '', 'shareable', 'host', 'service:webops-worker']:
                    with self.subTest(service=service, mode=mode):
                        changed = release.model(IMAGE)
                        if mode is None:
                            del changed['services'][service]['ipc']
                        else:
                            changed['services'][service]['ipc'] = mode
                        data = (json.dumps(changed, sort_keys=True, indent=2) + '\n').encode()
                        file.write_bytes(data)
                        with self.assertRaises(ValueError):
                            release.verify(IMAGE, file, hashlib.sha256(data).hexdigest())
                        self.assertEqual(file.read_bytes(), data)

    def test_unsafe_files_and_links_are_rejected(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            receipt = release.prepare(IMAGE, root)
            file = Path(receipt['path'])
            file.chmod(0o644)
            with self.assertRaises(ValueError): release.verify(IMAGE, file, receipt['sha256'])
            file.chmod(0o600)
            link = root / 'link'
            link.symlink_to(file)
            with self.assertRaises(ValueError): release.verify(IMAGE, link, receipt['sha256'])
            link.unlink()
            os.link(file, link)
            with self.assertRaises(ValueError): release.verify(IMAGE, file, receipt['sha256'])
            link.unlink()
            fifo = root / 'fifo'
            os.mkfifo(fifo, 0o600)
            with self.assertRaises(ValueError): release.verify(IMAGE, fifo, receipt['sha256'])
            with self.assertRaises(ValueError): release.verify(IMAGE, 'relative.json', receipt['sha256'])

    def test_verification_cli_and_missing_digest_fail_without_publication(self):
        with tempfile.TemporaryDirectory() as name:
            receipt = release.prepare(IMAGE, Path(name))
            command = [sys.executable, release.__file__, '--verify-only', IMAGE, receipt['path']]
            result = subprocess.run(command + [receipt['sha256']], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            self.assertTrue(json.loads(result.stdout)['configurationVerified'])
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout), {'prepared': False, 'reason': 'release_compose_failed'})
            self.assertEqual(len(list(Path(name).iterdir())), 1)

if __name__ == '__main__': unittest.main()
