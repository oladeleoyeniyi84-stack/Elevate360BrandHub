#!/usr/bin/env python3
"""Collect a private, read-only host snapshot; never deploy or declare readiness."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile
from datetime import datetime, timezone

CONFIGS = (
    'infra/webops-digitalocean/compose.yaml',
    'infra/webops-digitalocean/nftables.conf',
    'infra/webops/runtime/compose.pilot.yaml',
    'infra/webops/runtime/compose.dns.yaml',
)
HOST_FILES = (
    '/etc/netplan/50-cloud-init.yaml',
    '/etc/systemd/resolved.conf.d/DigitalOcean.conf',
    '/etc/nftables.d/webops.nft',
    '/etc/sysctl.d/99-webops.conf',
    '/proc/sys/kernel/random/boot_id',
)
MAX_FILE = 1024 * 1024


def run_command(argv, cwd):
    try:
        result = subprocess.run(argv, cwd=cwd, capture_output=True, timeout=20,
                                env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0',
                                     'GIT_PAGER': 'cat', 'LC_ALL': 'C'})
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return 124, b'', b'command_timeout'
    except OSError:
        return 127, b'', b'command_unavailable'


def collect(repo, output_parent, candidate, runner=run_command, host_root=Path('/')):
    if not re.fullmatch(r'[0-9a-f]{40}', candidate):
        raise ValueError('candidate must be a full lowercase commit SHA')
    repo = Path(repo).resolve(strict=True)
    output_parent = Path(output_parent).resolve()
    # Keep evidence outside the checkout so collection does not dirty the source.
    if output_parent == repo or repo in output_parent.parents:
        raise ValueError('output must be outside the checkout')
    output_parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix='host-reconciliation-', dir=output_parent))
    records = []

    def write(name, data):
        path = output / name
        with path.open('xb') as stream:
            os.chmod(path, 0o600)
            stream.write(data)

    def capture(name, argv):
        code, stdout, stderr = runner(argv, repo)
        oversized = len(stdout) > MAX_FILE or len(stderr) > MAX_FILE
        write(name + '.out', stdout[:MAX_FILE])
        write(name + '.err', stderr[:MAX_FILE])
        records.append({'name': name, 'argv': argv, 'exitCode': code,
                        'truncated': oversized, 'captured': code == 0 and not oversized})

    capture('git-head', ['git', 'rev-parse', 'HEAD'])
    capture('git-status', ['git', 'status', '--porcelain=v1', '--untracked-files=all'])
    capture('host-changes', ['git', 'diff', '--no-ext-diff', '--no-textconv', '--binary', 'HEAD', '--', *CONFIGS])
    capture('candidate-commit', ['git', 'cat-file', '-e', candidate + '^{commit}'])
    # Optional DNS override need not exist in the candidate; local copy is preserved below.
    for index, config in enumerate(CONFIGS[:3]):
        capture(f'candidate-config-{index}', ['git', 'show', candidate + ':' + config])
    for index, source in enumerate([repo / p for p in CONFIGS] +
                                   [host_root / p.lstrip('/') for p in HOST_FILES]):
        name = f'file-{index:02d}'
        try:
            # Refuse symlinks and special files rather than following unexpected content.
            fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
            with os.fdopen(fd, 'rb') as stream:
                if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                    raise ValueError('not_regular')
                data = stream.read(MAX_FILE + 1)
            if len(data) > MAX_FILE:
                raise ValueError('file_too_large')
            write(name, data)
            records.append({'name': name, 'source': str(source), 'captured': True})
        except (OSError, ValueError):
            records.append({'name': name, 'source': str(source), 'captured': False,
                            'reason': 'missing_unreadable_unsafe_or_oversized'})
    capture('dns', ['resolvectl', 'dns'])
    capture('firewall', ['nft', 'list', 'table', 'inet', 'webops_filter'])
    capture('firewall-enabled', ['systemctl', 'is-enabled', 'webops-nftables.service'])
    capture('firewall-active', ['systemctl', 'is-active', 'webops-nftables.service'])
    capture('sysctl', ['sysctl', 'net.ipv4.ip_forward', 'net.ipv4.conf.all.accept_redirects',
                       'net.ipv4.conf.default.accept_redirects', 'net.ipv4.conf.all.send_redirects',
                       'net.ipv4.conf.default.send_redirects'])
    # Explicit projection avoids container environment variables and credentials.
    projection = ('{"name":{{json .Name}},"image":{{json .Image}},'
                  '"state":{{json .State.Status}},"restart":{{json .HostConfig.RestartPolicy}},'
                  '"mounts":{{json .Mounts}},"networks":{{json .NetworkSettings.Networks}},'
                  '"ports":{{json .HostConfig.PortBindings}},"user":{{json .Config.User}},'
                  '"readOnly":{{json .HostConfig.ReadonlyRootfs}},'
                  '"memory":{{json .HostConfig.Memory}},"nanoCpus":{{json .HostConfig.NanoCpus}},'
                  '"pidsLimit":{{json .HostConfig.PidsLimit}},'
                  '"capDrop":{{json .HostConfig.CapDrop}},'
                  '"securityOpt":{{json .HostConfig.SecurityOpt}}}')
    capture('containers', ['docker', 'inspect', 'webops-worker', 'webops-egress-gateway',
                           '--format', projection])
    summary = {'schemaVersion': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(),
               'candidateCommit': candidate, 'records': records,
               'collectionComplete': all(r['captured'] for r in records),
               'readyForDeployment': False, 'productionChanged': False,
               'limitations': ['Snapshot only; not live validation or reboot proof.',
                               'Cloud firewall, approval provenance and retention not verified.',
                               'Files may contain private configuration; review before sharing.',
                               'A running host may change during collection.']}
    write('summary.json', (json.dumps(summary, indent=2) + '\n').encode())
    manifest = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n'
                       for p in sorted(output.iterdir()))
    write('SHA256SUMS', manifest.encode())
    return output, summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', default='/srv/elevate360-webops')
    parser.add_argument('--output-parent', default='/var/lib/elevate360-webops/evidence')
    parser.add_argument('--candidate', required=True)
    args = parser.parse_args()
    output, summary = collect(args.repo, args.output_parent, args.candidate)
    print(json.dumps({'evidenceDirectory': str(output),
                      'collectionComplete': summary['collectionComplete'],
                      'readyForDeployment': False}))
    raise SystemExit(0 if summary['collectionComplete'] else 2)
