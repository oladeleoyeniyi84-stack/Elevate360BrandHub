# Replace an existing disabled schedule

This operator command installs a verified disabled candidate, either as an explicit
first configuration or as a guarded replacement. It does not initialize a new host, activate scheduling,
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
requires manual reconciliation. Host/unit installation, enabled activation, host boot
reconciliation and a live replacement/rollback rehearsal remain separate work.

## First configuration on a prepared host

```sh
node /absolute/reviewed/replace-schedule.mjs --initialize /absolute/candidate.json CANDIDATE_SHA256 /absolute/installed/schedule.json
```

This explicit mode is only for a missing target file. Prepare the trusted private
configuration parent and reviewed service/timer units beforehand, with both units
inactive and the timer disabled/masked. Missing/unknown units do not bypass checks.
Prepare and independently verify the disabled candidate and actual runtime IDs as
in the release runbook. This mode does not create directories, install units, start
containers, inspect Docker, create cadence state or configure alerts.

Initialization shares the replacement lock and checks service state twice. It
checks target absence with lstat (including dangling symlinks) and publishes with
an atomic no-overwrite hard link from a flushed private pending file. It then
removes that pending link and verifies the installed single-link bytes. A racing
creator cannot be overwritten by this operation. An existing target, even a minimal
disabled stop file, fails rather than silently selecting replacement semantics.
Replacement mode likewise never falls back to initialization for a missing file.

Success reports operation=initialize with enabled=false and activated=false. No
previous backup is created because there is no previous target. Existing state
directories, cadence and locks remain untouched; their continued safety and intended
identity must be reconciled independently. On any failure after locking, preserve
and inspect the lock and pending/published files as above. A crash between link and
unlink can leave two links and is intentionally rejected by the normal loader.
Do not infer that a failed command left the target absent. Live initial-installation
and recovery rehearsals remain pending.
