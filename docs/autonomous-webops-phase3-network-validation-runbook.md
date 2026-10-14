# Autonomous WebOps Phase 3 — network validation runbook

Status: validation package only. No scheduler or autonomous production execution is authorized by this document.

## Objective

Prove that the isolated Phase 3 host satisfies Issue #15 before any recurring WebOps execution is enabled.

The validation is intentionally adversarial and fail-closed. A single failed control blocks activation.

## Preconditions

Run only after the approved DigitalOcean provisioning package has created the host and firewall.

Required state:
- one approved `s-1vcpu-1gb` host;
- worker container attached only to the internal worker network;
- gateway attached to the worker network and the external egress network;
- host nftables rules loaded;
- DigitalOcean Cloud Firewall attached;
- no scheduler enabled;
- no production/session/dashboard credentials present in either container;
- Founder-approved origin registry contains only `https://www.elevate360official.com` for the first pilot;
- gateway exposes the one-shot `/app/webops-gateway-check <url>` diagnostic command;
- audit destination is available for evidence export.

## Required controls

### V1 — direct worker egress is impossible

From inside the worker container, direct public HTTPS must fail. The worker must not have an external Docker network attachment and host forwarding rules must independently prevent escape.

Pass condition: direct request attempts fail.

### V2 — private/reserved/metadata targets are unreachable

Attempts from the worker to loopback, RFC1918, link-local metadata, CGNAT, documentation/reserved, multicast and equivalent IPv6 ranges must fail independently of application policy.

Minimum explicit probes include:
- `169.254.169.254`
- `127.0.0.1`
- `10.0.0.1`
- `172.16.0.1`
- `192.168.0.1`

Pass condition: no probe establishes a connection.

### V3 — approved origin works through the gateway

The gateway must successfully perform a bounded GET to the approved production origin while preserving hostname/TLS verification and DNS/public-IP validation.

Pass condition: gateway returns a valid response from `https://www.elevate360official.com`.

### V4 — gateway independently blocks unsafe destinations

Unsafe URLs must be rejected by the gateway even when directly submitted to the gateway diagnostic interface.

Pass condition: all unsafe probes are rejected before outbound transport.

### V5 — gateway outage fails closed

Stop the gateway while the worker remains running. The worker must not fall back to direct public networking.

Pass condition: inspection request fails and no direct outbound connection is possible.

### V6 — durable evidence exists

Every allow/deny decision must be exported to the durable audit destination. Local validation logs are hashed using SHA-256 before export.

Pass condition:
- evidence set contains the run identity, timestamps, policy version, host identity and result set;
- SHA-256 manifest is stored;
- audit records survive container restart/replacement;
- records cannot be altered by the worker process.

## Execution

From the secured host checkout:

```bash
chmod +x infra/webops/validation/validate-network.sh
WEBOPS_APPROVED_URL=https://www.elevate360official.com/ \
  infra/webops/validation/validate-network.sh
```

The script aborts on the first failed safety control. It must never be modified to convert a failure into a warning for activation purposes.

## Evidence package

Preserve:
- validation `summary.txt`;
- each command/probe log;
- `SHA256SUMS`;
- matching gateway audit records;
- nftables ruleset snapshot;
- Docker network inspection for worker and gateway;
- DigitalOcean firewall rules snapshot;
- host kernel/network identity;
- exact Git commit used for validation.

Structure the final evidence record according to `infra/webops/validation/evidence-schema.json`.

## Activation decision

Phase 3 infrastructure validation is PASS only when all V1–V6 pass in the same host configuration.

A PASS does not itself enable a scheduler.

After PASS, the next separate Founder gate is approval of:
1. scheduler cadence;
2. per-run target/page/time/byte limits;
3. exact approved origin registry;
4. daily/monthly spend ceiling;
5. durable audit retention;
6. emergency kill switch and rollback procedure.

## Immediate rollback/block conditions

Do not activate if any of the following is observed:
- worker can reach the internet directly;
- metadata or private/reserved address is reachable;
- gateway fails open;
- audit evidence is mutable or missing;
- credentials appear in crawler requests/logs;
- unexpected origin is reachable;
- firewall/network policy differs from the reviewed provisioning package;
- cost controls are absent;
- scheduler exists before separate Founder authorization.
