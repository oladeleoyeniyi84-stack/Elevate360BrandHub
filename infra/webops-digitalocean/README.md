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
