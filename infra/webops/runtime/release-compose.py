#!/usr/bin/env python3
"""Render an image-pinned Compose model; never invoke Docker or deploy."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import stat

def model(image_id):
    if not isinstance(image_id, str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', image_id):
        raise ValueError('full_image_id_required')
    def service(memory, cpus):
        return {'image': image_id, 'pull_policy': 'never', 'restart': 'no',
                'user': '1000:1000', 'read_only': True, 'cap_drop': ['ALL'],
                'security_opt': ['no-new-privileges:true'], 'mem_limit': memory,
                'cpus': cpus, 'pids_limit': 64, 'profiles': ['manual-pilot']}
    worker = service('128m', 0.25)
    worker.update(container_name='webops-worker',
                  command=['node', '-e', 'setInterval(()=>{},2147483647)'],
                  networks={'worker_internal': {'ipv4_address': '172.30.0.3'}})
    gateway = service('192m', 0.5)
    gateway.update(container_name='webops-egress-gateway', dns=['1.1.1.1', '1.0.0.1'],
                   volumes=[{'type': 'bind', 'source': '/var/lib/elevate360-webops/audit',
                             'target': '/audit', 'bind': {'create_host_path': False}}],
                   networks={'worker_internal': {'ipv4_address': '172.30.0.2'},
                             'gateway_egress': {}})
    return {'name': 'runtime', 'services': {'webops-worker': worker, 'webops-egress-gateway': gateway},
            'networks': {'worker_internal': {'internal': True, 'driver': 'bridge',
                'driver_opts': {'com.docker.network.bridge.name': 'br-webops-wkr'},
                'ipam': {'config': [{'subnet': '172.30.0.0/24'}]}},
                'gateway_egress': {'driver': 'bridge',
                    'driver_opts': {'com.docker.network.bridge.name': 'br-webops-out'}}}}

def verify(image_id, filename, expected_sha256):
    expected = (json.dumps(model(image_id), sort_keys=True, indent=2) + '\n').encode()
    if not isinstance(expected_sha256, str) or not re.fullmatch(r'[0-9a-f]{64}', expected_sha256):
        raise ValueError('invalid_digest')
    file = Path(filename)
    if not file.is_absolute() or file.resolve() != file:
        raise ValueError('unsafe_compose_path')
    fd = os.open(file, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        before = os.fstat(fd)
        if (not stat.S_ISREG(before.st_mode) or before.st_uid != os.getuid() or
            before.st_mode & 0o7777 != 0o600 or before.st_nlink != 1 or before.st_size > 16384):
            raise ValueError('unsafe_compose_file')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            data = stream.read(16385)
        after = os.fstat(fd)
        identity = lambda info: (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
        if identity(before) != identity(after) or identity(after) != identity(file.lstat()):
            raise ValueError('compose_changed_during_read')
        digest = hashlib.sha256(data).hexdigest()
        if len(data) > 16384 or digest != expected_sha256 or data != expected:
            raise ValueError('compose_digest_or_model_mismatch')
        return {'configurationVerified': True, 'path': str(file), 'sha256': digest,
                'imageId': image_id, 'imageVerified': False, 'deployed': False}
    finally:
        os.close(fd)

def prepare(image_id, output_directory):
    data = (json.dumps(model(image_id), sort_keys=True, indent=2) + '\n').encode()
    root = Path(output_directory)
    if not root.is_absolute() or root.resolve() != root:
        raise ValueError('unsafe_output_directory')
    info = root.stat()
    if not root.is_dir() or info.st_uid != os.getuid() or info.st_mode & 0o7777 != 0o700:
        raise ValueError('unsafe_output_directory')
    digest = hashlib.sha256(data).hexdigest()
    final = root / ('compose-' + image_id[7:] + '.json')
    fd, name = tempfile.mkstemp(prefix='.compose-pending-', dir=root)
    temporary = Path(name)
    try:
        with os.fdopen(fd, 'wb') as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, final)
        temporary.unlink()
        directory_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
        try: os.fsync(directory_fd)
        finally: os.close(directory_fd)
        return {'prepared': True, 'path': str(final), 'sha256': digest,
                'imageId': image_id, 'imageVerified': False, 'deployed': False}
    finally:
        if temporary.exists(): temporary.unlink()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('image_id')
    parser.add_argument('path')
    parser.add_argument('expected_sha256', nargs='?')
    args = parser.parse_args()
    try:
        if args.verify_only:
            result = verify(args.image_id, args.path, args.expected_sha256)
        else:
            if args.expected_sha256 is not None: raise ValueError('unexpected_digest')
            result = prepare(args.image_id, args.path)
        print(json.dumps(result))
    except Exception:
        print('{"prepared":false,"reason":"release_compose_failed"}')
        raise SystemExit(2)
