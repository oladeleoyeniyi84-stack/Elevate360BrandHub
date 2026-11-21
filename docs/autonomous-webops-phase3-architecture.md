# Autonomous WebOps Agent — Phase 3 Architecture

Status: isolated architecture/design only. No production worker, scheduler, paid gateway, credential-bearing crawl, automatic remediation, production database write, Render setting change, or origin expansion is authorized by this document.

## Objective

Move WebOps from manually authorized bounded read-only pilots toward a production-capable architecture that can eventually support scheduled diagnostics without weakening the Phase 2 SSRF controls or the Founder approval boundary.

The Phase 3 design separates three responsibilities:

1. **Public application** — `Elevate360BrandHub-1` remains the customer-facing web service.
2. **WebOps worker** — a dedicated non-public execution runtime performs bounded diagnostics and later proposal-only remediation workflows.
3. **Independent egress enforcement** — all worker HTTP(S) traffic to inspected websites must traverse a separately administered egress control that can deny unsafe destinations independently of the WebOps application process.

## Production baseline

- Render workspace: `Elevate360 Brand Hub`
- Production web service: `Elevate360BrandHub-1`
- Service ID: `srv-d88th2egvqtc73bf9mfg`
- Branch: `main`
- Runtime: Node
- Region: Ohio
- Health check: `/api/health`
- Current Phase 2 production commit at design start: `0fc80398d5c649c3a3821112cb4db0839b792911`
- Auto-deploy: enabled on commit

The production web service is not the future autonomous crawler runtime.

## Architecture decision

### A. Public web process

Responsibilities:
- customer-facing application and APIs;
- Founder-facing control surface in later phases;
- enqueue explicitly approved WebOps jobs when a durable queue is introduced;
- read summarized diagnostic state.

Must NOT:
- execute scheduled crawling;
- make arbitrary outbound WebOps inspection requests;
- hold egress-gateway administration credentials;
- auto-apply remediation;
- mutate its own WebOps permissions.

### B. Dedicated WebOps worker

Preferred runtime shape:
- non-public background worker or equivalent isolated runtime;
- no public ingress listener;
- one logical job at a time initially;
- bounded concurrency remains 1 until specifically reviewed;
- no customer session cookies or user browser credentials;
- no production secrets beyond the minimum worker-specific credentials needed for queue/audit access;
- no GitHub merge or Render deploy credentials during the first Phase 3 implementation.

The worker receives a normalized job envelope, not arbitrary shell commands.

Proposed envelope:

```ts
interface WebOpsJob {
  jobId: string;
  requestedBy: "founder" | "approved_scheduler";
  mode: "diagnose";
  approvedOriginIds: string[];
  maxPages: number;
  maxDepth: number;
  timeoutMs: number;
  maxResponseBytes: number;
  createdAt: string;
  expiresAt: string;
}
```

Initial production-capable mode remains `diagnose` only.

### C. Independent egress enforcement

All worker HTTP(S) requests to inspected targets must traverse an egress proxy/gateway controlled separately from the worker process.

Mandatory gateway policy:

1. fail closed if policy cannot be evaluated;
2. deny loopback, RFC1918/private ranges, link-local, metadata ranges, CGNAT, multicast, documentation/reserved and unspecified addresses for IPv4 and IPv6;
3. deny non-HTTP(S) protocols;
4. deny nonstandard destination ports unless individually approved;
5. enforce an explicit approved-origin registry where practical;
6. re-evaluate each redirect and each connection attempt;
7. perform or verify destination resolution at connection time;
8. prevent the worker from bypassing the gateway with direct outbound HTTP(S);
9. log allow/deny decisions without logging secrets;
10. default deny when configuration is missing, malformed, stale or unreachable.

The gateway must be independently testable and independently disableable.

## Defense-in-depth preserved from Phase 2

The worker keeps the existing application controls even after the independent gateway exists:
- exact HTTPS origin allowlist;
- rejection of credentials in target URLs;
- rejection of IP-literal hosts, localhost/internal names and nonstandard ports unless explicitly approved;
- public-IP validation of all DNS answers;
- DNS-pinned HTTPS transport;
- original hostname retained for TLS SNI/certificate verification;
- redirect targets revalidated before connection;
- GET-only crawler;
- bounded page count, depth, timeout and response size;
- no crawler credentials in the initial scheduled mode.

The gateway is a second control plane, not a replacement for these checks.

## Trust boundaries

### Boundary 1 — Founder control plane → WebOps job queue
Only authenticated/authorized Founder actions may create or approve jobs until a scheduler is explicitly authorized.

### Boundary 2 — WebOps worker → egress gateway
Worker cannot directly reach arbitrary external HTTP(S) targets. Gateway policy decides whether a connection is permitted.

### Boundary 3 — egress gateway → public internet
Gateway must block private/reserved/metadata destinations even when DNS, redirects, IPv6, mixed A/AAAA answers or rebinding attempts are malicious.

