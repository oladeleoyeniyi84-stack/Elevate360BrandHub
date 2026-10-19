# Phase 3 evidence review — 2026-10-18

Status: manual network pilot reviewed; full WebOps build and activation remain incomplete.

## Evidence integrity
Archive: webops-evidence-20261018T222000Z.tar.gz, 8912 bytes.
SHA-256: 7364311a1137f80877a188853e7bbc619dd7b50e510b3c6f2444772fde227d00.
All 38 manifest entries independently verified against archive bytes. This proves
consistency with the manifest, not independent authenticity or tamper-proof storage.
Recorded checkout: 957b76ccfd019ece33de8fefa8d9535d6aff5f59 plus host-changes.patch
and compose.dns.yaml. The review does not certify later branch revisions as live-tested.

## Supported observations
- Worker direct public probe and nine private/reserved/metadata probes failed.
  Failed probes alone do not prove universal reachability prevention; the captured
  network topology and firewall provide supporting policy evidence.
- Approved origin returned HTTP 200, 14662 bytes through the gateway. A supplemental
  worker-originated request also succeeded after gateway recovery.
- Five unsafe gateway targets returned target_rejected, matching denial audit entries.
- Outage direct-access probe failed DNS. The explicit worker gateway request produced
  gateway_unavailable in the operator's screenshot; that particular response is not
  saved as a standalone file in this archive.
- After-restart audit is an exact byte prefix extension of the before file.
  New records are startup events. Persistence through restart is demonstrated;
  container replacement and host reboot were not demonstrated.
- Worker has no mounts and only runtime_worker_internal. Gateway has internal and
  egress networks and a writable host audit mount. Neither publishes host ports.
- Both containers are read-only, drop ALL capabilities, use no-new-privileges,
  have memory/CPU/PID limits, and restart policy no.
- Host DNS files and observed resolver state use 1.1.1.1 and 1.0.0.1.
- Image identity: sha256:0dfd2c16ef72bfecc61b9f5b6dd19f4fb3bd3e92c0544cb99e160f6494507a56.

## Corrections saved to the draft branch
Worker static address .3 avoids the gateway .2 conflict; gateway public DNS avoids
the blocked private resolver; bridge names fit Linux's 15-character limit.
Validation now probes the explicit worker request during gateway outage, checks
audit prefix and mount isolation, and hashes final contents using relative paths.
Shell syntax checked only; revised validation has not been live-run.

## Remaining work and limits
- Reconcile host changes with this draft without discarding local files; revised
  source and deployed evidence currently differ.
- Capture current cloud firewall policy and complete a schema-conforming final
  evidence record after the outstanding controls are resolved.
- Verify reboot persistence in a controlled maintenance step. A reboot-required
  banner was observed; no reboot completion is claimed.
- Audit storage survives container restart but is writable by gateway/host admin;
  immutable external retention and retention policy are not established.
- Worker is an idle manual diagnostic container, not a complete autonomous
  monitoring/remediation engine. No scheduled monitoring or automatic repair is
  implemented by this runtime.
- Final cadence, run/page/time/byte quotas, spend ceilings, approved registry,
  retention, kill switch and rollback require a concrete Founder activation decision.
- No production merge, production database writes, or scheduler activation performed.

## Why recovery took many commands
Initial key permissions blocked SSH. The host lacked the runtime and packages.
Bridge length, IP allocation, and DNS defects required repairs. Validation needed
supplemental checks and checksum repair. The operator workflow was unnecessarily
fragmented, including an assistant DNS edit correction. Future host work should be
batched into a reviewed, error-checked procedure and limited to essential deployment
and evidence collection. Repository fixes should be handled directly.

## Development checkpoint — 2026-10-19 UTC
Added monitor.mjs and monitor.test.mjs. This is an unconnected manual orchestration
module, not a deployed worker or scheduler. It accepts explicit paths on the single
approved origin, validates the entire input before any gateway request, runs
sequentially, and caps requests at 14, elapsed time at 30 seconds, and requested
aggregate response bytes at 2 MiB. Caller may lower those ceilings. It reports
diagnostic findings without raw exception/denial text and stops on failure.
It has no networking imports, repair hooks, persistence, scheduler, or credential use.

Validation: Node v24.19.0, node --test monitor.test.mjs: 8 passed, 0 failed.
Cases cover sequential calls/read-only flags, invalid paths, request budget,
byte overrun, gateway exception, non-settling deadline, pre-cancellation, and
malformed/denied results. No live requests or host operations performed.

Important integration contract: gateway(target, {signal,maxBytes}) must enforce
the remaining byte budget during transport and respect cancellation. The monitor
also detects a gateway overrun after return, which alone cannot enforce a hard
network-byte ceiling. The existing live gateway endpoint does not yet implement
this per-run remaining-byte contract. Do not wire the new module into Compose
until that contract is implemented and tested.

Next work: integrate a bounded gateway client and enforce its response budget
server-side; connect an explicit manual worker command with sanitized JSON output;
extend the image build and hermetic integration tests. Then reconcile deployment
and collect revised host evidence in one reviewed operator procedure. Existing
production, paid-resource and activation gates remain unchanged.
