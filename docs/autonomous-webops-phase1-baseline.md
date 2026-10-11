# Autonomous WebOps Agent — Phase 1 baseline

Status: initial repository review; live runtime and deployment configuration are not yet independently verified.

## Founder-approved mandate

Build a controlled, AI-assisted operations agent that detects issues, diagnoses root causes, resolves only eligible low-risk issues, verifies fixes, and escalates production code and security-critical changes for Founder approval.

Scope is limited to Elevate360Official and additional properties explicitly added to an approved origin registry. Production changes, credential changes, Render configuration changes, and production database writes are outside the Phase 1 scope.

## Verified repository observations

- Repository: `oladeleoyeniyi84-stack/Elevate360BrandHub`
- Default branch: `main`
- Existing stack: React/Vite, Express, PostgreSQL/Drizzle, TypeScript, GitHub.
- Package scripts include `check`, `test`, and `build`.
- `server/publicCrawl.test.ts` verifies the internal public-route inventory, canonical metadata, sitemap policy, and SPA route boundaries. It is a hermetic regression test, not proof of an external network crawler.
- `server/automation/reliabilityWatchdog.ts` monitors recurring jobs, stuck execution items, rollback-rate signals, and system maturity; it also prunes historical rows.
- `server/automation/rollbackEngine.ts` evaluates growth-experiment outcomes. It is not a deployment rollback mechanism.
- `server/automation/executionEngine.ts` applies certain growth/marketing changes and queues other actions for approval. Its current policy must not be reused for WebOps without an explicit risk-policy review.
- `server/telemetry/operationsCenter.ts`, audit tables, and approval-related schema exist and require detailed compatibility review before integration.
- `server/routes.ts` exposes a sitemap and robots.txt and includes existing founder-session protection helpers.
- `docs/backup-recovery-runbook.md` records the production service name as `Elevate360BrandHub-1`; the documented backup/export evidence is not a completed restore drill.

## Public-site inspection

A browser-based inspection of the homepage returned the JavaScript application shell. It did not establish route-by-route HTTP health, asset availability, redirect behavior, or current production runtime status. Those checks remain outstanding.

## Phase 1 implementation artifact

The isolated WebOps crawler module is intentionally read-only:
- exact HTTPS origin allowlist;
- no credentials, IP-literal hosts, localhost, or nonstandard ports;
- redirects are handled manually and revalidated before queueing;
- GET requests only, sequential requests, bounded page count/depth, timeout and response size;
- no production database writes, remediation, deployment, or automatic schedule registration.

The origin allowlist is supplied by the caller. The module is not wired into the live application and does not run until explicitly invoked by a future authorized worker.

## Required follow-up before a pilot

1. Confirm the full approved origin registry with the Founder.
2. Run `npm ci`, `npm run check`, `npm test`, and `npm run build` in a controlled development environment.
3. Review test output and fix any regressions before merging.
4. Validate crawler behavior against a local fixture and approved public origins with conservative rate limits.
5. Review current dashboard authentication and existing audit/approval schema before adding routes or database writes.
6. Review SSRF protections at the network/egress layer; application allowlisting is not a substitute for worker network isolation.
7. Keep all deployment wiring disabled until a separate approval-gated release step is reviewed.
