import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
import subprocess

spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('collect-host-evidence.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.host = self.root / 'host'
        for path in [self.repo / p for p in collector.CONFIGS] + [self.host / p.lstrip('/') for p in collector.HOST_FILES]:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'original local settings\n')
        self.calls = []

    def runner(self, argv, cwd):
        self.calls.append(argv)
        return 0, b'fixture output\n', b''

    def collect(self, runner=None):
        return collector.collect(self.repo, self.root / 'evidence', 'a' * 40,
                                 runner or self.runner, self.host)

    def test_preserves_source_and_hashes_all_evidence(self):
        before = {str(p): p.read_bytes() for p in self.repo.rglob('*') if p.is_file()}
        output, summary = self.collect()
        self.assertTrue(summary['collectionComplete'])
        self.assertFalse(summary['readyForDeployment'])
        self.assertFalse(summary['productionChanged'])
        self.assertEqual(before, {str(p): p.read_bytes() for p in self.repo.rglob('*') if p.is_file()})
        self.assertEqual((output / 'file-03').read_bytes(), b'original local settings\n')
        manifest = (output / 'SHA256SUMS').read_text().splitlines()
        self.assertEqual(len(manifest), len(list(output.iterdir())) - 1)
        for line in manifest:
            digest, name = line.split('  ')
            self.assertEqual(digest, hashlib.sha256((output / name).read_bytes()).hexdigest())
        self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o700)
        for path in output.iterdir():
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertIn(['git', 'cat-file', '-e', 'a' * 40 + '^{commit}'], self.calls)
        # No shell, fetch/reset/checkout, container lifecycle or service mutations.
        allowed = {'git': {'rev-parse', 'status', 'diff', 'cat-file', 'show'},
                   'resolvectl': {'dns'}, 'nft': {'list'}, 'systemctl': {'is-enabled', 'is-active'},
                   'docker': {'inspect'}, 'sysctl': {'net.ipv4.ip_forward'}}
        for argv in self.calls:
            self.assertIn(argv[1], allowed[argv[0]])
        projection = next(c[-1] for c in self.calls if c[0] == 'docker')
        self.assertNotIn('.Config.Env', projection)

    def test_failures_are_recorded_and_do_not_short_circuit_collection(self):
        def failure(argv, cwd):
            self.calls.append(argv)
            return (1, b'', b'not present') if argv[0] == 'git' else (0, b'ok', b'')
        output, summary = self.collect(failure)
        self.assertFalse(summary['collectionComplete'])
        self.assertTrue(any(c[0] == 'docker' for c in self.calls))
        self.assertTrue((output / 'SHA256SUMS').exists())
        self.assertEqual(json.loads((output / 'summary.json').read_text()), summary)

    def test_rejects_symlink_and_oversized_file(self):
        config = self.repo / collector.CONFIGS[0]
        config.unlink()
        config.symlink_to(self.repo / collector.CONFIGS[1])
        (self.repo / collector.CONFIGS[2]).write_bytes(b'x' * (collector.MAX_FILE + 1))
        output, summary = self.collect()
        self.assertFalse(summary['collectionComplete'])
        self.assertFalse((output / 'file-00').exists())
        self.assertFalse((output / 'file-02').exists())

    def test_output_truncation_is_not_success(self):
        output, summary = self.collect(lambda argv, cwd: (0, b'x' * (collector.MAX_FILE + 1), b''))
        self.assertFalse(summary['collectionComplete'])
        self.assertEqual((output / 'git-head.out').stat().st_size, collector.MAX_FILE)
        self.assertTrue(summary['records'][0]['truncated'])

    def test_invalid_candidate_and_checkout_output_rejected_before_commands(self):
        for candidate in ['main', '-x', 'A' * 40, 'a' * 39]:
            with self.assertRaises(ValueError):
                collector.collect(self.repo, self.root / 'evidence', candidate, self.runner)
        with self.assertRaises(ValueError):
            collector.collect(self.repo, self.repo / 'evidence', 'a' * 40, self.runner)
        self.assertEqual(self.calls, [])

    def test_timeout_and_missing_binary_are_explicit(self):
        for error, expected in [(subprocess.TimeoutExpired('git', 20), 124), (FileNotFoundError(), 127)]:
            with patch.object(collector.subprocess, 'run', side_effect=error):
                self.assertEqual(collector.run_command(['git', 'status'], self.repo)[0], expected)

    def test_repeated_collection_creates_separate_bundles(self):
        first, _ = self.collect()
        second, _ = self.collect()
        self.assertNotEqual(first, second)
        self.assertTrue((first / 'SHA256SUMS').exists())

    def test_real_git_preserves_staged_unstaged_and_untracked_configuration(self):
        def git(*args):
            return subprocess.check_output(['git', *args], cwd=self.repo)
        git('init', '-q')
        git('config', 'user.email', 'fixture@example.invalid')
        git('config', 'user.name', 'Fixture')
        git('add', *collector.CONFIGS[:3])
        git('commit', '-qm', 'fixture baseline')
        candidate = git('rev-parse', 'HEAD').decode().strip()
        (self.repo / collector.CONFIGS[0]).write_text('staged modification\n')
        git('add', collector.CONFIGS[0])
        (self.repo / collector.CONFIGS[1]).write_text('unstaged modification\n')
        status_before = git('status', '--porcelain=v1')
        def mixed_runner(argv, cwd):
            return collector.run_command(argv, cwd) if argv[0] == 'git' else self.runner(argv, cwd)
        output, summary = collector.collect(self.repo, self.root / 'evidence', candidate,
                                             mixed_runner, self.host)
        self.assertTrue(summary['collectionComplete'])
        diff = (output / 'host-changes.out').read_text()
        self.assertIn('+staged modification', diff)
        self.assertIn('+unstaged modification', diff)
        self.assertEqual((output / 'candidate-config-0.out').read_text(), 'original local settings\n')
        self.assertEqual(git('status', '--porcelain=v1'), status_before)


if __name__ == '__main__':
    unittest.main()
