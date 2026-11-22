# WebOps Phase 3 — DigitalOcean provisioning package

Status: approved provider design; reproducible provisioning package only. This directory does not provision anything by itself.

## Founder-approved baseline

- Provider: DigitalOcean
- Region: `nyc3`
- Size: `s-1vcpu-1gb` (1 vCPU / 1 GiB)
- Image: `ubuntu-24-04-x64`
- Backups: disabled
- Paid add-ons: disabled
- Public application ports: none
- Scheduler: disabled
- Automatic remediation: disabled
- Credential-bearing crawls: disabled

DigitalOcean's current API documentation on 2026-10-14 reports `s-1vcpu-1gb` as a Basic 1 GiB / 1 vCPU size with a monthly price of $5. Treat $5/month as the approved compute baseline. Do not select a larger size or enable a paid add-on without a new Founder approval.

## Security topology

The host runs two containers in a later activation step:

1. `webops-worker`
   - attached only to an internal Docker network;
   - no public port;
   - no direct internet route;
   - diagnose-only until separately authorized.

2. `webops-egress-gateway`
   - attached to the internal worker network and an egress-capable network;
   - the only component permitted to originate inspection HTTP(S);
   - applies the versioned Founder-approved origin registry;
   - independently rejects private/reserved/link-local/metadata destinations;
   - emits append-only allow/deny audit evidence.

Defense in depth:
- DigitalOcean Cloud Firewall: deny by default; SSH only from approved admin CIDR; outbound limited to required infrastructure protocols.
- Host nftables: blocks private/reserved/link-local/metadata destination ranges and prevents the worker bridge from forwarding directly to an external interface.
- Docker: worker network is `internal: true`; worker has no egress-network attachment.
- Application: Phase 2/3 exact-origin validation, public-IP validation, DNS-pinned HTTPS/TLS/SNI, redirect revalidation and bounded GET-only execution remain active.

## Mandatory runtime acceptance gate — NOT SATISFIED

**Do not apply this package as an operational staging release.** The checked-in `compose.yaml`
uses intentionally disabled Alpine placeholder containers; it is not a deployable worker/gateway
application. The TypeScript `Phase3DiagnoseWorker` and `EgressGateway` contract are not by
themselves a network-accessible runtime.

Before a staging connection or activation can be approved, a separately reviewed integration
must provide and verify:

1. Real, pinned, reproducible worker and gateway images; no `sleep infinity` placeholder.
2. A bounded GET-only worker inspection wired to the actual gateway transport, including
   request/response protocol, authentication or equivalent isolation, deadlines and deny-by-default
   behavior. The worker must have no direct outbound transport or fallback.
3. Internal `/inspect` protocol requires a staging-only, non-repository shared token (minimum 32 UTF-8 bytes), checked by the gateway handler using constant-time comparison. The worker must supply this token only to the internal gateway and no other destination. The protocol handler is an inactive candidate until a real network listener, pinned HTTPS transport, durable audit backend, independent authorization policy, and isolated image are connected.
3. `/app/webops-worker-check <url>` invoking that real worker inspection path and
   `/app/webops-gateway-check <url>` invoking the real gateway policy/transport; neither may
   be unconditional success/failure mocks.
4. An append-only, host-controlled durable gateway audit export that the worker cannot edit.
5. Staging-specific credentials, network boundaries, TLS ingress and access policy, with
   no production database, secret, customer traffic or public app activation.
6. Fresh CI on the exact release commit followed by V1–V6 host-side tests, evidence
   manifest verification and a separate infrastructure approval.

The initial account-level DigitalOcean and Cloudflare access/permissions verification
remains required; repository configuration does not prove live cloud account state.

## Inactive gateway server implementation (review candidate)

The branch now includes `server/webops/phase3GatewayServer.ts`, a Node HTTP server
**factory** (not an enabled service) that composes the authenticated internal
`/inspect` handler, system DNS resolution, and DNS-pinned HTTPS GET transport.
It does not call `listen()`, publish a port, or alter the existing placeholder
Compose services. A local fixture test checks unauthorized routing without
making external inspection requests.

**Not staging-ready:** a separately reviewed startup/binding entry point, real
worker-side check executable, pinned runtime image, immutable host-controlled
durable audit implementation, host-side resource limits and external validation
are still required. In-memory audit must only be used in tests. Neither this
server factory nor the client protocol is evidence of an operating gateway.

