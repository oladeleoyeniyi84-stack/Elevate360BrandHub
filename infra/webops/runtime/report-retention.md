# Report export and retention

The local store stops accepting reports at 720 files. Export does not free capacity
and must not be interpreted as permission to delete evidence. The following commands
are prepared for an installed, verified host release, not a request to run them now.

```sh
node report-export-cli.mjs export /var/lib/elevate360-webops/reports /var/lib/elevate360-webops/exports
node report-export-cli.mjs verify /absolute/copied/reports-UUID.json EXPECTED_SHA256
```

Source and destination must already exist as separate private directories (0700)
owned by the invoking operator. Files must be owner-only 0600. Export uses the same
exclusive lock as the report writer; suspend scheduled work and confirm no active
run before exporting, otherwise a conflicting write can fail and retain runner locks.
Do not clear an existing lock just to make export work.

Each bundle contains up to 720 canonical diagnostic reports, their original bytes
encoded as base64, byte counts and SHA-256 hashes. The complete bundle is limited
to 64 MiB. It validates every report and filename/run-ID relationship, writes and
fsyncs a private temporary file, verifies the saved bytes, then publishes without
overwriting another export. Original reports are neither modified nor removed.
Repeated exports create separate bundles; operators must budget destination space.
Publication/storage failure returns exit 2, never a successful receipt. A crash can
leave a lock or pending bundle for manual reconciliation.

Save the successful receipt separately through a trusted channel. After transferring
the bundle through the established authenticated operator channel, verify the copied
bundle against that receipt's SHA-256. The verifier checks the whole-bundle digest,
each embedded report digest, canonical report content and unique ordered identities.
It does not extract files, contact services, send messages or use credentials.
Empty or partial-invalid stores cannot be reported as successfully exported.

Hash consistency is not authenticity: anyone who can change both receipt and bundle
can replace evidence. Neither local bundle nor copied file is immutable storage.
This implements diagnostic report export only; gateway audit-log snapshots,
external retention policy/destination, acknowledgement, deletion/rotation policy,
restore rehearsal and automatic capacity alerts remain release work. No new paid
storage is provisioned and no external upload occurs in this module.

Do not resume a full store by deleting reports or changing its path. Preserve the
store until a reviewed archive/retention procedure confirms independently retained
copies and explicitly defines safe retirement. Existing schedule and run locks
must be reconciled, not silently reset after an export.


## Capacity before execution

The host runner now checks report-directory ownership, permissions, existing lock,
entry safety and the 720-file ceiling before any Docker operation. A failed
preflight retains the runner lock for reconciliation and makes no diagnostic request.
The writer repeats its checks when saving: preflight is not a reservation or proof
of free disk space, writable media, valid contents of older reports, or continued
availability. A race or disk failure can still prevent storage after execution.

Successful runner output includes capacityLow=true when 24 or fewer report slots
remain after storage, together with the exact reportsRemaining receipt value.
This is a local machine-readable signal, not external alert delivery. At hourly
cadence it represents at most 24 more report slots, not a guaranteed time interval.
No capacity warning deletes or rotates evidence.
