# Host reconciliation and evidence collection

This procedure prepares deployment review. It neither deploys nor activates WebOps.
Founder release authorization is recorded in evidence-review-20261018.md; do not
request it again. Technical release checks are still required.

## One collection command

Deliver collect-host-evidence.py from the reviewed candidate to a separate file on
the Droplet through the existing authenticated operator channel. Verify its bytes
against that candidate before execution. Do not switch, reset or pull the dirty
host checkout merely to obtain this file. A Python 3 standard library is sufficient.

Set CANDIDATE to the full 40-character lowercase commit SHA selected for release
and COLLECTOR to that separately verified script path, then run on the Droplet:

```sh
python3 "$COLLECTOR" --repo /srv/elevate360-webops --candidate "$CANDIDATE"
```

Do not paste placeholder values. The command creates a unique private directory
under /var/lib/elevate360-webops/evidence, prints its location and returns 0 when
all collection operations succeed, or 2 for incomplete collection. Exit 0 means
snapshot collection succeeded, not that the configuration or release is safe.

The candidate must already be available in the local Git object database. Missing
candidate objects are recorded as failures; collection continues so host changes
are preserved. Any later authenticated fetch must be an explicit operator step,
followed by collection again. No fetch, checkout, reset, clean, stash, merge,
Docker lifecycle action, DNS change, firewall write or service restart is executed.

## What is preserved

- Current HEAD, working-tree status and a binary diff against HEAD of the four
  selected Compose/firewall paths. This includes staged and unstaged changes.
- Separate current copies of all four paths, including the untracked DNS override.
- The three expected candidate configuration files, for comparison without checkout.
- Netplan, resolved drop-in, installed nftables/sysctl files and current boot ID.
- Active DNS, the dedicated host firewall table, firewall service status and sysctls.
- Container image IDs, state, restart settings, mounts, networks, published ports,
  user, read-only flag, capability/security options and resource limits.
- Per-command exit codes and errors, a summary and SHA256SUMS covering every
  generated evidence file except the manifest itself.

Container environment variables and arbitrary untracked file contents are not
collected. Configuration and patches can still contain private information; keep
the bundle private and review it before sharing. Files are mode 0600 inside a
unique 0700 directory. Individual file copies and saved command streams are limited
to 1 MiB; truncation or unsafe/missing files makes collection incomplete.
Commands have a 20-second timeout each. Hashes prove internal consistency only.

## Reconciliation decision

Compare current snapshots and host-changes.out with the candidate files. The known
repairs are the short bridge names, worker 172.30.0.3, gateway public DNS and
persistent host DNS. Keep any additional host edit unresolved until reviewed.
Do not apply the saved patch wholesale over a newer candidate.

The collector preserves only the named configuration files. The status inventory
may reveal other local edits; preserve/review those separately before any checkout
or cleanup. The existing checkout and untracked evidence are never disposable.

For deployment, prepare a separate clean release checkout at the selected commit,
build and record the image ID, validate the effective Compose configuration, and
compare firewall requirements against the saved active rules. Do not start a
second Compose project alongside the existing named containers/networks. Review
the replacement order and preserve the prior image, configuration and host audit
directory as rollback inputs. This document does not yet implement that replacement.

## Remaining operational evidence

This snapshot is not a revised network pilot, cloud firewall snapshot or reboot
test. A single boot ID cannot prove persistence. The running host can change during
collection. Current cloud firewall rules require the provider's authenticated
read-only interface; no credentials are extracted by the collector.

Before activation, complete the revised live validation against the candidate
image, establish report/audit retention and rollback, verify persistence across a
controlled reboot, and implement/test the bounded production scheduler. Bind those
records to the selected commit, image and effective configuration. The advisory
activation checklist cannot independently authenticate these records.

No operator collection is requested until a verified script delivery and concrete
release candidate are ready. This avoids speculative terminal rounds.