## Audit and worker diagnostic code candidates

- `server/webops/phase3FileAudit.ts` supplies a single-process, write-through,
  SHA-256-chained JSONL audit candidate. Reopening checks the chain; a damaged
  or truncated journal fails closed. **It is not tamper-proof**: the host must
  own the audit volume, export hashes to a separate immutable destination and
  prevent worker writes. Concurrent writers are not supported.
- `server/webops/phase3WorkerDiagnostic.ts` uses the real `Phase3DiagnoseWorker`
  with the authenticated internal gateway client. The CLI definition lives at
  `server/phase3WorkerCheck.cli.ts`. Its secret is read from a private
  mounted file, never supplied in command-line arguments.
- Neither code candidate is bundled into a reviewed container image. The
  existing Compose entries still deliberately use disabled placeholders.
  In particular, `/app/webops-worker-check` is **not installed** on a live host.
- CI, isolated integration tests, image provenance, firewall evidence, durable
  audit volume controls and all six host-side V1–V6 checks must pass on the
  exact release build before any staging activation.

## Container image provenance gate

The CI candidate Dockerfile now pins all Node.js build/runtime stages to the digest
`sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee`,
observed in the successful 2026-11-22 GitHub Actions Docker build. It must still
receive independent upstream provenance and vulnerability review before any staging apply.

Both non-root images have OCI source/revision labels; CI verifies the revision equals
the exact `GITHUB_SHA`. The CI output records the Dockerfile SHA-256 and both
image IDs as a retained **build evidence artifact**. Image IDs identify the
local CI images; they do **not** establish an approved registry digest, a signed
artifact, independent attestation, or a deployable release.

The Docker Compose provisioning file remains an intentionally disabled placeholder.
No image is pushed, deployed, scheduled or configured to start automatically.

## Host-side V1–V6 validation — explicit authorization gate

`infra/webops/validation/validate-network.sh` is **disruptive**: it stops,
starts and restarts the gateway. It must not run against the Brand Hub,
production Docker containers, or a shared host.

Before invoking it on a separately approved isolated staging host, the operator
must independently check cloud account ownership/firewall settings, container
identities, mounted secrets, image digests and audit retention. The script refuses
to run unless `WEBOPS_ALLOW_STAGING_GATEWAY_RESTART=YES` and
`WEBOPS_STAGING_HOST_ID` exactly matches `hostname`. Those variables provide
an acknowledgment and a sanity check, **not security authorization**. All other
environment inputs and the host must be independently reviewed.

Direct worker reachability probes now use the Node.js executable present in
the pinned candidate image; do not claim that a refused connection alone proves
network isolation. Independently verify Docker interfaces, nftables, cloud
firewall and routing rules. V6 compares audit exports before/after restart,
and a SHA-256 manifest verifies the collected evidence directory.

**No live host validation has occurred as part of CI.** GitHub Actions checks
only shell syntax and explicit refusal conditions. V1–V6 and the external
account/security approvals remain mandatory before staging.

## Required inputs before apply

Terraform intentionally has no embedded credentials. Supply:

- `DIGITALOCEAN_TOKEN` through Terraform/provider environment configuration, never committed to Git;
- an existing DigitalOcean SSH key fingerprint or ID;
- one or more trusted administrator CIDRs for SSH.

Do not use Elevate360 production session secrets, dashboard PINs, Stripe credentials, database credentials, or customer credentials on this host.

## Apply workflow

1. Review `main.tf`, `variables.tf`, `cloud-init.yaml`, `compose.yaml` and `nftables.conf`.
2. Confirm DigitalOcean reports the requested size at or below the approved $5/month baseline before apply.
3. Run `terraform init` and `terraform plan`.
4. Reject the plan if it contains any resource outside this package, a larger Droplet, backups, volumes, managed databases, load balancers, Kubernetes, or other paid add-ons.
5. Apply only after confirming the plan meets the approved baseline.
6. Do **not** start the WebOps worker yet.
7. Run the separate network-validation gate: direct worker egress must fail, gateway outage must fail closed, metadata/private targets must be blocked, and audit evidence must be preserved.
8. Scheduler activation remains a separate Founder approval.

## Cost guard

This package deliberately creates only one Basic Droplet and one Cloud Firewall. If DigitalOcean's live price for `s-1vcpu-1gb` rises above $5/month at apply time, stop and request a new cost approval before creating the Droplet.
