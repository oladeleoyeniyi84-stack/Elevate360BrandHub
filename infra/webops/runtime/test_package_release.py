import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('packager', Path(__file__).with_name('package-release.py'))
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)

class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.out = self.root / 'output'
        self.out.mkdir(mode=0o700)
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Fixture')
        for name in packager.REQUIRED:
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('committed fixture\n')
        (self.repo / 'unrelated.txt').write_text('not a runtime file')
        self.commit = self.commit_all()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], stderr=subprocess.DEVNULL).decode().strip()

    def commit_all(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture')
        return self.git('rev-parse', 'HEAD')

    def test_exact_commit_manifest_and_dirty_checkout_preserved(self):
        changed = self.repo / 'infra/webops/runtime/build.mjs'
        changed.write_text('uncommitted local changes')
        self.git('add', str(changed))
        changed.write_text('additional unstaged changes')
        (self.repo / 'infra/webops/runtime/private.env').write_text('not exported')
        before = self.git('status', '--porcelain')
        receipt = packager.package(self.repo, self.commit, self.out)
        path = self.out / receipt['name']
        self.assertEqual(receipt['sha256'], hashlib.sha256(path.read_bytes()).hexdigest())
        self.assertFalse(receipt['deployed'])
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        with tarfile.open(path) as archive:
            manifest = json.load(archive.extractfile('RELEASE-MANIFEST.json'))
            self.assertEqual(manifest['commit'], self.commit)
            self.assertNotIn('unrelated.txt', archive.getnames())
            self.assertNotIn('infra/webops/runtime/private.env', archive.getnames())
            for entry in manifest['files']:
                data = archive.extractfile(entry['path']).read()
                self.assertEqual(hashlib.sha256(data).hexdigest(), entry['sha256'])
                self.assertEqual(data, b'committed fixture\n')
        self.assertEqual(self.git('status', '--porcelain'), before)
        self.assertEqual(changed.read_text(), 'additional unstaged changes')

    def test_deterministic_output_and_no_overwrite(self):
        first = packager.package(self.repo, self.commit, self.out)
        other = self.root / 'other'
        other.mkdir(mode=0o700)
        second = packager.package(self.repo, self.commit, other)
        self.assertEqual(first['sha256'], second['sha256'])
        with self.assertRaises(FileExistsError):
            packager.package(self.repo, self.commit, self.out)
        self.assertEqual(len(list(self.out.iterdir())), 1)

    def test_missing_required_file_blocks(self):
        (self.repo / 'infra/webops/runtime/build.mjs').unlink()
        commit = self.commit_all()
        with self.assertRaises(ValueError):
            packager.package(self.repo, commit, self.out)
        self.assertEqual(list(self.out.iterdir()), [])

    def test_symlink_and_environment_file_block(self):
        target = self.repo / 'infra/webops/runtime/secret.env'
        target.write_text('private')
        with self.assertRaises(ValueError):
            packager.package(self.repo, self.commit_all(), self.out)
        target.unlink()
        os.symlink('/etc/passwd', self.repo / 'infra/webops/runtime/linked.md')
        with self.assertRaises(ValueError):
            packager.package(self.repo, self.commit_all(), self.out)

    def test_ref_alias_and_unsafe_destination_block(self):
        with self.assertRaises(ValueError):
            packager.package(self.repo, 'HEAD', self.out)
        self.out.chmod(0o755)
        with self.assertRaises(ValueError):
            packager.package(self.repo, self.commit, self.out)

if __name__ == '__main__':
    unittest.main()
