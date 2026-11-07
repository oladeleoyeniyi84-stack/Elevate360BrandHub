# Gateway audit snapshots

snapshot-audit.py preserves a stable copy of the gateway JSONL audit file. It does
not stop services, rotate/truncate the source, delete evidence or upload anything.
Use a separately reviewed copy through the authenticated host operator channel.

```sh
python3 /absolute/reviewed/snapshot-audit.py /absolute/audit/gateway.jsonl /absolute/private-snapshots
```

The output directory must exist, belong to the operator and have mode 0700. Paths
must be absolute without symlink components, with stable trusted ancestors. The
source must be a regular single-link mode-0600 file, nonempty and at most 16 MiB.
Its owner may be the gateway's UID 1000; the operator must have read access. This
tool does not authenticate the source owner, events or host. Protect and review the
source location independently. Each record must be a complete UTF-8 JSON object
line at most 16 KiB; event schema, authenticity and completeness are not certified.

Suspend scheduled work and wait for active requests to finish before collecting.
Two bounded reads must match, with unchanged file identity/size/timestamps and an
unchanged pathname binding. Concurrent changes cause failure rather than a partial
success receipt. This is point-in-time evidence, not a lock against the gateway or
administrator; records appended afterward are not included. The command itself
does not disable scheduling or claim the service is quiescent.

The private output preserves exact bytes. Its name contains its SHA-256 digest,
and publication never overwrites an existing snapshot. A repeat of identical data
fails without changing the previous snapshot. The JSON receipt reports the digest,
size and externalRetentionVerified=false. Preserve the receipt separately through
a trusted channel; verify the transferred file against that digest. A digest stored
beside an artifact is not independent authenticity or immutable external retention.

No automatic cleanup, retry, retention or rotation is implemented. A crash can
leave a .audit-pending file, or a published file without a success receipt; inspect
and verify before recovery. A final directory-sync failure can likewise leave a
published snapshot while reporting failure. A full output filesystem or oversized
audit file requires operator review, not evidence deletion. The 16 MiB snapshot
limit does not cap gateway log growth; bounded audit retention remains unfinished.

Fixture tests cover exact bytes/private permissions, no overwrite, unsafe files,
malformed or partial records, limits, concurrent append detection and sanitized CLI
errors. No production audit file or live gateway snapshot has been collected here.
