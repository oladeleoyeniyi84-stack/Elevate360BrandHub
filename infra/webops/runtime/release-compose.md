# Image-pinned release configuration

release-compose.py prepares a standalone Compose JSON document for one exact local
image ID. It does not inspect the image, build, pull, start or stop containers,
install services or activate scheduling. JSON is used as a Compose input to avoid
shell or environment interpolation of image selection.

```sh
python3 /absolute/reviewed/release-compose.py sha256:FULL_64_LOWERCASE_HEX_IMAGE_ID /absolute/private-output
```

Replace the illustrative ID with the independently recorded Docker image ID from
the reviewed build. The output directory must exist, be owned by the operator and
have mode 0700 with stable trusted ancestors. A private file and SHA-256 receipt
are published without replacing previous files. Keep the old image's generated
configuration separately for rollback. The tool does not prove that either image
exists, matches a source commit, passed tests or is safe to deploy. The receipt
explicitly reports imageVerified=false and deployed=false.

Both services use the exact image ID and pull_policy=never. There is no build
section. Restart remains no; worker mount isolation, resource limits, network
addresses, public gateway DNS and capability restrictions match the manual pilot.
The fixed runtime project name retains the pilot network identity. The audit bind
directory must already exist; Compose must not silently create it. No host port is
published and no scheduler service is included.

Use this file alone, not as an override layered over unknown host Compose files.
Validate it with Docker Compose config before lifecycle operations. CI generates
one from the image built in that job and validates its Compose schema; it does not
start a service or validate live firewall behavior. Docker is unavailable in the
local development environment, so local tests cover model invariants and file
publication. Full WebOps CI run 120 passed for checkpoint 5ae639bd, including
validation of the generated Compose document against the CI-built image.

Installation still needs a reviewed sequence that pauses scheduling, verifies no
active run, preserves dirty host configuration and evidence, records both image
identities, performs replacement, validates the resulting exact container/network
IDs and updates the disabled schedule configuration. Rollback requires the preserved
previous local image and configuration, then the same identity/isolation checks.
This generator does not implement that sequence, automatically reconcile networks,
prove image provenance, switch a current release pointer or satisfy activation gates.

Crashes or final directory-sync failure can leave pending/published files without
a receipt. Inspect rather than overwrite or delete blindly. Re-running the same
image ID fails without modifying its previous configuration. Additional generated
files consume disk space; retention and cleanup are operator-controlled.

## Network identity after replacement or rollback

The host runner inspects the exact expected Docker network ID before executing the
worker and again before saving its report. It requires an internal bridge with IPv6
disabled, bridge name br-webops-wkr, one IPv4 subnet 172.30.0.0/24 and gateway
172.30.0.1. A changed ID or weakened/different network configuration fails closed,
leaves the runner failure lock and does not store a report. Pre-execution mismatch
prevents the worker command; post-execution mismatch cannot undo an earlier request.
Inspection failures and malformed responses are also failures, not passed checks.

These are two point-in-time Docker observations, not continuous enforcement or a
proof of nftables/cloud firewall policy. Trusted release configuration and Docker
administration remain prerequisites. They do not validate gateway identity, other
network members, firewall rules, reboot persistence or the image's source provenance.
Those release evidence checks remain mandatory before activation.
