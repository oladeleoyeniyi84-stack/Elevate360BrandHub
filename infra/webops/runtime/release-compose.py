#!/usr/bin/env python3
"""Render an image-pinned Compose model; never invoke Docker or deploy."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile

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
    parser.add_argument('image_id')
    parser.add_argument('output_directory')
    args = parser.parse_args()
    try: print(json.dumps(prepare(args.image_id, args.output_directory)))
    except Exception:
        print('{"prepared":false,"reason":"release_compose_failed"}')
        raise SystemExit(2)
