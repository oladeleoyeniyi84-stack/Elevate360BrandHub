#!/usr/bin/env python3
"""Copy a stable bounded audit file without modifying or rotating the source."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile

MAX_BYTES = 16 * 1024 * 1024

def reject_constant(value):
    raise ValueError('invalid_json_constant')

def identity(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns,
            info.st_ctime_ns, info.st_mode, info.st_uid, info.st_gid, info.st_nlink)

def snapshot(source_path, output_directory):
    source, directory = Path(source_path), Path(output_directory)
    if any(not p.is_absolute() or p.resolve() != p for p in (source, directory)):
        raise ValueError('unsafe_path')
    info = directory.stat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise ValueError('unsafe_output_directory')
    fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    temporary = None
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or \
                stat.S_IMODE(before.st_mode) != 0o600 or not 0 < before.st_size <= MAX_BYTES:
            raise ValueError('unsafe_source')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            data = stream.read(MAX_BYTES + 1)
            if len(data) != before.st_size or identity(os.fstat(fd)) != identity(before):
                raise ValueError('source_changed')
            stream.seek(0)
            if stream.read(MAX_BYTES + 1) != data or identity(os.fstat(fd)) != identity(before):
                raise ValueError('source_changed')
        if identity(source.lstat()) != identity(before):
            raise ValueError('source_replaced')
        # Preserve bytes exactly; only require complete UTF-8 JSON object lines.
        # This validates framing, not truth or authenticity of audit events.
        if not data.endswith(b'\n'):
            raise ValueError('incomplete_record')
        for line in data.splitlines():
            if len(line) > 16384 or not isinstance(json.loads(line.decode('utf-8'), parse_constant=reject_constant), dict):
                raise ValueError('invalid_record')
        digest = hashlib.sha256(data).hexdigest()
        final = directory / ('gateway-audit-' + digest + '.jsonl')
        out, name = tempfile.mkstemp(prefix='.audit-pending-', dir=directory)
        temporary = Path(name)
        with os.fdopen(out, 'wb') as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        # Publish without replacement; existing snapshots remain untouched.
        os.link(temporary, final)
        temporary.unlink()
        temporary = None
        out = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(out)
        finally:
            os.close(out)
        return {'snapshotCreated': True, 'path': str(final), 'sha256': digest,
                'bytes': len(data), 'sourceModified': False, 'externalRetentionVerified': False}
    finally:
        os.close(fd)
        if temporary is not None:
            temporary.unlink()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('output_directory')
    args = parser.parse_args()
    try:
        print(json.dumps(snapshot(args.source, args.output_directory)))
    except Exception:
        print('{"snapshotCreated":false,"reason":"audit_snapshot_failed"}')
        raise SystemExit(2)
