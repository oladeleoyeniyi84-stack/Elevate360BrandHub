import hashlib
import importlib.util
import json
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

if __name__ == '__main__': unittest.main()
