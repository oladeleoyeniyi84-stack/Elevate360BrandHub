import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('snapshot_audit', Path(__file__).with_name('snapshot-audit.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

class SnapshotTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.source = self.root / 'gateway.jsonl'
        self.data = b'{"decision":"startup","registryVersion":1}\n'
        self.source.write_bytes(self.data)
        self.source.chmod(0o600)
        self.output = self.root / 'snapshots'
        self.output.mkdir(mode=0o700)

    def run_snapshot(self):
        return audit.snapshot(self.source, self.output)

    def test_exact_bytes_private_mode_and_no_overwrite(self):
        result = self.run_snapshot()
        saved = Path(result['path'])
        self.assertEqual(saved.read_bytes(), self.data)
        self.assertEqual(saved.stat().st_mode & 0o777, 0o600)
        self.assertEqual(result['sha256'], hashlib.sha256(self.data).hexdigest())
        self.assertFalse(result['externalRetentionVerified'])
        with self.assertRaises(FileExistsError):
            self.run_snapshot()
        self.assertEqual(list(self.output.iterdir()), [saved])
        self.assertEqual(self.source.read_bytes(), self.data)

    def test_empty_partial_invalid_and_oversized_rejected(self):
        for data in [b'', b'{}', b'[]\n', b'invalid\n', b'\xff\n', b'{"a":NaN}\n', b'{"a":"' + b'a' * 16384 + b'"}\n']:
            self.source.write_bytes(data)
            with self.assertRaises((ValueError, UnicodeError)):
                self.run_snapshot()
            self.assertEqual(list(self.output.iterdir()), [])
        self.source.write_bytes(self.data)
        with patch.object(audit, 'MAX_BYTES', 8), self.assertRaises(ValueError):
            self.run_snapshot()

    def test_unsafe_paths_modes_links_and_fifo(self):
        self.source.chmod(0o644)
        with self.assertRaises(ValueError): self.run_snapshot()
        self.source.chmod(0o600)
        self.output.chmod(0o755)
        with self.assertRaises(ValueError): self.run_snapshot()
        self.output.chmod(0o700)
        saved = self.root / 'original'
        self.source.rename(saved)
        for create in [lambda: self.source.symlink_to(saved), lambda: os.link(saved, self.source), lambda: os.mkfifo(self.source)]:
            create()
            with self.assertRaises(ValueError): self.run_snapshot()
            self.source.unlink()
        self.assertEqual(list(self.output.iterdir()), [])

    def test_detects_change_during_snapshot(self):
        real = os.fstat
        calls = 0
        def changed(fd):
            nonlocal calls
            calls += 1
            if calls == 2:
                with self.source.open('ab') as stream: stream.write(b'{}\n')
            return real(fd)
        with patch.object(audit.os, 'fstat', changed), self.assertRaises(ValueError):
            self.run_snapshot()
        self.assertEqual(list(self.output.iterdir()), [])

    def test_cli_sanitizes_failure(self):
        result = subprocess.run([sys.executable, audit.__file__, str(self.root / 'missing'), str(self.output)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout), {'snapshotCreated': False, 'reason': 'audit_snapshot_failed'})
        self.assertEqual(result.stderr, '')

if __name__ == '__main__': unittest.main()
