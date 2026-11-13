# Replace an existing disabled schedule

This operator command replaces an existing complete disabled configuration with a
verified disabled candidate. It does not initialize a new host, activate scheduling,
disable services, inspect containers, change a release pointer or clear state locks.
Use after the quiescence and identity checks in release-operations.md, from a trusted
Node 24 host release. It has not been run on the Droplet.

```sh
node /absolute/reviewed/replace-schedule.mjs /absolute/candidate.json CANDIDATE_SHA256 /absolute/installed/schedule.json PREVIOUS_SHA256
```

Both digests must come from independently retained, trusted receipts. The candidate
must pass prepare-schedule.mjs verification. The installed file must be complete,
disabled, private, operator-owned and single-link; minimal disabled stop files are
deliberately insufficient because they do not identify the prior state directories.
The existing target parent must be operator-owned mode 0700 with trusted stable
ancestors, separate from all three persistent state directories. Candidate and
target must be different paths. Do not run concurrently with another administrator
changing configuration, starting units or replacing containers.

The command acquires .schedule-replacement.lock and queries systemd for both units
inactive and timer disabled/masked. Failed/active/unknown units block replacement.
It checks the previous digest and requires the same resolved scheduler, runner and
report directory paths. A private exclusive schedule-previous-DIGEST.json preserves
the exact old bytes. A private same-directory pending file is flushed before a
second service-state/digest check, atomic rename and directory flush. The installed
bytes are rechecked before returning installed=true, enabled=false and activated=false.
It never writes the three state directories or resets cadence, existing run locks,
reports or audit logs. An existing backup or replacement lock is never overwritten.

Exit 2 reports installationConfirmed=false and inspectionRequired=true. Once the
lock is acquired, failures retain it along with any backup/pending files. A crash
or final verification/sync failure can occur after replacement; failure is not
proof that the old configuration remains installed. Inspect actual bytes, digests,
service state and retained artifacts before recovery. Never blindly remove a lock,
overwrite a backup or rerun as an automatic retry. A successful operation removes
only its own replacement lock; source and previous backup remain intact.

Systemd checks are point-in-time observations, not a global maintenance lock. An
inactive service does not prove an earlier container exec has ended. Independently
verify quiescence and actual replacement container/image/network IDs beforehand.
The receipt retains identitiesVerified=false. State paths are compared lexically
after normalization; live ownership/symlink checks remain the runtime's job.

Rollback uses this same disabled transition with freshly prepared actual IDs, the
current target digest and unchanged state paths. It does not restore old container
IDs automatically. Preserve all prior artifacts; an already existing backup name
requires manual reconciliation. Initial installation, enabled activation, host boot
reconciliation and a live replacement/rollback rehearsal remain separate work.
