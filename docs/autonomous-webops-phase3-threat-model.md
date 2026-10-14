# Autonomous WebOps Agent — Phase 3 Threat Model

Status: design-only. This document defines threats, required controls, and verification criteria. It does not authorize production provisioning or autonomous execution.

## Security objectives

1. A compromised or malicious target website must not cause WebOps to access private/internal/metadata resources.
2. A compromised WebOps worker must not be able to bypass the independent egress policy and reach arbitrary destinations.
3. WebOps must never acquire permission to expand its own origin scope, scheduling scope, credentials, merge rights, deploy rights or remediation authority.
4. Network, audit or policy failures must stop work rather than downgrade protections.
5. Founder approval boundaries must remain explicit and auditable.
6. Secrets, session material and customer data must not be exposed to crawled targets or logs.
7. Resource consumption must remain bounded to prevent operational or billing abuse.

## Assets

High-value assets:
- production application availability;
- Founder session/authentication state;
- production database data;
- Render and GitHub administrative capabilities;
- API keys and environment secrets;
- customer/member data;
- brand reputation and public content integrity;
- audit history and approval records;
- monthly infrastructure budget.

## Actors

- Founder/operator — trusted control-plane principal.
- Public user — untrusted.
- Crawled website — untrusted even when its origin is approved.
- DNS infrastructure — external dependency; potentially malicious or compromised.
- WebOps worker — trusted component but assumed compromise-capable.
- Egress gateway — independent enforcement component.
- GitHub/Render — trusted external control planes with separately scoped permissions.
- Attacker controlling content/redirect/DNS for a crawled target — primary SSRF adversary.

## Primary threat classes

### T1 — Direct SSRF to private/reserved address

Attack:
A target, input or redirect attempts `127.0.0.1`, RFC1918, link-local, metadata, CGNAT, multicast, documentation/reserved or IPv6 local ranges.

Controls:
- application URL policy rejection;
- IP-literal rejection;
- DNS/public-IP validation;
- independent gateway destination-IP policy;
- fail closed.

Required evidence:
- worker request rejected;
- gateway logs deny reason;
- target receives no request.

### T2 — DNS rebinding / TOCTOU

Attack:
A permitted hostname resolves to a public address during validation and a private address at connection time, or supplies mixed safe/unsafe A/AAAA answers.

Controls:
- require every resolved address to satisfy public-address policy;
- DNS-pinned HTTPS connection to the validated address;
- original hostname retained for SNI/certificate verification;
- gateway independently resolves/evaluates connection destination;
- redirects and retries revalidated.

Required evidence:
- mixed/unsafe answer set rejected;
- no unchecked second resolution path reaches a prohibited address.

### T3 — Redirect pivot

Attack:
Approved page redirects to localhost, metadata, private host, unapproved origin, nonstandard port or non-HTTPS URL.

Controls:
- automatic redirects disabled in crawler transport;
- Location parsed as a new target;
- full origin/IP/port/protocol/gateway policy reapplied before next connection.

### T4 — IPv6 bypass / IPv4-mapped IPv6

Attack:
Adversary encodes prohibited IPv4 destinations inside IPv6 forms or uses ULA/link-local/multicast/documentation ranges.

Controls:
- normalized IP parsing;
- explicit IPv6 unsafe-range checks;
- IPv4-mapped extraction and reevaluation;
- gateway uses equivalent policy.

### T5 — Worker bypasses proxy

Attack:
Worker code, dependency or compromise opens a direct socket or uses another HTTP client that ignores configured proxy policy.

Controls:
- production architecture must make the approved gateway the only practical outbound path for inspection traffic;
- restrict worker runtime/network route or provider architecture accordingly;
- tests attempt direct DNS/TCP/HTTPS bypass;
- alert on worker-origin traffic that does not traverse gateway where telemetry permits.

Activation blocker:
Scheduler cannot be enabled until bypass prevention is proven in the selected production architecture.

### T6 — Protocol smuggling / alternate schemes

Attack:
Use `file:`, `ftp:`, `gopher:`, `data:`, `ws:`, `unix:`, custom schemes or malformed URLs.

Controls:
- exact `https:` policy initially;
- reject credentials and nonstandard ports;
- proxy/gateway accepts only approved HTTP CONNECT/HTTPS semantics needed by the crawler.

### T7 — Header/credential leakage

Attack:
Crawler sends cookies, Authorization headers, Founder sessions, API keys or internal headers to inspected targets.

Controls:
- crawler credential mode `none` initially;
- explicit safe outbound header allowlist;
- no browser cookie jar;
- gateway/audit logs redact secrets;
- job envelope cannot inject arbitrary headers.

### T8 — TLS interception / hostname confusion

Attack:
Connect to validated IP but accept certificate for wrong hostname, or lose SNI/Host validation.

Controls:
- original approved hostname used for TLS SNI and certificate verification;
- Host header tied to approved origin;
- certificate errors fail closed;
- no insecure TLS flags.

### T9 — Denial of service / crawl explosion

Attack:
Infinite link graph, redirect loop, very large body, slow response, decompression bomb or huge number of URLs.

Controls:
- page/depth/body/time bounds;
- redirect cap;
- concurrency 1 initially;
- content-length and streamed byte limits;
- total job wall-clock deadline;
- per-origin and monthly spend limits.

### T10 — Audit tampering

Attack:
Compromised worker rewrites or deletes deny events, approval records or job history.

