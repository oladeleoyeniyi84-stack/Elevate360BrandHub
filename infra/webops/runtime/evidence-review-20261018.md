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

## Development checkpoint — 2026-10-20 UTC
Completed the previous checkpoint's manual integration in the draft source:
- gateway checkTarget accepts validated maxBytes and caller cancellation;
- HTTP endpoint validates the optional budget (including duplicate/unknown fields),
  forwards it, and aborts transport when the internal response connection closes;
- gateway-client.mjs contacts only the fixed internal endpoint, forwards the remaining
  budget, caps each request at 1 MiB, bounds JSON replies to 4096 bytes, refuses
  redirects and strips arbitrary denial metadata;
- monitor-cli.mjs invokes explicit operator-supplied paths and outputs sanitized
  diagnose-only JSON; Dockerfile now includes the monitor and client modules.
The Compose worker still idles; no monitoring schedule or repairs were enabled.

Validation: Node v24.19.0; build.mjs succeeded; all 23 tests passed, none failed or
skipped. Includes the previous eight monitor tests, eleven gateway tests, three
client tests, and one local HTTP integration test proving remaining-budget
propagation and denial before a third route. Tests used injected transport and
loopback HTTP only, with no requests to production. No-argument CLI smoke check
returned sanitized configuration error and exit 2 as expected.

Byte accounting clarification: this enforces accepted successful body-byte budgets,
not a strict wire-traffic/spend cap. Headers/TLS, buffering, redirects and the chunk
that triggers overflow may add traffic. An overflow is denied and stops the run;
failed-body bytes are not added to the successful-byte total. Do not describe this
as an exact network byte ceiling.

No Docker image build or host deployment was performed this run. The earlier
uploaded live evidence certifies the earlier image only. Remaining: integration
into CI, cancellation/disconnect regression coverage, persistent report/audit
delivery and controlled remediation proposals, immutable retention design, one
safe host reconciliation/validation procedure, firewall snapshot, reboot check,
schema-complete final evidence and Founder activation settings. Production
merge/deploy and scheduler gates are unchanged. No user terminal action needed
until the consolidated host procedure is ready.


## Development checkpoint — 2026-10-21 UTC
Closed the manual-runtime CI coverage gap. Draft PR #22 targets
`webops/phase-3-network-validation`, but the WebOps pull-request workflow did not
listen to that base branch and did not include `infra/webops/runtime/**` in its
path filter. The workflow now covers both, asserts the corrected 15-character
`br-webops-wkr` bridge name, and adds a separate Phase 3 manual-runtime job.

That job uses Node 24 to regenerate the vendored runtime modules, runs every
`infra/webops/runtime/*.test.mjs` test, validates the manual Compose model, and
builds the pilot image. It does not start containers, contact the approved public
origin, deploy, use production credentials, schedule monitoring, or enable
remediation. Repository workflow permissions remain `contents: read`.

Validation: the full 23-test runtime suite passed again locally (0 failed), and
GitHub Actions WebOps validation run 48 completed successfully for commit
`7d247a2622c258e0b31ba80cc9f2b21b9b933402`. This provides an independent
container-build and Compose-validation result that was previously missing from
the preparation environment.

Remaining work is unchanged in authority: repository-side monitoring/reporting,
proposal-only remediation and activation controls can continue in draft code.
Host reconciliation, revised live validation, firewall capture, reboot
persistence and final evidence still require a later consolidated operator step.
No production deployment, merge, scheduler, database/file write, or automatic
remediation was activated.


## Development checkpoint — 2026-10-22 UTC
Added a versioned proposal-only diagnostic report contract to the manual runtime.
The monitor CLI now wraps its bounded observations in a schema-versioned envelope
with a UUID, UTC timestamp, outcome, safety controls and deduplicated proposals.

The report builder fails closed unless the monitor asserts read-only operation,
no direct network access, no production writes and no remediation execution. It
accepts only the monitor's fixed finding vocabulary, copies only allowlisted fields,
and rejects invalid metadata or unsafe claims. Each proposal is non-executable and
hard-codes `productionApprovalRequired: true`,
`automaticRemediationAllowed: false` and `execution: not_executed`.
No patch, command, scheduler, database operation or repair interface was added.

Validation: Node v24; build generation succeeded; all 28 hermetic runtime tests
passed, 0 failed or skipped. Five report tests cover healthy output, proposal
deduplication, unsafe-claim and arbitrary-field rejection, field sanitization and
run-level limit proposals. The no-argument CLI still returns the fixed sanitized
configuration error with exit 2. GitHub Actions will independently rebuild the
image, validate Compose and rerun the complete repository gate for this checkpoint.

