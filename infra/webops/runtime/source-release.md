# Source release packaging

package-release.py prepares a source-only archive from a full 40-character Git
commit already present in a local repository. It does not fetch, checkout, reset,
build images, install services or deploy. Staged, unstaged and untracked host changes
are left untouched and are not included in the package.

```sh
python3 infra/webops/runtime/package-release.py /absolute/repository FULL_COMMIT /absolute/private-output
```

The output directory must exist, be owned by the operator and have mode 0700.
The output archive is mode 0600. A successful JSON receipt names the archive and
its SHA-256 digest. Preserve that receipt separately through a trusted channel.
The output name includes the commit; an existing file is never overwritten.

Included scope: tracked infra/webops/runtime and infra/webops/validation files,
the three TypeScript gateway policy/transport sources, and the dedicated WebOps
nftables configuration. The packager rejects symlinks, submodules, unsafe names,
hidden/generated directories, unsupported extensions and missing core files.
Each blob is limited to 1 MiB, with at most 200 files and 8 MiB aggregate source.
Review tracked configuration for sensitive content before transfer; extension
filtering is not a general secret scanner. Unrelated application files are excluded.

The deterministic tar contains RELEASE-MANIFEST.json with each file's path, size,
mode and digest. Metadata identifies the source commit and explicitly states no
image is included and nothing is deployed. Generated runtime modules are built
later from the packaged TypeScript sources. The build needs the reviewed base
image and package dependencies; this archive does not pin or certify those inputs.

Release sequence still required:

1. Select the exact candidate after its required CI checks succeed. Package from
   Git objects and independently compare the receipt digest after transfer.
2. Preserve the dirty host checkout using the existing evidence collector. Prepare
   a new versioned release directory rather than extracting over that checkout.
3. Use the staging verifier below to validate archive members and manifest before
   writing a new release directory. Build and record the exact image identity,
   then prepare replacement and rollback configuration (still unfinished).
4. Keep scheduling disabled. Complete reconciled deployment, revised network tests,
   firewall/reboot evidence, retention/alerts and the stop/rollback rehearsal.
5. Activate only after technical gates pass under the recorded Founder authority.

No actual release archive from the current branch or live host installation is
claimed by the fixture tests. Tests use disposable repositories to prove source
selection, deterministic bytes, no overwrite, dirty-checkout preservation and
rejection of unsafe or incomplete trees. Trusted repository/output ancestors and
a functioning local Git installation are prerequisites. Hashes prove consistency,
not approval provenance or resistance to an administrator changing both artifacts.

## Verified source staging

Run a separately reviewed copy of stage-release.py, supplying the archive digest
from the trusted release receipt and the selected full commit. Do not obtain the
expected digest from an untrusted archive or run a verifier extracted from it.

```sh
python3 /absolute/reviewed/stage-release.py /absolute/release.tar EXPECTED_SHA256 FULL_COMMIT /absolute/private-releases
```

The release root must already exist, belong to the invoking operator and be mode
0700, with stable trusted ancestors. The verifier checks the complete archive
before writes: bounded regular members, safe relative paths, unique names, exact
manifest membership, file sizes/modes/hashes and commit identity. It rejects links
and special files. It writes files manually into a private temporary directory,
flushes files/directories and renames to a new commit-named directory. Existing
releases and locks are never replaced. No archived code is executed; no image is
built, current pointer switched, service installed, checkout changed or schedule
activated. The receipt explicitly reports activated=false and imageBuilt=false.

The expected digest is the trust anchor: manifest consistency alone is not source
approval or authentication. Staging does not enforce the packager's source allowlist
or certify base images/dependencies. Trusted administrators must not concurrently
modify the release root; the lock coordinates only cooperating staging attempts.
A crash may leave a lock, temporary directory or published release without a
receipt. Inspect these before recovery; do not blindly delete or rerun. Failed
final directory sync may leave the published release while reporting failure.
Staging is preparation only; installation, replacement and rollback remain pending.

## Recheck staged source before a build

Use the separately reviewed verifier with the same trusted archive, receipt digest
and full commit. This mode only reads; it does not create a missing release.

```sh
python3 /absolute/reviewed/stage-release.py /absolute/release.tar EXPECTED_SHA256 FULL_COMMIT /absolute/private-releases --verify-only
```

Verification compares every staged file (including the manifest) to the verified
archive, checks owner and exact permissions, rejects hard links, symbolic links and
special files, and requires the exact directory/file inventory. Extra generated
files, missing files, changed content, unsafe permissions or an existing staging
lock fail closed. All nested staging directories are now explicitly mode 0700.
Older staged trees with intermediate 0755 directories will fail this stricter check;
inspect them and prepare a fresh release root rather than overwriting the old tree.

A successful verified=true receipt is only a point-in-time source-integrity result.
It neither certifies a running container nor permits activation. Stable trusted
ancestors and no concurrent administrator edits remain prerequisites; this command
does not lock out later mutation. Run before building, and use a separate disposable
build context if build generation writes files. Source-tree verification does not
prove dependency/base-image integrity or bind an image to this commit. Actual image
identity, deployment, rollback and live evidence remain separate release steps.
