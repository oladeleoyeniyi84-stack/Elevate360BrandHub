# Prepare a disabled replacement schedule

prepare-schedule.mjs publishes a new candidate configuration without changing an
installed schedule, touching cadence state, executing Docker or enabling anything.
Use Node 24 and a separately reviewed release of the host modules.

```sh
node /absolute/reviewed/prepare-schedule.mjs /absolute/private-input.json /absolute/private-candidates
```

The input must be an operator-owned regular single-link mode-0600 file, at most
16 KiB. Set schemaVersion to 1 and enabled to false. Supply intervalMinutes (60 to
10080), absolute stateDirectory, and runner with containerId (64 lowercase hex),
imageId (sha256 plus 64 lowercase hex), networkId (64 lowercase hex), paths (1 to
14 approved-origin relative routes), runDirectory and reportDirectory. The three
state directories must not overlap. Candidate output must be a separate existing
operator-owned mode-0700 directory with stable trusted ancestors and no symlink
components. Runner scope validation is shared with the actual host runner.

Unknown input fields are discarded. The complete future configuration is validated
without invoking scheduledTick. Its published enabled value is always false. A
content-addressed private file and SHA-256 receipt are returned; repeated identical
input never overwrites an existing candidate. The receipt says installed=false and
identitiesVerified=false. Syntactically valid IDs do not prove deployed identity,
source provenance, release approval or host readiness. State-directory existence,
ownership and symlink checks still occur during actual enabled execution.

Before any future installation, pause the existing timer, confirm no active run,
preserve the old config and evidence, and verify replacement container/image/network
IDs independently. Keep the existing cadence and failure-lock state; changing IDs
must not silently reset the interval or clear an ambiguous prior execution. This
command does not copy over the installed configuration or perform that procedure.
Installation, activation and rollback rehearsal remain separate unfinished work.

The scheduler now validates runner IDs/routes/directories before reserving cadence
or creating a tick lock. Disabled minimal configuration remains a no-I/O stop state.
This prevents malformed enabled configurations from consuming a cadence interval
before being rejected by the runner. It does not remove existing failure locks.

Crash or directory-sync failure may leave a pending/published file without a success
receipt. Inspect before recovery. No cleanup policy, external alert delivery,
secret handling or production lifecycle operation is introduced.

## Verify before installation

```sh
node /absolute/reviewed/prepare-schedule.mjs --verify-only /absolute/private-candidates/schedule-DIGEST.json EXPECTED_SHA256
```

Use the digest saved separately in the trusted preparation receipt. Verification
reads a bounded private single-link regular file once, hashes those exact bytes,
and validates that they describe a complete canonical disabled candidate. A matching
digest cannot make an enabled, malformed or noncanonical candidate pass. No file,
cadence, lock, Docker or service state is changed. Exit 0 reports verified=true;
exit 2 reports a sanitized error. The filename is not the trust anchor.

Verification is point-in-time: it does not authenticate the receipt, verify live
container identity, install the config or prevent later edits. Keep administrators
from changing the candidate between verification and installation, and verify the
installed copy independently. See [release-operations.md](release-operations.md)
for the consolidated sequence and remaining host gates.