Controls:
- durable append-only audit storage;
- worker role can insert but not update/delete historical records;
- sequence numbers;
- later hash chaining or equivalent tamper-evident mechanism;
- external retention/export for critical events.

### T11 — Permission self-expansion

Attack:
WebOps changes its own allowlist, credentials, GitHub rights, Render rights, scheduler or risk thresholds.

Controls:
- configuration/permission changes are outside worker role;
- Founder-controlled registry versions;
- deployment and repository credentials not present in initial worker;
- no API that lets worker mutate its authorization policy;
- policy changes require separate reviewed deployment/approval.

### T12 — Supply-chain compromise

Attack:
Malicious dependency or compromised build adds outbound behavior or disables policy.

Controls:
- locked dependencies;
- production dependency audit gate;
- critical/high vulnerabilities block release unless explicitly risk-accepted;
- CI tests for network policy invariants;
- minimal worker dependency surface;
- no `npm audit fix --force`.

### T13 — Queue/job injection

Attack:
Untrusted user manufactures a crawl job, increases limits or injects arbitrary target URLs/commands.

Controls:
- queue accepts normalized signed/authorized job schema only;
- target selection references immutable approved-origin IDs;
- no shell command field;
- max values clamped server-side;
- expired/replayed job IDs rejected.

### T14 — Origin registry poisoning

Attack:
Malicious or accidental configuration adds attacker-controlled origin or broad wildcard.

Controls:
- no wildcard origins;
- exact scheme/host/port tuples;
- versioned registry;
- Founder approval record for every change;
- worker cannot update registry.

### T15 — Gateway fail-open

Attack:
Gateway policy service, DNS, config or logging fails and traffic proceeds anyway.

Controls:
- explicit default deny;
- worker aborts when gateway unavailable;
- gateway refuses stale/missing policy;
- health status is not permission to bypass policy.

### T16 — Cost/billing abuse

Attack:
Repeated jobs, oversized crawls or adversarial slow endpoints create unbounded infrastructure/API spend.

Controls:
- per-job hard limits;
- daily/monthly execution budgets;
- total bytes/time caps;
- kill switch;
- budget threshold disables scheduler before overrun;
- no automatic paid scaling initially.

### T17 — Production action escalation

Attack:
Diagnostic finding causes an automatic GitHub merge, Render deploy, production database change or security-sensitive remediation.

Controls:
- Phase 3 worker has no such credentials;
- diagnostic output is proposal-only;
- high/critical/security findings require Founder approval;
- deployment remains separately authorized.

## Failure-closed verification matrix

Before any scheduler activation, test at minimum:

| Test | Expected result |
| --- | --- |
| `https://127.0.0.1/` | rejected before outbound connection |
| `https://[::1]/` | rejected |
| hostname resolving to `10.0.0.1` | rejected |
| hostname resolving to `169.254.169.254` | rejected |
| hostname resolving to `100.64.0.1` | rejected |
| hostname with one public and one private A/AAAA answer | rejected as a set |
| IPv4-mapped private IPv6 | rejected |
| redirect from approved origin to localhost | redirect observed; next connection rejected |
| redirect to unapproved public origin | rejected |
| redirect to `http:` | rejected |
| destination port 22/3000/8080 | rejected unless specifically approved; initial policy rejects |
| invalid/missing gateway policy | denied; job aborts |
| gateway unavailable | job aborts; no direct fallback |
| audit ledger unavailable during deny decision | fail job closed |
| TLS certificate hostname mismatch | rejected |
| response exceeds byte cap | stream terminated and finding recorded |
| response exceeds timeout | request aborted |
| page count exceeds cap | crawl truncated with deterministic finding |
| worker tries direct HTTPS bypass | connection fails or is independently blocked |
| job references unknown origin ID | rejected |
| job tries to increase maxPages above policy | clamped/rejected |
| duplicate/replayed expired job | rejected |

## Security acceptance gates

### Gate A — Architecture
- worker separated from public web process;
- gateway contract defined;
- trust boundaries documented;
- threat model reviewed.

### Gate B — Hermetic implementation
- local gateway fixture and worker skeleton;
- all test matrix items that do not require provider networking pass;
- no production resources.

### Gate C — Provider selection
- prove selected runtime can enforce gateway-only egress or equivalent independent control;
- cost sheet approved by Founder.

### Gate D — Non-production infrastructure pilot
- isolated worker + gateway provisioned;
- direct bypass tests fail as expected;
- unsafe destinations denied independently by gateway;
- audit evidence captured.

### Gate E — Production scheduling decision
Requires separate Founder authorization after evidence review. Initial schedule remains read-only diagnosis, one approved origin, low frequency and hard spend limits.

## Residual risks after controls

- compromise of both worker and independent gateway could defeat the two-layer SSRF defense;
- upstream cloud/platform networking defects remain outside application control;
- approved public origin itself may serve malicious content, so parser/content handling remains untrusted-data processing;
- dependency/supply-chain risks require ongoing audits;
- no automated system can eliminate operational risk from later adding credentials/remediation privileges, so those capabilities remain separately gated.

## Current conclusion

The Phase 2 application defenses materially reduce SSRF risk, but autonomous scheduling is not acceptable until the worker is separated from the public app and an independent, fail-closed egress policy is proven against bypass attempts. Phase 3 should therefore implement and test the enforcement boundary before implementing scheduling or remediation.