Output remains standard output only. An operator can capture it during a later
supervised validation, but the worker has no host mount and this change does not
claim durable or immutable external retention. Host reconciliation, revised live
validation, cloud firewall evidence, reboot persistence, retention design and
activation settings remain outstanding. Existing merge, deployment, scheduling,
write and remediation approval gates are unchanged.


## Development checkpoint — 2026-10-23 UTC
Added a fail-closed, machine-verifiable activation preflight. It is a pure evaluator
with no I/O or ability to deploy, schedule, start processes, write production data
or execute remediation. The checked-in activation candidate is deliberately blocked:
controls are unset and all evidence and approval records are empty.

Readiness requires referenced passed evidence for source reconciliation, the exact
candidate image, revised live validation, the cloud firewall, host reboot
persistence, audit retention and rollback. It separately requires recorded Founder
approvals for merge to main, production deployment and a read-only schedule. The
daily development authorization is explicitly tested as insufficient for production
deployment/scheduling approval.

Safe controls are bounded to the single approved origin, read-only monitoring,
60 minutes to 7 days between runs, at most 14 routes, 2 MiB accepted body data and
30 seconds per run. Production writes, automatic remediation, production
credentials, additional paid resources and additional monthly spend must remain
disabled. The kill switch must disable the schedule and stop the runtime. Even a
complete manifest only returns readiness for manual activation; it performs nothing.

Validation: Node v24; generated runtime build succeeded; all 35 hermetic tests
passed, 0 failed or skipped. Seven activation tests cover complete-but-nonexecuting
readiness, missing evidence/approvals, separation of development authority, unsafe
control expansion, malformed records, invalid manifests and the blocked checked-in
candidate. GitHub Actions will independently rerun the full repository, Compose and
image-build gates.

This closes the repository-side activation-preflight gap, not the operational
evidence gaps. The candidate must remain blocked until the host is reconciled and
the required live, firewall, reboot, retention and rollback evidence exists, followed
by each separate Founder approval. No production state was changed.

## Founder authorization — 2026-10-23 (America/New_York)

Oladele Oyeniyi explicitly stated in the active conversation:
“Full Approval and authorization for merge, deployment , scheduling and activation”.

This clears the human authorization requirement for the discussed WebOps release:
merge, deployment, scheduling and activation of the bounded read-only monitoring
scope. It does not constitute evidence that the implementation is complete or that
the live operational checks passed. No additional paid resources, credential
rotation, scope expansion, or automatic production remediation is inferred.

Execution remains pending technical readiness: reconcile the host with the exact
candidate, rerun revised live validation, obtain current firewall and reboot
persistence evidence, establish retention and rollback, and implement/review the
actual production scheduler. The present runtime is manual-only; a preflight
evaluator is not a scheduler or an authenticated approval service.

The activation JSON remains a blocked draft, not a trustworthy authorization store.
Its current reference-string checks do not authenticate approval provenance or bind
approval/evidence to a release digest; the previous test about development authority
only demonstrated a missing deployment record, not semantic verification of approval.
That limitation must be fixed before treating this evaluator as a release control.
This authorization record preserves the user's decision without inventing passed
evidence or claiming any merge, deployment or activation occurred.

## Development correction — 2026-10-23 (America/New_York)

Corrected the activation evaluator's false readiness signal. Previously arbitrary
well-formed reference strings could produce readyForManualActivation=true.
The earlier development-authority test removed the deployment record and therefore
did not test authentication. It has been replaced with a regression keeping all
records present and substituting a development-only reference.

The evaluator now reports checklistComplete separately and always returns
authorizationVerified=false, evidenceVerified=false, readyForManualActivation=false,
and independent_release_verification_required. Caller-supplied verified/readiness
flags cannot bypass this result. It remains a pure advisory checklist. This closes
the false-positive readiness bug; it does not implement approval authentication,
evidence authenticity, revocation, or binding to a deployed release.

Validation: eight focused activation tests passed, zero failed. The branch workflow
will run the full application/runtime suite and image build after this checkpoint.
Founder authorization recorded above remains in effect and need not be requested
again. Operational evidence and executable scheduler/retention work remain pending;
no host deployment, merge or activation was performed.

Next work: implement the consolidated host reconciliation/evidence procedure,
preserving existing local changes, and inspect remaining runtime cancellation and
report consistency gaps. Execution integration must independently verify the
candidate commit, image and configuration against trusted evidence and the recorded
Founder authorization before starting the production schedule.
