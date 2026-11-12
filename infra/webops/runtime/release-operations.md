# WebOps installation, replacement and rollback

Status: reviewed source procedure, not a completed host deployment. This sequence
joins the existing preparation tools; it is not an unattended installer. Record
each stage's evidence and stop on a failed prerequisite. Founder authorization is
recorded in evidence-review-20261018.md; technical readiness still requires actual
host results. Render services and Engineering Vault release controls are outside
this procedure. No new paid resource, credential rotation or automatic repair.

## 1. Establish a recoverable baseline

Use an authenticated operator channel to the existing Droplet. Never put a private
key in a repository or report. Record host identity, selected full source commit,
successful CI run, Docker/Compose and host Node 24 versions, system time, disk space,
existing service/unit status and current firewall attachment/rules. Keep the recovery
console available. No authenticated Droplet channel is currently available to the
development environment; these checks have not been performed by this document.

Collect the dirty /srv/elevate360-webops checkout with collect-host-evidence.py and
review omissions/errors before trusting the collection. Preserve local overrides,
DNS/netplan/resolved settings, nftables and unit definitions. Never reset the checkout,
replace global firewall rules, or use compose down -v, image prune or system prune.

Record current worker and gateway full IDs, exact local image IDs, network IDs and
configuration, current release pointer (if present), installed schedule bytes and
its digest. Keep previous images, host source and matching Compose configuration.
An image with no recoverable source/provenance is not a validated rollback release.
The old 38-checksum pilot is evidence for that old runtime only.

## 2. Quiesce and preserve evidence

Disable the schedule configuration and timer, and confirm the service is inactive.
If units/configuration were never installed, record their absence instead of
claiming that emergency-stop succeeded. An already running container exec can
outlive its host service: confirm it has ended or use the exact-ID emergency stop
controller described in scheduling.md. A false stopped receipt blocks replacement.
If worker/gateway image identities differ, the controller's one-image contract
does not apply; independently reconcile and stop each verified container.

Preserve scheduler, runner and report locks, pending files and cadence.json.
Investigate interrupted execution before further work; do not erase locks to make
a deployment pass. Export reports and snapshot a stable, quiescent gateway audit
log with the tools in report-retention.md and audit-snapshots.md. Keep trusted
receipts separate, verify transferred copies and record external acknowledgement.
Local snapshots alone do not satisfy external retention or authorize deletion.

## 3. Prepare both releases before switching

Follow source-release.md: package the exact reviewed Git commit, transfer with an
independent trusted digest, stage into a new versioned directory, and run verify-only
immediately before using it. Do not overlay the dirty checkout or old release.
Use separately reviewed verifier code. Preserve the verified source tree; build in
a separate context if generation writes files.

Build the candidate image in the approved build environment. Record source/archive
digest, build inputs/logs, resolved base-image digest and resulting local image ID.
The current Dockerfile uses a mutable node:24-alpine tag and package installation;
source hashing alone does not make the image reproducible or certify dependencies.
Verify the transferred image's local ID if building elsewhere. Retain the previous
image locally. Never substitute a tag for either exact image identity.

Generate separate pinned Compose files with release-compose.py for reviewed
candidate and rollback images, preserving receipts. Validate each standalone file
with Docker Compose config; do not layer it over unknown host overrides. Confirm
the existing audit directory ownership/access and sufficient report/audit capacity.
Compare the complete rendered candidate with host networks and nftables policy.
The fixed project/name/bridge settings can collide with existing resources; do not
delete/recreate a shared network to resolve a mismatch without a separate plan.

## 4. Replace with scheduling disabled

During the quiesced maintenance window, use only the reviewed standalone candidate
Compose file to replace the two WebOps services. Preserve rollback images, evidence
and persistent state. Container/network IDs may change even when names do not.
Record and independently verify the resulting worker, gateway, image and network
IDs, mounts, privileges, resource limits, DNS, attached peers and firewall controls.
The runner verifies worker/network properties, not all gateway or host policy.

Prepare a disabled schedule using the new verified IDs and the existing persistent
state paths and cadence. Use prepare-schedule.mjs --verify-only with the independently
retained digest. Keep the previous config as private evidence. Install the candidate
by a reviewed same-filesystem atomic replacement, preserving mode 0600 and trusted
ownership, and verify the installed bytes against the same digest. Do not use a
hard link (the loader rejects multiple links). Never reset cadence or failure locks.
The atomic installation operation is not yet implemented by prepare-schedule.mjs.

Keep host modules from one verified source release together. The systemd template
expects /opt/elevate360-webops/current/infra/webops/runtime and /usr/bin/node, plus
/etc/elevate360-webops/schedule.json and the three /var/lib state directories.
Reconcile these paths before switching the current pointer. Install reviewed units
only after host compatibility/sandbox verification; leave the timer disabled.
Confirm a disabled CLI invocation makes no Docker request and creates no state.

## 5. Validate and rehearse rollback before activation

Collect fresh evidence on the exact candidate: approved-origin success; direct
public/private/metadata egress blocks; gateway independent rejection; outage fails
closed; audit persistence; report ingestion; schedule cadence/overlap; stop and
recovery. Use the revised host validation package once reconciled with this runtime,
not old pilot logs. Preserve failed results as well as successes.

Capture current DigitalOcean Cloud Firewall attachment and rules independently of
host nftables. Reboot only in a controlled recovery window with console access.
Verify DNS/firewall persistence, state/cadence preservation and effective isolation
before any resumed request. Containers deliberately have restart=no. Reboot therefore
does not promise unattended recovery: the host boot/reconciliation strategy remains
unfinished. Do not change restart policies silently; the runner enforces restart=no.

Rehearse rollback while the timer remains disabled: stop and verify the candidate,
restore the preserved previous host release pointer and its standalone exact-image
Compose configuration, recreate only the reviewed WebOps services, then capture
their new actual IDs. Prepare and verify a new disabled schedule for those IDs.
Do not reinstall stale container IDs or reset cadence. Repeat identity/isolation,
network and report checks. If rollback cannot pass, keep execution disabled and
retain evidence; do not automatically try another image or repeat requests.

## 6. Activation and operating handoff

Activation remains blocked until the preceding live checks, independently retained
evidence, capacity alert delivery/acknowledgement, safe retention/retirement policy,
boot strategy and stop/rollback rehearsal are complete. activation-gate.mjs is an
advisory checklist, not an authenticator; populated references are not proof.

Bind the final reviewed scope, cadence, image/IDs and cost ceiling to the recorded
Founder authority. Only then perform the separately reviewed enabled-config/timer
transition and observe the first scheduled result and next not-due behavior. Record
the operating owner, alert destination, capacity response and emergency stop IDs.
No automatic remediation or Engineering Vault publication follows from activation.

At handoff retain source/CI/image provenance, before/after configs and identities,
network/firewall/reboot evidence, report/audit receipts, alert acknowledgements and
rollback results. Produce the final work report only after this evidence is complete.
This document and local tests do not constitute that completion evidence.
