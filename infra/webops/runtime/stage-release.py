#!/usr/bin/env python3
"""Verify and stage source into a new directory; never execute archived code."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import stat
import tarfile
import tempfile

def verify(data, digest, commit):
    if not re.fullmatch(r'[a-f0-9]{64}', digest) or not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('invalid_identity')
    if len(data) > 10 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != digest:
        raise ValueError('digest_mismatch')
    files = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:') as archive:
        total = 0
        for member in archive:
            name = member.name
            if len(files) >= 201 or name in files or not member.isfile() or member.pax_headers:
                raise ValueError('invalid_member')
            if not re.fullmatch(r'[A-Za-z0-9_./-]+', name) or any(p in ('', '.', '..') for p in name.split('/')):
                raise ValueError('invalid_path')
            if member.mode not in (0o644, 0o755) or member.size > 1024 * 1024 or member.size < 0:
                raise ValueError('invalid_member_metadata')
            total += member.size
            if total > 9 * 1024 * 1024:
                raise ValueError('archive_limit')
            content = archive.extractfile(member).read()
            if len(content) != member.size:
                raise ValueError('truncated_member')
            files[name] = (member.mode, content)
    manifest = json.loads(files['RELEASE-MANIFEST.json'][1])
    if manifest.get('schemaVersion') != 1 or manifest.get('commit') != commit or \
            manifest.get('kind') != 'webops-source-release' or manifest.get('deployed') is not False or \
            manifest.get('imageIncluded') is not False:
        raise ValueError('invalid_manifest')
    entries = manifest.get('files')
    if not isinstance(entries, list) or not 1 <= len(entries) <= 200:
        raise ValueError('invalid_manifest_entries')
    expected = set()
    for item in entries:
        name = item['path']
        if name in expected or name == 'RELEASE-MANIFEST.json':
            raise ValueError('duplicate_manifest_entry')
        expected.add(name)
        mode, content = files[name]
        if item['bytes'] != len(content) or item['mode'] != format(mode, '03o') or \
                item['sha256'] != hashlib.sha256(content).hexdigest():
            raise ValueError('manifest_mismatch')
    if set(files) != expected | {'RELEASE-MANIFEST.json'}:
        raise ValueError('unlisted_member')
    # The separately supplied digest authenticates the chosen archive only insofar
    # as its trusted delivery channel does. No code or configuration is executed.
    return files

def stage(archive_path, digest, commit, release_root):
    path, root = Path(archive_path), Path(release_root)
    if not path.is_absolute() or path.resolve() != path or not root.is_absolute() or root.resolve() != root:
        raise ValueError('unsafe_path')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > 10 * 1024 * 1024:
            raise ValueError('unsafe_archive')
        with os.fdopen(fd, 'rb', closefd=False) as source:
            data = source.read(10 * 1024 * 1024 + 1)
    finally:
        os.close(fd)
    files = verify(data, digest, commit)
    info = root.stat()
    if not root.is_dir() or info.st_uid != os.getuid() or info.st_mode & 0o777 != 0o700:
        raise ValueError('unsafe_release_root')
    lock = root / '.stage.lock'
    lock.mkdir(mode=0o700)  # Never remove a lock owned by a previous attempt.
    temporary = None
    try:
        final = root / commit
        if os.path.lexists(final):
            raise ValueError('release_already_exists')
        temporary = Path(tempfile.mkdtemp(prefix='.staging-', dir=root))
        for name, (mode, content) in sorted(files.items()):
            target = temporary / name
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
            with os.fdopen(fd, 'wb') as output:
                output.write(content)
                output.flush()
                os.fchmod(output.fileno(), mode)
                os.fsync(output.fileno())
        for directory, _, _ in os.walk(temporary, topdown=False):
            directory_fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        os.rename(temporary, final)
        temporary = None
        directory_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        return {'staged': True, 'commit': commit, 'sha256': digest, 'directory': str(final),
                'activated': False, 'imageBuilt': False}
    finally:
        if temporary is not None:
            shutil.rmtree(temporary)
        lock.rmdir()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('archive')
    parser.add_argument('sha256')
    parser.add_argument('commit')
    parser.add_argument('release_root')
    args = parser.parse_args()
    try:
        print(json.dumps(stage(args.archive, args.sha256, args.commit, args.release_root)))
    except Exception:
        print('{"staged":false,"reason":"release_staging_failed"}')
        raise SystemExit(2)
