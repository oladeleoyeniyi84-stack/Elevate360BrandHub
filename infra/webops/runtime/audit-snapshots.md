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
limit alone does not cap gateway log growth. The gateway writer now has the
matching ceiling described below; external retention remains unfinished.

Fixture tests cover exact bytes/private permissions, no overwrite, unsafe files,
malformed or partial records, limits, concurrent append detection and sanitized CLI
errors. No production audit file or live gateway snapshot has been collected here.

## Gateway capacity guard

The gateway audit writer refuses an append that would exceed 16 MiB, with a 16 KiB
record ceiling. It checks regular-file type, single link, current-user ownership and
mode 0600, refuses final-component symlinks, and rejects a non-newline-terminated
previous record. A per-file directory lock coordinates cooperating writers. An
existing lock is never cleared by a new writer. No log rotation or deletion occurs.

At capacity, the attempt record cannot be written, so a new request is blocked
before DNS or outbound transport. If capacity or disk failure occurs on a final
allow/deny record after a request, no successful result is returned, but the network
request may already have happened. There is no reserved capacity for terminal
records. Startup also fails if its startup record cannot be recorded. HTTP reports
audit_unavailable for write failures; external alert delivery remains unfinished.

The limit covers this one file under cooperating writers, not total disk usage,
external snapshots or administrator writes. Stable trusted parent directories and
one reviewed deployment remain prerequisites. Short writes are completed in a loop;
a crash or I/O failure may still leave a partial line or lock requiring operator
inspection. Never clear locks or truncate logs automatically to resume service.
Preserve and verify a snapshot before planning any separately reviewed retirement
or rotation. This guard is tested locally and has not been deployed on the Droplet.