### Boundary 4 — worker → durable audit ledger
Audit writes are append-only from the worker perspective. Worker cannot rewrite or delete prior security decisions.

### Boundary 5 — worker → GitHub/Render
No production GitHub merge, Render deployment or Render settings access during Phase 3 architecture/diagnostic activation. Those capabilities remain separate later-phase permissions.

## Network flow

```text
Founder / approved scheduler
        |
        v
Control API / durable queue
        |
        v
Dedicated WebOps Worker
        |
        | HTTP(S) only through enforced proxy
        v
Independent Egress Gateway
        |
        | allow only after destination policy evaluation
        v
Founder-approved public origin(s)

Worker ---> append-only audit ledger
Worker -X-> direct arbitrary internet access
Worker -X-> metadata/private/reserved targets
Worker -X-> production deployment controls
```

## Origin registry

Registry fields should be immutable per version:

```ts
interface ApprovedOrigin {
  id: string;
  origin: string;
  enabled: boolean;
  allowedPorts: number[];
  maxPages: number;
  maxDepth: number;
  approvedBy: string;
  approvedAt: string;
  version: number;
}
```

Initial registry contains only:

`https://www.elevate360official.com`

Adding another origin is a Founder approval event and creates a new registry version.

## Audit model

Minimum event classes:
- job_requested
- job_approved
- job_started
- destination_requested
- destination_allowed
- destination_denied
- dns_resolution_observed
- redirect_observed
- crawl_resource_completed
- crawl_resource_failed
- job_completed
- job_aborted
- policy_version_used

Each record should include:
- event ID;
- sequence number;
- job ID;
- UTC timestamp;
- component (`control`, `worker`, `egress_gateway`);
- policy/origin-registry version;
- decision and reason code;
- normalized destination metadata;
- previous-event hash or equivalent tamper-evident chaining in later implementation.

Do not log authorization headers, cookies, API keys, session tokens or full secrets.

## Failure behavior

The system must abort the current request/job if any of these occur:
- origin not in approved registry;
- gateway unavailable;
- gateway policy version unavailable;
- DNS failure or empty resolution;
- any resolved address is disallowed;
- TLS hostname/certificate mismatch;
- redirect to unapproved origin or unsafe destination;
- response exceeds maximum size;
- request timeout;
- audit ledger unavailable for security-relevant events;
- job envelope expired or malformed.

No fallback to direct internet access is permitted.

## Scheduler activation prerequisites

A production scheduler remains disabled until all are true:
1. dedicated worker exists and has no public ingress;
2. direct worker HTTP(S) bypass is prevented or demonstrably unavailable;
3. independent egress gateway is active;
4. private/reserved/metadata failure-closed test matrix passes;
5. audit ledger is durable and append-only;
6. spend limits exist;
7. kill switch exists and is tested;
8. no credential-bearing crawling is enabled;
9. Founder approves exact schedule, origin set and per-run limits;
10. production rollback/disable procedure is documented and rehearsed.

## Cost-control requirements

Before provisioning paid infrastructure, prepare a cost sheet containing:
- worker monthly base cost;
- egress gateway/proxy base cost;
- outbound bandwidth cost;
- logging/storage cost;
- queue/database incremental cost;
- expected monthly diagnostic runs;
- hard monthly spend ceiling;
- automatic disable behavior when budget threshold is reached.

No paid component should be provisioned until the Founder approves the cost sheet.

## Render-specific conclusion

Render background workers are suitable as a non-public worker runtime because they can initiate network requests without accepting inbound private-network connections. Render environment isolation is useful for limiting cross-environment private-network traffic, but it is not a general destination egress firewall. Render inbound IP restrictions protect inbound public traffic, not worker egress. Therefore an independent egress enforcement layer remains mandatory for autonomous scheduling.

## Phase 3 implementation sequence

1. threat model and abuse-case review;
2. provider-neutral gateway interface and policy schema;
3. hermetic local test gateway/fixtures;
4. durable audit ledger design;
5. proposal-only worker skeleton with no scheduler;
6. bypass-resistance tests;
7. cost/options comparison for production gateway/runtime;
8. Founder selects provider/cost envelope;
9. provision isolated non-production worker + gateway;
10. execute failure-closed pilot;
11. separate Founder gate before production scheduling.

## Current authorization boundary

Authorized now:
- architecture;
- threat modeling;
- isolated branches;
- local/hermetic tests;
- provider/cost evaluation;
- draft PRs and documentation.

Not authorized now:
- paid infrastructure provisioning;
- production worker creation;
- Render environment/network changes;
- scheduler activation;
- automatic remediation;
- credential-bearing crawl;
- GitHub auto-merge;
- Render auto-deploy by WebOps;
- production DB mutation;
- credential rotation.
