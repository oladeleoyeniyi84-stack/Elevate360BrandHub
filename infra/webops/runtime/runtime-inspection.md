# Read-only installed worker/network inspection

Use a trusted host release with Node 24 and an independently prepared, private,
complete disabled schedule. This command is for the operator's release procedure;
it is not installed or invoked automatically by these source changes.

```sh
node /absolute/reviewed/inspect-runtime-cli.mjs /absolute/private-schedule.json
```

The CLI validates the full future schedule shape but requires enabled=false. It
uses the same worker and internal-network inspections as the actual host runner,
with the fixed local Docker socket and bounded adapter. Only Docker inspect and
network inspect are issued. It does not exec a container, request the website,
read/write cadence or report state, create a failure lock, start containers or
change service configuration. Existing failure locks remain untouched.

The expected immutable IDs must come from independent release records. Successful
exit 0 returns workerVerified=true and networkVerified=true with those IDs and
scope=worker_and_internal_network. The worker must be running, unpaused, use the
expected image and internal network/address, and satisfy the existing user,
filesystem, mount, privilege, capability, port, restart and resource restrictions.
The network must match the expected bridge, internal/IPv6 settings and IPAM.
Missing/stopped containers, policy drift, failed or malformed inspection, unsafe
configuration files and invalid scope produce sanitized exit 2. No raw Docker
output or configuration is logged.

Success does not verify the gateway, other attached containers, host/cloud firewall,
DNS, image source provenance, systemd operation, state-directory safety/capacity,
retention, alerts or reboot behavior. Explicit receipt fields report
gatewayVerified=false, firewallVerified=false and requestExecuted=false. This is
a point-in-time check under trusted Docker administration, not activation authority
or continuous enforcement. The scheduler's normal pre/post checks remain in place.

Use this after controlled deployment or rollback and before preparing installation
evidence. A stopped post-reboot runtime fails; the command does not restart it.
Do not clear an existing execution lock merely because identity inspection passes.
Record this receipt alongside the remaining independent live evidence required in
release-operations.md. No authenticated host execution or live result is claimed by
local tests; they use injected Docker responses and temporary directories.
