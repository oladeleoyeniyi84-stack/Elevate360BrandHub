# Manual Phase 3 runtime

Draft manual pilot only. No scheduler, remediation, production writes, or production credentials.
Only `https://www.elevate360official.com` is accepted. Query strings and fragments are rejected.
The gateway reuses the reviewed exact-origin, public DNS, and pinned HTTPS transport modules.
Each redirect is revalidated. Requests have a ten-second deadline, three-redirect limit,
one-MiB body limit, and one concurrent request. Only response metadata is returned.
Audit writes are appended and fsynced on the host bind mount; the worker has no audit mount.
This protects audit records from the worker, not a compromised gateway or host administrator.

## Local checks

With Node 24:

```sh
node infra/webops/runtime/build.mjs
node --test infra/webops/runtime/gateway.test.mjs
```

## Host preparation

Keep the active SSH and Recovery Console open. This runtime expects the corrected
`br-webops-wkr` and `br-webops-out` bridge names in the installed nftables policy.
Do not start the placeholder provisioning Compose services.

```sh
install -d -m 0700 -o 1000 -g 1000 /var/lib/elevate360-webops/audit
docker compose -f infra/webops/runtime/compose.pilot.yaml --profile manual-pilot config -q
docker compose -f infra/webops/runtime/compose.pilot.yaml --profile manual-pilot build webops-worker
```

The image build requires Docker registry and Alpine package access. Tags are not immutable;
record the resolved image ID and digest in the live evidence. No image build or Docker
network test was performed in the preparation environment, which has no Docker executable.

## Manual validation only

Start only for the supervised validation run:

```sh
docker compose -f infra/webops/runtime/compose.pilot.yaml --profile manual-pilot up -d
docker exec webops-worker /app/webops-gateway-check https://www.elevate360official.com/
WEBOPS_GATEWAY_AUDIT_EXPORT=/var/lib/elevate360-webops/audit/gateway.jsonl bash infra/webops/validation/validate-network.sh
```

The validation script now tests the worker's explicit gateway path during outage,
checks the audit prefix and worker mount isolation, and hashes the completed summary
with portable relative filenames. Shell syntax was checked; these script revisions
have not yet been executed on the Droplet. See evidence-review-20261018.md for the
review of the earlier live run and outstanding activation requirements.

Stop after validation; restart policies remain disabled:

```sh
docker compose -f infra/webops/runtime/compose.pilot.yaml --profile manual-pilot down
```

Do not delete host audit evidence. Founder release authorization was recorded on
2026-10-23 in evidence-review-20261018.md. Execution still depends on completing
the release implementation and operational validation.

## Manual route monitor (new image required)

After rebuilding and validating the updated image, an operator can explicitly run:
```sh
docker exec webops-worker node /app/monitor-cli.mjs / /work
```
This does not start a schedule or repair anything. It returns sanitized JSON and
exits 0 only if all explicit paths pass, 1 for an unhealthy/incomplete run, and 2
for invalid configuration. No arguments is an error; no default crawl starts.

The monitor allows at most 14 sequential checks, 30 seconds elapsed, and 2 MiB
of accepted successful response bodies. Each gateway request is capped at 1 MiB
or the remaining run budget, whichever is smaller. Invalid budgets are rejected
before outbound transport. Overflow cancels body consumption, denies the request,
and stops the run. Denied-body bytes are not included in the successful-byte
total; a denied request always stops further checks. These are application body
limits, not exact network billing/wire-byte limits: headers, TLS, socket buffering,
redirect traffic, and an overflow chunk can consume additional traffic.
Disconnecting the internal client aborts the gateway transport signal. DNS,
transport, redirect cleanup and body-read waits also race cancellation, so an
asynchronous adapter that ignores the signal cannot hold the request slot forever.
Completed waits remove their abort listeners; late transport responses are cancelled.
Body cleanup is best-effort and does not block request completion. This bounds
asynchronous waits, not synchronous event-loop blocking or an uncooperative adapter's
underlying resources; the pinned HTTPS transport remains responsible for socket cleanup.

The new client is fixed to the internal gateway endpoint, refuses redirects,
bounds gateway JSON replies to 4096 bytes, and strips arbitrary denial text.
The worker stays idle until explicitly invoked. New files are copied into the
image, but no rebuilt image or live deployment is claimed here.

Hermetic validation (Node 24):
```sh
node infra/webops/runtime/build.mjs
node --test infra/webops/runtime/gateway.test.mjs infra/webops/runtime/gateway-client.test.mjs infra/webops/runtime/monitor.test.mjs infra/webops/runtime/monitor-integration.test.mjs
```


## Diagnostic report and remediation proposals

The manual monitor now emits a versioned diagnostic envelope. Each run receives a
UUID and UTC generation time, and contains only bounded observations, outcome
metadata, immutable safety controls, and deduplicated proposal records.

Proposals are labels for operator review, not executable instructions. Every proposal
sets `productionApprovalRequired: true`, `automaticRemediationAllowed: false`, and
`execution: "not_executed"`. The report builder rejects monitor results that claim
production writes, direct networking, or remediation execution, and it does not copy
arbitrary gateway fields or exception text.

Report validation also enforces the sequential monitor contract: unique canonical
paths, exact byte totals, no observations after a failure, matching stop reasons,
and consistent healthy/complete flags. A healthy empty run is rejected. Run IDs
must have the UUID v4 format emitted by the CLI. These checks detect malformed
results; they do not authenticate evidence or prove a live observation occurred.

