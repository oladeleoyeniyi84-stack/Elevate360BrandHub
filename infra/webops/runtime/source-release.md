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
3. Validate archive members and manifest before extraction; extraction/install
   verification is not implemented by this packaging command. Build and record
   the exact image identity, then prepare replacement and rollback configuration.
4. Keep scheduling disabled. Complete reconciled deployment, revised network tests,
   firewall/reboot evidence, retention/alerts and the stop/rollback rehearsal.
5. Activate only after technical gates pass under the recorded Founder authority.

No actual release archive from the current branch or live host installation is
claimed by the fixture tests. Tests use disposable repositories to prove source
selection, deterministic bytes, no overwrite, dirty-checkout preservation and
rejection of unsafe or incomplete trees. Trusted repository/output ancestors and
a functioning local Git installation are prerequisites. Hashes prove consistency,
not approval provenance or resistance to an administrator changing both artifacts.
