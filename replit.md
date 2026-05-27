# Elevate360Official Portfolio Website

> **Note:** Detailed history of Phases 4–52 lives in `ARCHIVE.md`. This file is the active reference only.

## Overview
Full-stack brand portfolio for **Elevate360Official** — mobile apps (Bondedlove, Healthwisesupport, Video Crafter), Amazon KDP books, Elevate360 Art Studio (Etsy), Audiomack music, and an AI Concierge with multi-model routing (OpenAI premium + DeepSeek automation).

## Architecture
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui, wouter routing
- **Backend**: Express.js, express-session
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI GPT-4o (premium) + DeepSeek (automation) via `server/ai/modelRouter.ts`
- **Email**: Resend; **Payments**: Stripe; **Hosting target**: Render

## Brand
- **Gold** Primary `43 65% 55%` (#F4A62A)
- **Navy** Background `220 50% 10%`
- **Orange** Accent `30 90% 55%`
- **Brown** Muted `30 40% 25%`
- Brand quote: *"Elevate the world, one product at a time."*

## AI Routing System (Phases 1–3.1 — Current)
- `server/ai/modelRouter.ts` — `runTask({ task, messages, options })` routes by task type:
  - **Premium tasks** (concierge chat, executive copy) → OpenAI
  - **Automation tasks** (digest, session summary, follow-up draft, bulk content) → DeepSeek
- `RunTaskOptions.providerOverride` — hard-locks a specific provider and **disables fallback**
- `PREMIUM_OPENAI_CONTENT_TYPES` in `server/openai.ts` lists content types that always use OpenAI (currently: `newsletter`)
- Auto-fallback: DeepSeek → OpenAI on error (unless `providerOverride` set)
- Log format: `[modelRouter] task=X provider=Y model=Z latency=Nms fallback=BOOL providerOverrideUsed=BOOL` — no PII/keys/prompts logged
- Status surfaced via `/api/health` → `{ ai: { openai, deepseek, router } }`
- **Env vars**: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `AI_PREMIUM_PROVIDER`, `AI_AUTOMATION_PROVIDER` (see `.env.example`)

## Key Features (high-level)
- Hero, Apps showcase, Art Studio, Publications, Featured books
- AI Concierge with intent routing, lead scoring, session summaries, knowledge-base retrieval
- CRM Pipeline (7 stages, Kanban board), Consultation Funnel, Stripe Offers, Orders, Weekly Intelligence Digest
- Autonomous jobs: Phase 49 (5 jobs), Phase 50 (4), Phase 51 (2), Phase 52 (2) = **13 total**
- Founder Control: Safe Mode, Kill Switch, Maturity Scoring (5-dim A–F), Approval Queue
- Blog (`/blog`), Press Kit (`/press-kit`), Link-in-Bio (`/links`), Custom 404
- Multilingual (8 languages), Mobile Bottom Nav, FAQ, Testimonials, Newsletter Popup, Cookie Banner, Announcement Banner, WhatsApp Button, Share Buttons, Commission Dialog
- PWA, SEO/JSON-LD, dynamic sitemap, canonical-host redirect

> See `ARCHIVE.md` for full per-phase implementation notes.

## Data Models (`shared/schema.ts`)
**Public capture**: `contactMessages`, `newsletterSubscribers`, `testimonials`, `pageViews`, `clickEvents`
**AI/CRM**: `chatConversations`, `knowledgeDocuments`, `digestReports`, `bookings`, `sessionOfferings`
**Commerce**: `orders`, Stripe product mirror
**Content**: `blogPosts`
**Automation**: `automationJobs`, `appliedChanges`, `executionQueue`, `rollbackEvents`, `executionPolicies`, `growthExperiments`, `sourcePerformanceSnapshots`, `funnelLeakAnalyses`, `offerRecommendations`
**Founder/Governance**: `userRoles`, `approvalRequests`, `aiExplanations`, `systemHealthSnapshots`, `quarterlyStrategyReports`

## API Routes (current surface)
**Public**: `POST /api/contact`, `POST /api/newsletter`, `POST /api/chat`, `GET /api/testimonials`, `GET /api/offers`, `POST /api/checkout/session`, `GET /api/orders/status`, `POST /api/track/visit`, `POST /api/track/click`, `GET /api/config/public`, `GET /api/health`, `GET /sitemap.xml`
**Dashboard (auth)**: `/api/dashboard/{auth,logout,leads,contacts,subscribers,visits,clicks,testimonials,digest,generate,stripe/sync,leads/:sessionId/{convert,stage}}`
**Automation/Founder (auth)**: `/api/execution/*` (13 endpoints), `/api/founder/*` (overview, what-changed-today, approvals, maturity-score), `/api/admin/roles`, `/api/explainability/*`, `/api/system/{health-summary,run-health-check,safe-mode,kill-switch}`, `/api/strategy/quarterly/*`

## Creator Dashboard
- Route: `/dashboard` — PIN-protected via `DASHBOARD_PIN`
- Sessions: `express-session`, 8-hour duration
- Tabs: Brand Voice · Chat Leads · Contacts · Newsletter · Analytics · Reviews · Blog · Knowledge · Pipeline · Bookings · Orders · Intelligence · Automation · Growth · Execution · Founder · Audit

## File Structure (key paths)
- `client/src/pages/Home.tsx` — main landing
- `client/src/pages/Dashboard.tsx` — creator dashboard shell
- `client/src/components/AIConcierge.tsx` — chat widget
- `shared/schema.ts` — DB schema + Zod validation
- `server/routes.ts` — all API endpoints
- `server/storage.ts` — `DatabaseStorage` (Drizzle CRUD)
- `server/db.ts` — DB connection
- `server/openai.ts` — `getConciergeReply`, `generateBrandCopy`, `generateFollowupDraft`, `PREMIUM_OPENAI_CONTENT_TYPES`
- `server/ai/modelRouter.ts` — provider routing, fallback, override
- `server/ai/types.ts` — `TaskType`, `RunTaskOptions`, `AIStatus`
- `server/ai/providers/{openaiProvider,deepseekProvider}.ts`
- `server/ai/{digestGenerator,sessionSummary}.ts`
- `server/email.ts` — Resend templates (`notifyNewContact`, `notifyNewLead`, `notifyNewSubscriber`, `notifyNewBooking`, `sendContactReply`, `sendDigestEmail`)
- `server/sitemap.ts` — dynamic sitemap
- `server/canonicalRedirect.ts` — HTTPS + canonical host enforcement
- `server/automation/*.ts` — 13 background jobs
- `client/src/types/{automation,founder}.ts`

## Session Storage Keys (browser)
- `e360_chat_session` (sessionStorage) — AI Concierge session ID
- `e360_last_offer` (sessionStorage) — last clicked offer slug (post-purchase attribution)
- `e360_popup_dismissed` (sessionStorage) — newsletter popup dismissal flag
- `announcement_dismissed_{hash}` (sessionStorage) — per-announcement dismissal
- Cookie consent state (`accepted` / `declined`) → localStorage

## Deployment
- **Production target**: Render Web Service
- **Build**: `npm install && npm run build`
- **Start**: `npm start`
- **Health check**: `/api/health`
- **Canonical**: `www.elevate360official.com` (set `CANONICAL_HOST` env var)
- **Required env vars**: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DASHBOARD_PIN`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `AI_PREMIUM_PROVIDER`, `AI_AUTOMATION_PROVIDER`
- **Optional env vars**: `ANNOUNCEMENT_TEXT`, `ANNOUNCEMENT_URL`, `WHATSAPP_NUMBER`, `CREATOR_EMAIL`, `CANONICAL_HOST`
- Stripe webhook registration is skipped in dev; only registers on canonical production domain
- Replit is the **development environment**; Render is **production infrastructure**

## External Links
- Amazon Books: B0GMBNPZC9, B0G5DWG61V, B0FSDTPVJC
- Instagram: https://www.instagram.com/officialelevate360/
- YouTube: https://www.youtube.com/channel/UCDGnUhgvM__6Mw8q26H-urQ
- Etsy: https://www.etsy.com/shop/Elevate360Official
- Audiomack: https://audiomack.com/elevate360music
- Brand logo: `@assets/Elevate360_Brand_Logo_1772418122164.png`
- Art Studio image: `@assets/Elevate360Art_Studio_Presentation_1772460961759.png`
- `@assets` Vite alias → `attached_assets/` (NOT `client/src/assets/`)

## Phase 61 — Neural Command Grid (current)
- Central nervous system unifying Phase 53-60 engines into a single real-time grid
- 7 tables: `neural_signals` (partial-unique open dedup), `command_bus_events`, `cognitive_state_snapshots`, `executive_escalations` (partial-unique open dedup by title), `global_health_scores`, `insight_stream_entries`, `workflow_dependencies` (unique pair)
- 6 modules under `server/neural/`: `commandBus.ts` (ingest + scrub + normalize + dedup + bus event), `healthEngine.ts` (7 category scores), `cognitiveState.ts` (weighted composite + persisted snapshot), `escalationEngine.ts` (high/critical → recommendation-only escalation), `insightEngine.ts` (DeepSeek diagnostic + OpenAI executive, both hard-locked), `commandGrid.ts` (aggregator + `runNeuralScan`)
- 7 admin routes (PIN-gated): `GET /api/admin/command-grid/{overview,signals,escalations,health,insights}`, `POST /signals`, `POST /escalations/:id/resolve`, `POST /run`
- Job: `phase61_neural_command_grid` every 15min (boot offset 9min) — combined for stability
- Dashboard: `/command-grid` — 6 tabs (Overview / Signals / Escalations / Health / Insights / Workflow Matrix), radial cognitive score, category bar chart
- **Recommendation-only**: never mutates money, infrastructure, email, secrets; respects Phase 60 governance
- Provider hard-locks: DeepSeek diagnostics (`providerOverride:"deepseek"`), OpenAI executive (`providerOverride:"openai"`), no silent fallback

## Phase 60 — AI Orchestrator Core
- Coordination layer over Phase 53-59 engines: agent registry, shared memory, workflow queue, governance chokepoint, founder approval gate
- 7 agents: revenue/growth/experiment/personalization/reliability/content/founder
- 4 workflows: `daily_operational_scan`, `traffic_drop_detected`, `pricing_opportunity_review` (approval-gated), `content_cadence_scan`
- Governance: 30 hard-block tokens (stripe/refund/payment/email/deploy/db.drop/network/secret/env) + 7 approval gates + per-agent capability allowlist
- Concurrency: in-process Map lock + **atomic DB claim** (`UPDATE … WHERE status IN ('queued','approved','retrying')` returns null on contention); lock-miss returns row unchanged (no clobber)
- Provider hard-locks: DeepSeek for diagnostics, OpenAI for executive synthesis — `providerOverride` disables fallback in `modelRouter`
- Routes (PIN-gated): `GET/POST /api/admin/orchestrator/{status,workflows,workflows/:id,memory,run,workflows/:id/{approve,reject}}`
- Job: `phase60_orchestrator_core` every 15min (boot offset 8min); self-feeds `daily_operational_scan` on each tick
- Dashboard: `/orchestrator` — tabs Workflows / Agents / Memory / Governance

## Roadmap (next phases)
- **Phase 4** — Persistent AI Memory + pgvector
- **Phase 5** — AI Agents
- **Phase 6** — Founder Intelligence System
- **Phase 7** — Voice + Video AI Integration
- **Phase 8** — Autonomous AI Workflow Engine

## User Preferences
- Communication style: concise, build-focused; user prefers clear progress markers and checkpoints
- Code review: run `architect` after major features (per build instructions)
- Deployment: target Render; Replit stays as dev environment
- Security: never commit `.env`; all secrets via Replit Secrets / Render env vars
