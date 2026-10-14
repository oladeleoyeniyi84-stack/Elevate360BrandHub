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
