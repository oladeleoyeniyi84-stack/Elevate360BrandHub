import hashlib
import importlib.util
import io
import json
import os
import subprocess
import sys
from pathlib import Path
import tarfile
import unittest
import test_package_release as fixtures

spec = importlib.util.spec_from_file_location('stager', Path(__file__).with_name('stage-release.py'))
stager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stager)

class StageTests(unittest.TestCase):
    setUp = fixtures.ReleaseTests.setUp
    git = fixtures.ReleaseTests.git
    commit_all = fixtures.ReleaseTests.commit_all

    def prepare(self):
        receipt = fixtures.packager.package(self.repo, self.commit, self.out)
        root = self.root / 'releases'
        root.mkdir(mode=0o700)
        return self.out / receipt['name'], receipt['sha256'], root

    def test_package_to_stage_roundtrip(self):
        archive, digest, root = self.prepare()
        result = stager.stage(archive, digest, self.commit, root)
        self.assertFalse(result['activated'])
        release = root / self.commit
        manifest = json.loads((release / 'RELEASE-MANIFEST.json').read_text())
        for entry in manifest['files']:
            file = release / entry['path']
            self.assertEqual(hashlib.sha256(file.read_bytes()).hexdigest(), entry['sha256'])
            self.assertEqual(file.stat().st_mode & 0o777, int(entry['mode'], 8))
        self.assertEqual(list(root.iterdir()), [release])
        self.assertTrue(stager.verify_staged(archive, digest, self.commit, root)['verified'])

    def test_staged_content_drift_and_missing_files(self):
        archive, digest, root = self.prepare()
        stager.stage(archive, digest, self.commit, root)
        target = root / self.commit / 'infra/webops/runtime/build.mjs'
        original = target.read_bytes()
        for replacement in [b'x' * len(original), b'longer content']:
            target.write_bytes(replacement)
            with self.assertRaises(ValueError):
                stager.verify_staged(archive, digest, self.commit, root)
            self.assertEqual(target.read_bytes(), replacement)
        target.unlink()
        with self.assertRaises(ValueError):
            stager.verify_staged(archive, digest, self.commit, root)

    def test_staged_extra_entries_and_permissions(self):
        archive, digest, root = self.prepare()
        stager.stage(archive, digest, self.commit, root)
        release = root / self.commit
        extra = release / 'unexpected'
        extra.mkdir()
        with self.assertRaises(ValueError):
            stager.verify_staged(archive, digest, self.commit, root)
        extra.rmdir()
        for target, mode in [(release / 'infra', 0o755), (release / 'RELEASE-MANIFEST.json', 0o666)]:
            original = target.stat().st_mode & 0o777
            target.chmod(mode)
            with self.assertRaises(ValueError):
                stager.verify_staged(archive, digest, self.commit, root)
            target.chmod(original)

    def test_staged_links_special_files_and_lock(self):
        archive, digest, root = self.prepare()
        stager.stage(archive, digest, self.commit, root)
        target = root / self.commit / 'infra/webops/runtime/build.mjs'
        saved = self.root / 'saved'
        target.rename(saved)
        for create in [lambda: target.symlink_to(saved), lambda: os.link(saved, target), lambda: os.mkfifo(target)]:
            create()
            with self.assertRaises((ValueError, OSError)):
                stager.verify_staged(archive, digest, self.commit, root)
            target.unlink()
        saved.rename(target)
        lock = root / '.stage.lock'
        lock.mkdir()
        with self.assertRaises(ValueError):
            stager.verify_staged(archive, digest, self.commit, root)
        self.assertTrue(lock.is_dir())

    def test_verify_cli_never_stages_missing_release(self):
        archive, digest, root = self.prepare()
        command = [sys.executable, stager.__file__, str(archive), digest, self.commit, str(root), '--verify-only']
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout), {'verified': False, 'reason': 'release_verification_failed'})
        self.assertEqual(list(root.iterdir()), [])
        stager.stage(archive, digest, self.commit, root)
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertFalse(json.loads(result.stdout)['activated'])

    def test_wrong_digest_or_commit_writes_nothing(self):
        archive, digest, root = self.prepare()
        for sha, commit in [('0' * 64, self.commit), (digest, '1' * 40)]:
            with self.assertRaises(ValueError):
                stager.stage(archive, sha, commit, root)
        self.assertEqual(list(root.iterdir()), [])

    def test_existing_release_and_lock_are_preserved(self):
        archive, digest, root = self.prepare()
        final = root / self.commit
        final.mkdir()
        (final / 'preserve').write_text('existing')
        with self.assertRaises(ValueError):
            stager.stage(archive, digest, self.commit, root)
        self.assertEqual((final / 'preserve').read_text(), 'existing')
        (root / '.stage.lock').mkdir()
        with self.assertRaises(FileExistsError):
            stager.stage(archive, digest, self.commit, root)
        self.assertTrue((root / '.stage.lock').is_dir())

    def test_unsafe_members_rejected_before_writes(self):
        archive, _, root = self.prepare()
        for name, kind in [('../escape', tarfile.REGTYPE), ('/absolute', tarfile.REGTYPE),
                           ('link', tarfile.SYMTYPE), ('hard', tarfile.LNKTYPE), ('pipe', tarfile.FIFOTYPE)]:
            buffer = io.BytesIO()
            with tarfile.open(fileobj=buffer, mode='w') as tar:
                item = tarfile.TarInfo(name)
                item.type, item.mode = kind, 0o644
                tar.addfile(item, io.BytesIO(b''))
            data = buffer.getvalue()
            archive.write_bytes(data)
            with self.assertRaises((ValueError, KeyError)):
                stager.stage(archive, hashlib.sha256(data).hexdigest(), self.commit, root)
            self.assertEqual(list(root.iterdir()), [])

    def test_changed_member_fails_even_with_matching_outer_digest(self):
        archive, _, root = self.prepare()
        buffer = io.BytesIO()
        with tarfile.open(archive) as original, tarfile.open(fileobj=buffer, mode='w') as changed:
            for item in original:
                data = original.extractfile(item).read()
                if item.name.endswith('build.mjs'):
                    data = b'altered'
                    item.size = len(data)
                changed.addfile(item, io.BytesIO(data))
        data = buffer.getvalue()
        archive.write_bytes(data)
        with self.assertRaises(ValueError):
            stager.stage(archive, hashlib.sha256(data).hexdigest(), self.commit, root)
        self.assertEqual(list(root.iterdir()), [])

if __name__ == '__main__':
    unittest.main()
