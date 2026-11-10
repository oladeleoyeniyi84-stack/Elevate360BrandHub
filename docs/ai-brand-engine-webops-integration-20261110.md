# Elevate360 AI Brand Engine — WebOps Integration Design
Date: 2026-11-10
Status: design-only integration branch; NOT deployed or activated
Source: Founder-supplied `elevate360-architecture.html` (AI Brand Architecture Blueprint).

## Objective and non-negotiable boundaries
Integrate the blueprint's four pillars with the existing Elevate360BrandHub React/Vite + Express + PostgreSQL + Render architecture. Do **not** replace the live stack with Next.js/Vercel, introduce new vendors or billable services, change Render configuration, rotate secrets, migrate production data, or activate autonomous publishing. `Elevate360BrandHub-1` remains the production reference. Bonded Love, Healthwise Support and Video Crafter remain in the Engineering Vault, informational-only, and require separate source/data/payment/privacy/operations acceptance before release.

## Blueprint translation (proposed, not implemented)
| Original pillar | Existing-system integration | Default safe behavior |
|---|---|---|
| Brand Voice Engine (Claude) | Extend existing `server/ai/modelRouter` and brand content interfaces, not a new Next.js route | Draft-only; no outbound provider calls until explicit configuration and cost approval |
| AI Design & Asset Creation (Replicate/fal.ai + vision) | Adapter interface with locally stored test fixtures; private asset storage architecture reviewed separately | Disabled; no asset generation, public upload, or provider billing |
| Brand Guidelines Enforcement (RAG + Claude) | Versioned approved brand guidelines; optional existing PostgreSQL-backed retrieval after extension feasibility review | Deterministic rules first; no new Supabase/Pinecone or embedding spend |
| Workflow Automation (Trigger.dev) | Reuse existing `server/orchestrator` governance, queue and WebOps diagnostics | No new Trigger.dev/Redis/Resend; draft -> validation -> Founder approval -> separately authorized publication |

## Required state machine
`draft` -> `automated_review` -> `founder_review` -> `approved` -> `scheduled` -> `published`.
Any failed verification -> `blocked` or `manual_review`. Approval must bind immutable content hash, channel, audience, asset references, expiry, reviewer identity, and explicit action scope. Any edit after approval invalidates approval. No agent or prompt output can self-approve. Publishing requires a distinct authenticated, auditable execution step, idempotency key, and per-channel rate/spend limit. Default deny on absent approval or unavailable audit store.

## Existing governance to preserve
- `server/orchestrator/core.ts` documents that side effects pass through governance; confirm actual enforcement in code and tests before relying on it.
- Preserve read-only WebOps origin controls and existing deployment protections.
- Existing `docs/autonomous-webops-phase2-integration-plan.md` describes cumulative PR lineage and review gates; do not merge old PRs independently or assume their historical status is current.
- Avoid AI-generated health/clinical efficacy claims, fabricated reviews/ratings, unverified metrics, and implied clinical professional availability.
- Minimize PII; never log prompts containing secrets, protected customer data, or private media.
- Content generation must not bypass Engineering Vault release restrictions or publish links implying apps are available.

## Implementation sequence (no vendor spend)
1. Inventory current model routing, governance, brand copy, approval queue, storage schema, and tests; map actual vs planned capabilities.
2. Add typed draft/approval contracts and fail-closed tests on a nonproduction branch.
3. Add brand guideline versioning and evidence-linked claim validation; no unverifiable testimonials or statistics.
4. Build a dry-run content preview and audit evidence; no live publication endpoints.
5. Review dependencies, privacy, concurrency, authorization, and operational rollback.
6. Separately request Founder sign-off for any production merge/deployment, recurring automation, provider credentials, paid AI usage, database writes, or channel publication.

## Release acceptance
- `npm ci`, typecheck, test suites, client/server builds, dependency audit, and governance regression tests on the exact reviewed SHA.
- Demonstrate denied publish without Founder approval, denial after content mutation, cross-user denial, retry idempotency, and Vault isolation.
- Prove no unexpected provider calls, database writes, scheduled jobs, or added cost in default configuration.
- Production rollout and rollback require separate, explicit review; this document is not evidence that any gate has passed.

## Current disposition
Documentation integrated on an isolated branch only. No changes to production source, customer data, Render services, database, credentials, Stripe, Calendly, or suspended apps.