Reports are written to standard output only. An operator may redirect that output
into the evidence folder during an approved supervised run. The worker still has no
host mount, so this change does not establish durable or immutable report retention.


## Activation gate

`activation-gate.mjs` is a pure preflight evaluator; it has no activation,
deployment, scheduler, network, process or file-writing capability. The checked-in
`activation-candidate.json` is deliberately blocked with no controls, evidence or
approvals populated.

The checklist requires references claiming passed evidence for source reconciliation, the candidate image, revised live
validation, the cloud firewall, host reboot persistence, audit retention and
rollback. Separate recorded approvals are required for merge to `main`, production
deployment and the read-only schedule.

The accepted operating envelope is limited to the single approved origin, read-only
monitoring, at least a 60-minute cadence, 14 routes, 2 MiB accepted body data and
30 seconds per run. Production writes, automatic remediation, production
credentials, additional paid resources and additional monthly spend are forbidden.
The kill switch must disable the schedule and stop the runtime.

The evaluator validates reference syntax only. A complete checklist returns
`checklistComplete: true`, while `authorizationVerified`, `evidenceVerified`, and
`readyForManualActivation` always remain false. The blocker
`independent_release_verification_required` cannot be cleared by adding fields to
this JSON. This is an advisory checklist, not an authentication or release service.

The release operator must verify approval provenance and scope, current evidence
and its binding to the candidate commit/image/configuration, and rollback readiness
through trusted sources before execution. Recorded Founder authorization remains
valid; this correction does not request it again. A future execution integration
must enforce those checks independently instead of using checklist completeness
as an activation signal.

## Host reconciliation snapshot

See [host-reconciliation.md](host-reconciliation.md) for the single-command,
read-only collector and review procedure. It preserves selected local configuration
changes, captures candidate comparisons and host/container state, and hashes a
private evidence bundle. It never changes the checkout or running services.
Collection success does not establish deployment readiness. Python 3 standard-library
tests run in CI; the collector has not yet been executed on the Droplet.

## Bounded host report store (not yet connected)

report-store.mjs exports storeDiagnosticReport(monitor, metadata, {directory,
maxReports}). It rebuilds the sanitized diagnostic envelope through report.mjs
before any storage. It has no network, scheduler, Docker or remediation operations.

The caller must supply an existing absolute directory owned by the current Unix
user with mode 0700, in a trusted operator-controlled path without symlink
components. Use a dedicated report directory, never the gateway audit or historical
evidence directory. Existing foreign files, symlink entries and unsafe permissions
block storage. The directory and its ancestors must not be replaced by another
process while writing; this does not defend against the trusted owner or root.

The default and maximum capacity is 720 reports, each at most 64 KiB (45 MiB of
report payload, excluding filesystem metadata and a temporary write). At an hourly
cadence that is 30 days of slots, not a time-based expiry guarantee. The caller can
lower capacity. Full storage throws report_store_full; nothing is automatically
deleted. A future runner must stop scheduling and surface storage failures rather
than silently discard monitoring results.

An exclusive directory lock serializes cooperating writers. A private temporary
file is fsynced, published by a hard link that cannot overwrite an existing run ID,
and the directory is fsynced before successful return. The receipt contains filename,
byte length, SHA-256 and remaining capacity. Hashes are not signatures and local
files are not immutable. The worker still has no host mount; neither its CLI nor
Docker image imports this module. The stdin ingestion adapter below connects validated output to this store;
automated host execution and schedule integration remain unfinished.

Crash recovery requires the operator to stop writers, inspect any lock/pending
file and final report, and preserve/export evidence before clearing leftovers.
Do not automatically remove a lock based only on age. A failure after publication
can leave a complete report; reconcile the run ID and bytes before retrying.
Archive/export verification and an external retention destination are still needed
before any removal policy or unattended production schedule is enabled.

## Host-side report ingestion

report-ingest-cli.mjs accepts one absolute report-directory argument and reads
exactly one worker report from standard input. Input is limited to 64 KiB and
must finish within 45 seconds. It rejects malformed UTF-8, incomplete delivery,
multiple JSON documents and any envelope differing from the canonical report
builder output, including changed origin, proposals, controls or extra fields.
This validates structure and consistency, not the authenticity of the producer.

Exit status is 0 for a stored healthy report, 1 for a stored unhealthy report, and
2 for input/configuration/storage failure. Successful storage prints only the
receipt; failures print a fixed sanitized error. A receipt is never emitted before
the storage function completes. Duplicate run IDs cannot replace earlier evidence.

After verified deployment, on a host with Node 24 and a prepared private directory,
the manual handoff has this shape (not an activation command):
```sh
set -o pipefail
docker exec webops-worker node /app/monitor-cli.mjs / /work |
  node infra/webops/runtime/report-ingest-cli.mjs /var/lib/elevate360-webops/reports
```
The worker receives no host mount. No host Node installation, directory setup or
live execution has been performed here. Keep stderr separate from the report pipe.
A future host runner must preserve both producer and receiver exit statuses: a
single pipeline status cannot fully diagnose which component failed. It must
verify the producer container/image and expected route scope, prevent overlapping
runs, stop on storage failure, enforce cadence and provide operator-visible errors.
This adapter neither invokes Docker nor enables any scheduler.
