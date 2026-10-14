# Autonomous WebOps Phase 3 — provider and cost comparison

Status: design recommendation only. No infrastructure provisioning is authorized by this document.

## Required property

The selected runtime must enforce crawler egress independently of application code. A worker process must not be able to bypass the egress gateway with a direct socket/HTTP request. Application allowlisting and DNS-pinned TLS remain defense in depth, not the sole control.

## Option A — Render background worker

Baseline compute: `0.5c-512mb` / legacy Starter is $7/month.

Strengths:
- same provider and repository workflow as the production site;
- operationally simple;
- background workers are non-public and suitable for queue processing.

Blocking limitation:
- the available Render controls do not provide arbitrary destination egress filtering for a standard background worker;
- private-network/environment isolation and inbound IP rules do not prevent a worker from initiating direct public outbound traffic;
- therefore a Render worker alone does not satisfy Issue #15.

Decision: not sufficient as the enforcement boundary by itself. It could participate only if an independently enforced network path is added and direct egress is technically impossible.

## Option B — small DigitalOcean Droplet with host/container isolation

Published Basic Droplet pricing starts at $4/month for 512 MiB / 1 vCPU and $6/month for 1 GiB / 1 vCPU. DigitalOcean Cloud Firewalls are stateful, support outbound rules, and are provided at no additional charge.

Proposed topology:
- one small dedicated VM, separate from Elevate360 production;
- `webops-worker` container on an internal-only Docker network;
- `webops-egress-gateway` container is the only component allowed onto the external network;
- host `nftables`/iptables denies direct external traffic from the worker network/interface;
- cloud firewall supplies an additional network-level deny-by-default layer;
- gateway applies the Founder-approved origin registry and records allow/deny evidence;
- worker has no inbound public port;
- SSH/admin access is restricted separately and is not available to the WebOps process.

Operational note:
- cloud firewall rules operate on IP/CIDR rather than hostname policy, so the hostname/origin decision remains at the gateway;
- host/container network policy prevents the worker from bypassing that gateway;
- dynamic CDN addresses therefore do not require the worker itself to receive broad internet access.

Cost recommendation:
- prefer the 1 GiB / 1 vCPU Basic Droplet at approximately $6/month rather than the absolute $4 floor, to leave memory headroom for Node, the gateway, logging, and OS services;
- set a hard infrastructure budget ceiling before provisioning;
- no backup/add-on cost should be enabled without explicit approval.

Decision: preferred low-cost Phase 3 pilot architecture, subject to a dedicated provisioning review and failure-closed network test.

## Option C — AWS ECS/Fargate in a locked VPC

Fargate is usage-based. Security groups can remove the default all-outbound rule and restrict egress. AWS also supports private subnets, VPC endpoints, custom firewalls and proxy architectures.

Strengths:
- strong network primitives;
- highly auditable IAM/VPC model;
- can support a mature production agent platform.

Tradeoffs:
- more networking components and policy complexity than needed for the first single-origin WebOps worker;
- a robust FQDN-aware or proxy-based internet egress design can require additional VPC/firewall/proxy components beyond raw Fargate compute;
- higher operational complexity and greater risk of accidental cost expansion.

Decision: strong future enterprise option, but not the preferred first Phase 3 pilot.

## Recommendation

For the first controlled Phase 3 pilot, choose **DigitalOcean 1 GiB Basic Droplet + host/container network isolation + dedicated egress-gateway container + DigitalOcean Cloud Firewall**.

Why:
1. independently enforceable worker-to-gateway boundary;
2. low and predictable baseline cost (~$6/month before optional extras);
3. no changes required to the existing Render production service;
4. can run completely separate from customer traffic;
5. easier to prove fail-closed behavior than a Render worker with unrestricted outbound networking;
6. simpler and cheaper than a first-stage AWS VPC/Fargate/firewall stack.

## Activation prerequisites

Before provisioning:
- Founder approves provider and monthly spend ceiling;
- infrastructure-as-code or reproducible provisioning plan is reviewed;
- host firewall/network namespace design is documented;
- no public application port is exposed;
- worker secrets are minimized and must not include production session/dashboard credentials;
- failure-closed test plan is approved.

Before scheduling:
- prove direct worker egress fails;
- prove gateway outage stops all crawler traffic;
- prove private/reserved/metadata addresses are denied at both gateway and host/network layers;
- prove only approved origins can be requested;
- preserve audit evidence;
- Founder separately approves schedule, origin registry and per-run/spend limits.
