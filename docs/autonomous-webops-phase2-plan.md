# Elevate360 Autonomous WebOps Agent — Phase 2 Plan

## Phase 2 objective

Build read-only observability around the validated crawler so Elevate360 can run repeatable scans, retain evidence, and review failures and history from an operator dashboard without modifying production content or infrastructure.

## Scope

1. Bounded crawling and sitemap-assisted discovery.
2. URL normalization and deduplication.
3. Redirect tracking and crawl evidence normalization.
4. Deterministic findings and severity classification.
5. Crawl-job and finding persistence design using PostgreSQL/Drizzle code, without applying production database migrations or writes under this phase authorization.
6. Read-only dashboard views for failures, severity, evidence, affected property, timestamps, and history.
7. Scheduled-check design and test harnesses, with production scheduling disabled until separately authorized.
8. Audit events for crawl initiation, completion, truncation, rejection, and operator review.

## Phase 2 safety boundaries

- No production merges or deployments.
- No production database migrations or writes.
- No credential creation, rotation, or modification.
- No Render production-setting changes.
- No POST/PUT/PATCH/DELETE requests from the crawler.
- No remediation actions.
- No security-critical production changes.
- The agent cannot expand its own allowlist or permissions.
- Only Founder-approved origins may be scanned.

## Initial implementation slice

The Phase 2 branch begins with deterministic observability helpers that transform crawl evidence into dashboard metrics and findings. These functions are pure, testable, and side-effect free.

Next implementation steps:

1. Define persistence interfaces and Drizzle schema changes as code only.
2. Add a non-production repository adapter and fixture-backed tests.
3. Add read-only API endpoints protected by existing dashboard authorization.
4. Add dashboard components for run history and finding details.
5. Add scheduled-check orchestration in disabled-by-default form.
6. Add CI gates for Phase 2 tests and build.

## Gate to Phase 3

Phase 2 is complete only when repeatable scans produce accurate, deduplicated findings with retained evidence and history, the read-only dashboard is validated, scheduled checks can be exercised safely in a non-production environment, and the system produces no material production impact.

Phase 3 remains deterministic diagnostics and narrowly scoped safe automation; no remediation or production mutation is part of Phase 2.
