# Read-only gateway release inspection

Run from a trusted Node 24 host release using independently recorded immutable
gateway, image, internal-network and egress-network IDs:

```sh
node /absolute/reviewed/inspect-gateway.mjs GATEWAY_FULL_ID sha256:IMAGE_FULL_DIGEST INTERNAL_NETWORK_FULL_ID EGRESS_NETWORK_FULL_ID
```

The module issues only one bounded Docker inspect against the fixed local socket.
It checks selected gateway fields against release-compose.py: exact identity/name,
running and unpaused, user and command, read-only root filesystem, privileges,
capabilities, no-new-privileges, port bindings, restart policy, resource ceilings,
explicit DNS, the single writable audit bind mount and the two expected network
attachments with internal address 172.30.0.2. It does not fetch container environment
variables. Output contains IDs and verification booleans, not raw Docker output.

Exit 0 means gatewayConfigurationVerified=true for these selected fields at the
instant observed. Exit 2 is a sanitized failure. No exec, website request, state
write, lifecycle action, service activation or retry is performed. This check is
separate from scheduled monitoring, so it adds no time to a scheduled tick.

This does not authenticate image provenance or validate every Docker setting. It
does not inspect either network's policy or other members, host/cloud firewall,
DNS reachability, audit-directory ownership/capacity, actual durable audit writes,
gateway behavior, reboot recovery or alert delivery. Receipts explicitly report
networkPolicyVerified=false, firewallVerified=false and auditPersistenceVerified=false.
Use alongside the worker/internal-network check in runtime-inspection.md and the
remaining live evidence in release-operations.md. Passing configuration inspection
alone cannot authorize activation or removal of existing execution locks.

No live host result is claimed. Tests use injected Docker observations; actual
Docker projection compatibility and release configuration must be checked on the
target host before treating a receipt as release evidence.
