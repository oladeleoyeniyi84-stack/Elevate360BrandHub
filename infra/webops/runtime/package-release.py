#!/usr/bin/env python3
"""Build a bounded source-only release from Git objects; never checkout or deploy."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile

EXACT = {
    'server/webops/networkGuard.ts',
    'server/webops/phase3GatewayPolicy.ts',
    'server/webops/pinnedHttpsTransport.ts',
    'infra/webops-digitalocean/nftables.conf',
}
PREFIXES = ('infra/webops/runtime/', 'infra/webops/validation/')
REQUIRED = EXACT | {
    'infra/webops/runtime/Dockerfile',
    'infra/webops/runtime/build.mjs',
    'infra/webops/runtime/compose.pilot.yaml',
    'infra/webops/runtime/scheduled-runner-cli.mjs',
    'infra/webops/runtime/emergency-stop-cli.mjs',
    'infra/webops/runtime/schedule.example.json',
    'infra/webops/validation/validate-network.sh',
}

def git(repo, *args):
    return subprocess.run(['git', '--no-replace-objects', '-C', str(repo), *args], check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          timeout=30, env={'PATH': os.defpath, 'LANG': 'C'}).stdout

def selected(name):
    return name in EXACT or name.startswith(PREFIXES)

def package(repo, revision, destination):
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('full_commit_required')
    repo, destination = Path(repo), Path(destination)
    if not destination.is_absolute() or destination.resolve() != destination:
        raise ValueError('unsafe_destination')
    info = destination.stat()
    if not destination.is_dir() or info.st_uid != os.getuid() or info.st_mode & 0o777 != 0o700:
        raise ValueError('unsafe_destination')
    if git(repo, 'cat-file', '-t', revision).strip() != b'commit':
        raise ValueError('not_a_commit')
    tree = git(repo, 'ls-tree', '-r', '-z', revision, '--', *PREFIXES, *sorted(EXACT))
    records = []
    for entry in tree.split(b'\0'):
        if not entry:
            continue
        header, raw_name = entry.split(b'\t', 1)
        mode, kind, oid = header.decode('ascii').split()
        name = raw_name.decode('utf-8', errors='strict')
        if not selected(name):
            raise ValueError('unexpected_path')
        if not re.fullmatch(r'[A-Za-z0-9_./-]+', name) or any(p in ('', '.', '..') for p in name.split('/')):
            raise ValueError('unsafe_path')
        if mode not in ('100644', '100755') or kind != 'blob':
            raise ValueError('non_regular_source')
        # No environment files, generated outputs or evidence archives in a release.
        if any(p.startswith('.') or p in ('generated', '__pycache__', 'node_modules') for p in name.split('/')):
            raise ValueError('unexpected_source_entry')
        if not name.endswith(('.mjs', '.py', '.md', '.json', '.yaml', '.yml', '.sh', '.ts', '.conf', '.service', '.timer')) and not name.endswith('/Dockerfile'):
            raise ValueError('unexpected_source_type')
        size = int(git(repo, 'cat-file', '-s', oid).strip())
        if size > 1024 * 1024 or len(records) >= 200:
            raise ValueError('release_limit')
        records.append((name, mode, oid, size))
    if not REQUIRED.issubset({r[0] for r in records}) or sum(r[3] for r in records) > 8 * 1024 * 1024:
        raise ValueError('missing_files_or_release_limit')
    files, manifest = [], []
    for name, mode, oid, size in sorted(records):
        data = git(repo, 'cat-file', 'blob', oid)
        if len(data) != size:
            raise ValueError('source_size_changed')
        files.append((name, int(mode[-3:], 8), data))
        manifest.append({'path': name, 'bytes': size, 'sha256': hashlib.sha256(data).hexdigest(), 'mode': mode[-3:]})
    metadata = {'schemaVersion': 1, 'commit': revision, 'kind': 'webops-source-release',
                'deployed': False, 'imageIncluded': False, 'files': manifest}
    files.append(('RELEASE-MANIFEST.json', 0o644, (json.dumps(metadata, sort_keys=True, indent=2) + '\n').encode()))
    final = destination / ('webops-source-' + revision + '.tar')
    fd, temporary = tempfile.mkstemp(prefix='.release-', dir=destination)
    try:
        with os.fdopen(fd, 'wb') as output:
            with tarfile.open(fileobj=output, mode='w', format=tarfile.USTAR_FORMAT) as archive:
                for name, mode, data in files:
                    entry = tarfile.TarInfo(name)
                    entry.size, entry.mode, entry.mtime = len(data), mode, 0
                    entry.uid = entry.gid = 0
                    archive.addfile(entry, io.BytesIO(data))
            output.flush()
            os.fsync(output.fileno())
        digest = hashlib.sha256(Path(temporary).read_bytes()).hexdigest()
        os.link(temporary, final)  # No overwrite, including previous releases.
        os.unlink(temporary)
        directory_fd = os.open(destination, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        return {'packaged': True, 'commit': revision, 'name': final.name,
                'sha256': digest, 'files': len(manifest), 'deployed': False, 'imageIncluded': False}
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('repository')
    parser.add_argument('commit')
    parser.add_argument('destination')
    args = parser.parse_args()
    try:
        print(json.dumps(package(args.repository, args.commit, args.destination)))
    except Exception:
        print('{"packaged":false,"reason":"release_packaging_failed"}')
        raise SystemExit(2)
