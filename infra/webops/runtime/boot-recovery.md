# Current-boot activation gate

The systemd service runs boot-gate.mjs as ExecCondition before every scheduled tick.
An enabled schedule is permitted only when a private operator receipt matches both
the current Linux boot ID and the SHA-256 of the exact installed schedule bytes.
A disabled schedule passes without reading an approval or boot ID and the runner
still performs no Docker or persistent-state work.

This is a fail-closed reboot control, not automatic recovery. Containers retain
restart=no. After every host reboot, the prior receipt becomes stale and scheduled
ticks are skipped without marking the service failed. The operator must use a
recovery-console-capable maintenance procedure to reconcile/start the exact reviewed
containers, verify their IDs/image/isolation, DNS and both host/cloud firewall state,
then prepare a new receipt. The runner independently rechecks container and network
identity before executing.

The receipt path in the reviewed unit is:

```
/var/lib/elevate360-webops/boot/approval.json
```

It must be an absolute, operator-owned, mode-0600 regular single-link file with no
symlink components and at most 4096 bytes. Its exact JSON fields are:

```json
{
  "schemaVersion": 1,
  "bootId": "CURRENT-/proc/sys/kernel/random/boot_id",
  "scheduleSha256": "SHA256-OF-EXACT-INSTALLED-SCHEDULE-BYTES",
  "approvedAt": "YYYY-MM-DDTHH:MM:SS.sssZ",
  "approvedBy": "operator",
  "containersVerified": true,
  "firewallVerified": true,
  "dnsVerified": true
}
```

Additional/missing fields, false verification claims, malformed timestamps, unsafe
files, another boot ID or another schedule digest block the tick. The checker emits
only a fixed failure reason and exits 1, which systemd ExecCondition treats as a
skipped start. It never creates, edits or deletes the approval, schedule, containers,
network, firewall or cadence state. Receipt creation and atomic private installation
remain an explicit host operation after live checks; do not pre-populate it from CI.

Before enabling the timer, test a disabled schedule, then an enabled schedule with
no receipt (must skip), stale boot/digest receipts (must skip), and the exact reviewed
receipt (gate passes and the runner still performs its own checks). Reboot in a
controlled window and prove the old receipt no longer passes before collecting new
post-reboot evidence. Preserve both receipts and results for rollback evidence.

The receipt is a root-controlled local assertion, not cryptographic operator
authentication or independent evidence. A privileged host administrator can replace
it. This gate does not start stopped containers, repair boot failures, verify
DigitalOcean Cloud Firewall through an API, deliver alerts, or provide external
retention. Those operational gates remain required before activation.
