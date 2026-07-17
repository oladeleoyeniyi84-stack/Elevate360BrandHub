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

## Phase 68A — Premium Experience & Revenue Optimization (current)
- Adds real **customer accounts** (public end-users) + a **shared monetization backend** (subscriptions, AI credits, premium feature entitlements) that external apps can call later via API. AI Concierge is the **only** in-site live gate; external apps (BondedLove/HealthWise/VideoCrafter) are NOT gated. Additive-only migrations; reuses the existing Stripe integration (no second client/billing system). No autonomous charging — Stripe is the money authority.
- **Customer auth is fully separate from founder PIN auth.** `server/auth/customerAuth.ts` — scrypt `hashPassword`/`verifyPassword` (no new deps), `getCustomerId`, `requireCustomerAuth`. Identity lives on `req.session.customerId` (founder uses `req.session.dashboardAuthed` — they coexist in the same express-session store). Login/signup `regenerate()` the session (fixation-safe); logout clears only `customerId`.
- Schema (additive): extended `users` (email unique, passwordHash, stripeCustomerId, premiumTier default 'free', createdAt; username/password made nullable). NEW tables `subscriptions` (stripeSubscriptionId, status, tier, currentPeriodEnd, cancelAtPeriodEnd), `aiCredits` (unique userId, balance, monthlyAllotment, lastResetAt), `userPremiumFeatures` (unique userId+featureKey, source). Created via `scripts/create_phase68_tables.ts` (ALTER … IF NOT EXISTS + CREATE … IF NOT EXISTS — NOT db:push, per table-bootstrap pattern). Migration is additive + one non-destructive constraint relaxation (`users.username`/`password` DROP NOT NULL) required so email-only customers don't need legacy fields — no data dropped.
- Billing catalog `server/billing/plans.ts`: `TierKey` free/starter/pro, `FEATURE_CATALOG`, `PLANS` (free 15 credits, starter 200, pro 1000), `getStripePriceId` (env `STRIPE_PRICE_STARTER`/`STRIPE_PRICE_PRO`), `tierFromPriceId`, `publicPlans` (marks `available:false` when no price configured). `server/billing/premiumService.ts`: `getPremiumStatus`, `applyTier` (sets tier+allotment+feature grants from webhook), `consumeCredits` (ensures row then atomic decrement).
- Storage (`DatabaseStorage`): getUserByEmail, createCustomer, setUserStripeCustomerId, setUserPremiumTier; subscription upsert/get-by-stripe-id/get-active/list-by-status; `ensureAiCredits` (onConflictDoNothing race-safe), getAiCredits, **`consumeAiCredit` (atomic guarded `UPDATE … WHERE balance>=cost RETURNING` — returns null when insufficient, never goes negative)**, setAiCreditAllotment, listAiCreditAccounts; setPremiumFeatures (tx, replaces subscription-sourced grants, preserves manual), getPremiumFeatures.
- Router `server/routes/customerBilling.ts` (mounted at app root via dynamic import — owns full /api paths): `POST /api/auth/{signup(201/409/422),login(401),logout,me}`, `GET /api/premium/{status(auth),features(public+owned)}`, `POST /api/billing/{create-checkout(subscription mode, 503 if no Stripe),portal(503)}`. **Subscription webhook events are handled by the EXISTING single `/api/stripe/webhook` endpoint** (one endpoint = one signing secret) which calls the exported `handleBillingEvent` AFTER its order-fulfillment block. `handleBillingEvent` self-filters: checkout.session.completed (mode subscription only — ignores one-time order checkouts), customer.subscription.created/updated/deleted → `syncSubscription`/`applyTier`. userId resolved from subscription metadata/client_reference_id. NO second webhook endpoint is registered (avoids the dual-signing-secret problem).
- **`/api/chat` gate**: anonymous visitors unchanged; signed-in customers consume 1 AI credit per message (402 `insufficient_credits` when empty). Deduction happens before the AI call.
- Jobs `server/automation/phase68Billing.ts`: `phase68_monthly_credit_reset` (daily, resets balances whose ~30d window elapsed) + `phase68_churn_flag` (daily, read-only past_due/unpaid visibility). Boot offsets 16/17min.
- Frontend: `client/src/api/customer.ts` + `useCustomer`/`usePremiumStatus` hooks; `components/premium/{PremiumGate,UpgradeBanner,CreditMeter,SubscriptionCard,PlanComparison}.tsx`; pages `/pricing` (public) + `/account` (auth form + subscription mgmt); AIConcierge shows UpgradeBanner on 402. Brand GOLD #F4A62A.
- No new REQUIRED env vars (checkout degrades to 503 in dev). Optional for live: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `PUBLIC_BASE_URL`.

## Prod Memory Fix — Bounded Page-View Reads (July 2026)
- Root cause of Render memory-limit event: `storage.getPageViews()` loaded the ENTIRE `page_views` table (grows with every visit) into Node memory from 5 call sites (dashboard visits endpoint, digest, growthEngine, operationsCenter, getGrowthSeoData).
- Fix: `getPageViews(days = 90)` is now date-bounded + `LIMIT 50000` (DESC — newest kept if cap binds); new `getVisitTotals()` returns exact all-time/7d/24h counts via one SQL `count(*) FILTER` query. Digest + ops overview use SQL counts; growthEngine loads only `windowDays*2`. Dashboard labels updated to "last 90 days".
- Index `page_views_created_at_idx` declared in schema + created via `scripts/create_page_views_index.ts` (idempotent — run against prod DB on next deploy, NOT db:push).
- Known residuals from this fix were fully remediated in Phase 69 (see below).

## Phase 69 — Memory Hardening & Bounded Reads (July 2026)
- **All growing-table reads bounded** in `server/storage.ts`: `getContactMessages(1000)`, `getNewsletterSubscribers(5000)`, `getLeadMagnetLeads(1000)`, `getAllChatConversations(500)`, `getAllBookings(500)`, `getAllOrders(1000)` (all newest-first; ascending contracts preserved via desc+reverse where needed).
- **`ChatConversationLite`** projection (all columns EXCEPT `messages` jsonb) — `getChatConversationsLite({limit=5000, since? on updatedAt})` used by digest, growthEngine, reminder queues, analytics. Transcripts only load one-session-at-a-time.
- **Exact counts via SQL** (`count(*) FILTER`), never row loads: `getChatTotals` (leadEmail non-null AND non-empty), `getCaptureTotals`, `getOrderStats`, `getConversionFunnel`. Digest/ops totals are exact all-time; response keys unchanged.
- **Contract disclosures** (no silent truncation): dashboard lists capped at limits above; digest per-lead aggregates (`wonValue`, qualified counts) computed over the 5000 most-recently-active conversations; analytics paths use lite rows capped 10000; reminder queues SQL-filtered, 200/queue; phase68 credit reset loads only due accounts (summary `dueAccounts=N reset=M`).
- **Indexes** on 6 tables declared in schema + `scripts/create_phase69_indexes.ts` (idempotent — **run against prod DB on next deploy**, NOT db:push): contact_messages/lead_magnet_leads/bookings/orders `created_at`, newsletter_subscribers `subscribed_at`, chat_conversations `updated_at`.
- **Instrumentation**: `server/telemetry/memoryMonitor.ts` (1/min RSS+heap sampler, 360-sample ring, peak tracking, unref'd) started at boot; PIN-gated `GET /api/dashboard/system/memory` returns process report + AI memory cache stats + job runner stats.
- **Leak guards**: jobRunner duplicate-registration guard (clears prior timer for same jobKey) + `getJobRunnerStats()`; AI session cache hard cap `MAX_SESSIONS=500` LRU eviction (on top of 30-min TTL); rate-limit purge interval unref'd; SIGTERM/SIGINT graceful shutdown in `server/index.ts` (stop job timers → server.close → sessionPool.end, 10s force-exit deadline).
- **Evidence** (prod build, 110 authed requests / 10 passes over 11 heaviest dashboard endpoints): RSS baseline 102.3MB → peak 104.3MB → post 102.8MB (+0.5MB). Dev-mode run plateaued equally (pass 1→10 +6.5MB; the ~478MB dev RSS is tsx/vite overhead, not app growth). `npm run check` + `npm run build` pass; architect review PASS.
- Load test runnable anytime: `npx tsx scripts/phase69_load_test.ts` (needs running server + `DASHBOARD_PIN`).

## Phase 72.1 — Homepage Analytics API (July 2026)
- **Root cause of the original Mission Control failure**: the endpoints never existed — unknown `/api/*` paths fall through to the SPA catch-all which serves index.html with HTTP 200. Any "200 with empty/HTML body" on an API path means the route isn't registered.
- `POST /api/analytics/homepage` (public, rateLimit 60/min): body `{event, metadata?}` validated by `homepageAnalyticsRequestSchema` — closed 15-event enum `HOMEPAGE_ANALYTICS_EVENTS` (`shared/schema.ts`), unknown/missing event → 400, serialized metadata > `HOMEPAGE_ANALYTICS_METADATA_MAX_BYTES` (2048) → 413, extra keys stripped. Success → `{"ok":true}`.
- `GET /api/dashboard/analytics/homepage/summary` (requireDashboardAuth → 401 unauth): `{totals:{allTime,last7d,last24h}, byEvent:[{event,allTime,last7d,last24h}], generatedAt}` — pure SQL `count(*) FILTER` + `GROUP BY` (Phase 69 bounded-reads discipline; metadata never read back, write-only).
- Table `homepage_events` (event, metadata jsonb, created_at + 2 indexes) via `scripts/create_phase72_1_tables.ts` (idempotent, NOT db:push). **Prod deploy step: run `npx tsx scripts/create_phase72_1_tables.ts` against Render DATABASE_URL before/at next deploy — endpoint 500s until the table exists.**
- Contract tests: `npx tsx scripts/phase72_1_api_tests.ts` (11 cases incl. SPA-fallback guard; needs running server + `DASHBOARD_PIN`; `BASE_URL` overridable for Render). All pass locally; `npm run check` + `npm run build` pass; architect review PASS.

## Content Distribution Engine — Campaigns + Phase 4.1 Lifecycle
- Founder-only (PIN-gated via `requireDashboardAuth`). One blog → 12 channel-ready assets (`CAMPAIGN_ASSET_KEYS`). Page `client/src/pages/AiContentStudio.tsx` (tabs Content Studio / Campaigns). Tables created via `scripts/create_phase72_tables.ts` (idempotent, NOT db:push) — `campaigns` (status text default 'draft') + campaign asset rows. Scoring + Mission Control recs are deterministic client-side (no AI): `scoreCampaign`/`missionControl`.
- **Phase 4.1 lifecycle** (additive — generation + blog-publish flow unchanged): `CAMPAIGN_STATUSES` = draft|generating|ready_for_review|approved|published|archived (`shared/schema.ts`, + `CampaignStatus`, `updateCampaignSchema` strict `.refine` requires status OR title, `UpdateCampaignInput`). status column already existed — no migration.
- Storage: `listCampaigns` returns assets batched via `inArray` (no N+1, returns full asset content — revisit with projection/pagination if volume grows); `updateCampaign(id,{status?,title?})` (partial set + updatedAt); `duplicateCampaign(id)` (tx, "Copy of " title, status reset draft, copies asset rows).
- Routes `server/routes/campaigns.ts`: `PATCH /api/admin/campaigns/:id` (404/400 ZodError), `POST /api/admin/campaigns/:id/duplicate` (201, 404). Distinct from existing `PATCH /:id/assets/:assetKey`.
- UI: color-coded `StatusBadge`/`STATUS_META`; CampaignsView 5 summary cards (clickable filters) + filter pills (All+6) + sort (Newest/Oldest/Highest Score/Recently Updated) + per-card quick actions (Open/Approve/Publish/Duplicate/Archive/Delete) + progress bar + score pill. CampaignDetail Mission Control panel (Score/AI Recs/Missing Assets/Suggested Next Action). Generate Everything maps all 11 non-blog assets onto `/api/ai/content`, persists each via the asset-update API, surfaces per-asset failures (no silent `catch`) while continuing, recalcs score reactively (`useMemo` over `assets`), and auto-advances to ready_for_review once all 12 assets exist (snapshot `initiallyPresent` + `succeeded` set avoids stale closure). **Bug fix — repurpose-prompt length coupling**: the blog is the SOURCE prepended to all 11 repurpose prompts; `/api/ai/content` capped `prompt` at 8000 chars, so a full blog (~8k) blew the cap → every repurpose call 400'd silently → only the seed blog survived. Fix: server `MAX_PROMPT_CHARS` 8000→32000; client caps source at `MAX_SOURCE_CHARS` 24000 in `assetGenBody`/`promptGenBody`; admin content rate limit 20→40/15min (batch is 11 calls/run). No new env vars.

## Phase 67 — Cognitive Operating System
- Founder-only (PIN-gated), recommendation-only **meta-layer** sitting above Founder Intelligence (Phase 64), Revenue Intelligence (Phase 65), and Growth Automation (Phase 66). Reads their OPEN items as one unified signal stream and synthesizes unified decisions, cross-system conflicts, and an executive cognitive briefing. Never mutates money/pricing/email/infra/secrets and never executes anything autonomously.
- 3 tables: `cognitiveDecisions` (kind opportunity/risk/action, area, title, detail, priority 0-100, confidence 0-100, sources jsonb [{system,area,title}], status open/acknowledged/dismissed, source rules/deepseek) + `cognitiveBriefings` (periodType daily/weekly/monthly/quarterly, title, summary, sections jsonb {cognitiveLoad,systems,topSignals,decisions,conflicts}, providerMetadata jsonb, source) + `cognitiveConflicts` (area, title, detail, severity 0-100, leftSignal, rightSignal, status open/acknowledged/resolved, source rules). Created via raw `CREATE TABLE IF NOT EXISTS` matching the Drizzle schema exactly (NOT db:push — db:push falsely offers to rename the express-session `user_sessions` table; SQL-first keeps the schema in sync so a later db:push sees no diff).
- Storage: `getAllCognitiveSignals` (read-only union of open founderDecisionItems + revenueInsights + growthAutoOpportunities → normalized `CognitiveSignal`); decisions create/`replaceCognitiveDecisions` (atomic tx; deletes only open rows source in rules/deepseek)/list/`updateCognitiveDecisionStatus`; briefings create/list/get; conflicts create/`replaceCognitiveConflicts` (atomic tx; deletes only open rows source rules)/list/`updateCognitiveConflictStatus`. `CognitiveSignal` canonical type in `shared/types/cognitive.ts`.
- 5 modules under `server/services/cognitive/`: `priorityEngine.ts` (leaf — `scrub`/`deepScrub` PII, `rankSignals` score=priority*0.65+confidence*0.35, `cognitiveLoad`, `summarizeSystems`), `decisionEngine.ts` (`deriveCognitiveDecisions` pure rules — area convergence across systems boosts priority+confidence; `generateCognitiveDecisions` DeepSeek-enriched top risk → atomic persist), `conflictEngine.ts` (`detectConflicts` pure heuristics — opportunity/expansion vs risk/negative across different systems in same area; `generateCognitiveConflicts`), `briefingEngine.ts` (PERIODS, `generateCognitiveBriefing` OpenAI exec synthesis + deepScrub before persist), `index.ts` (`buildCognitiveOverview` composer + `runCognitiveScan` = decisions+conflicts+daily briefing).
- Router: `server/routes/cognitiveOs.ts` exports `cognitiveOsRouter` (express.Router), mounted `app.use("/api/admin/cognitive-os", cognitiveOsRouter)` via dynamic import in `server/routes.ts` (avoids circular import; reuses exported `requireDashboardAuth`). 12 PIN-gated routes: `GET {overview,signals,decisions,conflicts,briefings,briefings/:id}`, `POST {decisions/generate,conflicts/generate,briefings,run}`, `PATCH {decisions/:id,conflicts/:id}`.
- Provider hard-locks: DeepSeek diagnostics (`providerOverride:"deepseek"`), OpenAI executive synthesis (`providerOverride:"openai"`), no fallback. Scrub on LLM inbound + before all persistence (deepScrub recursive for briefing sections).
- Job: `phase67_cognitive_os` daily (cadence 1440, boot offset 900_000 = 15min, after growth automation) — runs `runCognitiveScan`.
- Dashboard: `/cognitive-os` — PIN-gated, 6 tabs (Briefing / Decisions / Conflicts / Signals / Systems / History). Components under `client/src/components/cognitive/` (BriefingCard, DecisionTable, ConflictPanel); typed fetch helpers in `client/src/api/admin.ts` (`cognitiveApi`). No new required env vars.

## Phase 66 — Growth Automation Engine
- Founder-only (PIN-gated), recommendation-only unified growth system. Mirrors Phase 64/65 architecture. Never auto-launches campaigns or publishes social — founder approval required before any "execution".
- Covers: lead scoring, SEO opportunity discovery, content opportunity generation, campaign planning, conversion forecasting, social publishing workflows, executive growth dashboard.
- Naming collision-safe: existing `growthIntelligenceReports`/`growthRecommendations`/`growthExperiments` untouched; NEW tables prefixed `growth_auto_*`.
- 3 tables: `growthAutoOpportunities` (kind seo/content/campaign/lead/conversion/social/general, area, title, detail, priority 0-100, confidence 0-100, status open/acknowledged/dismissed, source rules/forecast) + `growthAutoCampaigns` (campaignKey unique, channel blog/instagram/youtube/email/etsy/audiomack/multi, objective, title, plan jsonb, providerMetadata jsonb, status draft/pending_approval/approved/rejected, approvalRequestId nullable, source, resolvedAt) + `growthAutoReports` (periodType, title, summary, sections jsonb, providerMetadata jsonb, source). Tables+indexes created via `CREATE TABLE IF NOT EXISTS` (NOT db:push).
- Storage: `getGrowthSeoData` (pageViews-by-page + published blog list), `getLeadScoringData` (lead distribution); opportunity create/`replaceGrowthAutoOpportunities` (atomic tx; deletes only open rows source rules/forecast)/list/updateStatus; campaign create/list/get/`updateGrowthAutoCampaign`/`transitionGrowthAutoCampaign` (atomic guarded `UPDATE…WHERE id AND status IN(...)` — prevents double-approve races + contradictory terminal states); report create/list/get. Reuses `getRevenueAttributionData`, `getConversionFunnel`, `getOfferOptimizerData`, `getFounderIntelSeries`, `getLatestSourcePerformance`, `getDashboardSummary`, `getBlogPosts`, `getPageViews`.
- 11 modules under `server/growth-automation/`: `aggregator.ts` (`buildGrowthSnapshot` read-only scrubbed cross-system snapshot + `scrub` + SOCIAL_CHANNELS), `leadScoring.ts` (`computeLeadScoring` tiers + readinessScore), `seoEngine.ts` (`discoverSeoOpportunities` deterministic — thin/missing content, cadence gaps, top pages), `conversionForecast.ts` (`computeConversionForecast` deterministic OLS, 7/30/90d conversion-rate horizons + bands + R²-confidence), `contentEngine.ts` (`generateContentOpportunities` DeepSeek), `campaignPlanner.ts` (CHANNELS, `planCampaign` OpenAI → draft), `socialEngine.ts` (`draftSocialWorkflow` channel-specific posts → draft), `opportunityEngine.ts` (`deriveGrowthOpportunities` pure rules + `generateGrowthOpportunities` DeepSeek-enriched top item, final scrub, atomic persist), `reportEngine.ts` (PERIODS, `generateGrowthReport` OpenAI + `deepScrub`), `copilot.ts` (`askGrowthCopilot` snapshot-grounded OpenAI), `growthCenter.ts` (`buildGrowthOverview` composer).
- 18 PIN-gated routes: `GET /api/admin/growth-automation/{overview,forecast,lead-scoring,seo,opportunities,campaigns,campaigns/:id,reports,reports/:id}`, `POST /api/admin/growth-automation/{content/generate,opportunities/generate,campaigns/plan,campaigns/:id/approve,campaigns/:id/reject,social/draft,reports,copilot}`, `PATCH /api/admin/growth-automation/opportunities/:id`.
- Approval gate: `campaigns/:id/approve` runs `evaluateActionSafety` (growth_agent capability `activate.campaign` / `publish.outbound`) → atomic guarded transition → creates `approvalRequests` row (area "growth", actionType launch_campaign/publish_social) only after winning the transition. Recommendation-only — no autonomous launch/publish ever performed.
- Provider hard-locks: DeepSeek diagnostics/research (`providerOverride:"deepseek"` in content/opportunity engines), OpenAI executive synthesis (`providerOverride:"openai"` in campaignPlanner/socialEngine/reportEngine/copilot), no fallback. Scrub on LLM inbound + before all persistence (`deepScrub` recursive for report sections).
- Job: `phase66_growth_automation` daily (cadence 1440, boot offset 14min) — regenerates opportunities + daily growth briefing.
- Dashboard: `/growth-automation` — PIN-gated, 10 tabs (Briefing / Lead Scoring / SEO / Content / Campaigns / Social / Forecasts / Opportunities / Copilot / Reports). No new required env vars.

## Phase 65 — Revenue Intelligence Engine
- Founder-only (PIN-gated), recommendation-only executive revenue intelligence layer. Mirrors Phase 64 architecture. Never mutates money/pricing/refunds/email/infra/secrets.
- 2 tables: `revenueIntelReports` (periodType daily/weekly/monthly/quarterly, title, summary, sections jsonb, providerMetadata jsonb, source) + `revenueInsights` (kind opportunity/risk/action, area attribution/clv/offers/funnel/bookings/forecast/leads/general, title, detail, priority 0-100, confidence 0-100, status open/acknowledged/dismissed, source rules/forecast).
- Storage: `getCustomerLtvData` (CLV/cohorts/segments, masked emails, median), `getBookingIntelligence` (status mix, booked/won leads, bookingToWonRate); report CRUD; insight create/`replaceRevenueInsights` (atomic tx; deletes only open rows source in rules/forecast)/list/`updateRevenueInsightStatus`. Reuses `getRevenueAttributionData`, `getConversionFunnel`, `getOfferOptimizerData`, `getFounderIntelSeries`.
- 9 modules under `server/revenue-intel/`: `aggregator.ts` (`buildRevenueSnapshot` read-only scrubbed cross-system snapshot + `scrub`), `clvEngine.ts` (`computeClvAnalytics` value tiers + top-20 Pareto share), `offerAnalytics.ts` (`computeOfferAnalytics` revenue × acceptance ranking), `funnelIntel.ts` (`analyzeFunnel` stage-to-stage + biggest leak), `revenueForecast.ts` (`computeRevenueForecast` deterministic OLS, 7/30/90d horizons, R²-derived confidence + scenario bands), `insightEngine.ts` (`deriveRevenueInsights` pure rules + `generateRevenueInsights` DeepSeek-enriched top risk, final scrub pass, atomic persist), `reportEngine.ts` (`generateRevenueReport` OpenAI synthesis + `deepScrub` before persist), `copilot.ts` (`askRevenueCopilot` snapshot-grounded OpenAI), `revenueCenter.ts` (`buildRevenueOverview` composer).
- 9 PIN-gated routes: `GET /api/admin/revenue-intel/{overview,forecast,insights,reports,reports/:id}`, `POST /api/admin/revenue-intel/{insights/generate,reports,copilot}`, `PATCH /api/admin/revenue-intel/insights/:id`.
- Provider hard-locks: DeepSeek diagnostics (`providerOverride:"deepseek"`), OpenAI executive synthesis + copilot (`providerOverride:"openai"`), no fallback. Scrub on LLM inbound + before all persistence (`deepScrub` recursive for report sections; explicit scrub pass for insight fields).
- Job: `phase65_revenue_intelligence` daily (cadence 1440, boot offset 12min) — regenerates insights + daily revenue briefing.
- Dashboard: `/revenue-intelligence` — PIN-gated, 10 tabs (Briefing / Revenue / CLV / Offers / Funnel / Bookings / Forecasts / Insights / Copilot / Reports).
- No new required env vars; uses existing OpenAI/DeepSeek/DB. No Calendly API — booking intelligence uses internal `bookings` table.

## Phase 64 — Founder Intelligence System
- Executive intelligence layer turning cross-system data into founder-grade decisions. Recommendation-only — never mutates money/pricing/email/infra/secrets/destructive actions.
- 2 tables: `founderIntelReports` (periodType daily/weekly/monthly/quarterly, title, summary, sections jsonb, providerMetadata jsonb, source) + `founderDecisionItems` (kind opportunity/risk/action, area, title, detail, priority 0-100, confidence 0-100, status open/acknowledged/dismissed, source).
- 6 modules under `server/founder-intel/`: `aggregator.ts` (`buildIntelSnapshot` read-only scrubbed cross-system snapshot + `scrub`), `forecastEngine.ts` (`computeForecasts` deterministic OLS linreg, R²-derived confidence, revenue/leads/traffic/conversion), `decisionEngine.ts` (`deriveDecisionItems` pure rules + `generateDecisionCenter` DeepSeek-enriched top risk, atomic persist), `reportEngine.ts` (`generateExecutiveReport` OpenAI synthesis + `deepScrub` before persist), `copilot.ts` (`askCopilot` snapshot+founder/brand-memory grounded OpenAI), `intelligenceCenter.ts` (`buildOverview` composer).
- Storage: `getFounderIntelSeries(days)` daily series (visits/leads/conversions=paid-orders-only/revenueCents); report CRUD; decision items create/list/`replaceFounderDecisionItems` (atomic tx; deletes only open items with source in rules/forecast/growth)/`updateFounderDecisionStatus`.
- 9 PIN-gated routes: `GET /api/admin/founder-intel/{overview,forecasts,decisions,reports,reports/:id}`, `POST /api/admin/founder-intel/{decisions/generate,reports,copilot}`, `PATCH /api/admin/founder-intel/decisions/:id`.
- Provider hard-locks: DeepSeek diagnostics (`providerOverride:"deepseek"`), OpenAI executive synthesis (`providerOverride:"openai"`), no fallback. Scrub on LLM inbound + before all persistence (`deepScrub` recursive for report sections).
- Job: `phase64_founder_intelligence` daily (cadence 1440, boot offset 11min) — regenerates decision center + daily briefing.
- Dashboard: `/founder-intelligence` — PIN-gated, 6 tabs (Briefing / Decision Center / Intelligence / Forecasts / Copilot / Reports).

## Phase 63 — Cognitive Memory Layer
- pgvector-backed (0.8.0) shared semantic memory across Concierge / Founder Intelligence / Orchestrator / Neural Grid / Execution Mesh.
- Table `cognitive_memories`: `embedding vector(1536)` (text-embedding-3-small), `memory_scope` (conversation/lead/founder/agent/brand_knowledge), `memory_type` (short_term/long_term/episodic/strategic), `subject_key`, `title`, `content`, `importance` (0-100), `source`, `metadata` jsonb, `access_count`, `last_accessed_at`, `expires_at`. 3 indexes incl. HNSW `vector_cosine_ops`.
- 3 modules under `server/memory/`: `embeddings.ts` (`embedText` via text-embedding-3-small, `toVectorLiteral`, graceful null degrade if no `OPENAI_API_KEY`), `memoryEngine.ts` (`writeMemory`, `searchMemory` cosine `<=>`, `recallForSubject`, `listMemories`, `deleteMemory`, `pruneExpired`, `getMemoryHealth`, `getMemoryAnalytics`), `conciergeMemory.ts` (`buildConciergeMemoryContext`, `rememberConciergeTurn`).
- **Security**: `scrubSensitive` strips keys/tokens/emails/hex/card/phone from `content`, `title`, **`subjectKey`** (client-controlled), and recursively from `metadata` before embed+store. `rowToMemory` always forces `embedding:null` — embeddings never returned to clients. All memory routes founder-PIN gated.
- Concierge integration: `/api/chat` recalls + semantic-searches prior memories before reply (injected into `getConciergeReply`), async non-blocking write after reply. Returning visitors recalled without re-stating interests.
- 6 PIN-gated routes: `GET /api/admin/memory/{overview,search,list}`, `POST /api/admin/memory` (201/422), `DELETE /api/admin/memory/:id`, `POST /api/admin/memory/prune`.
- Dashboard: `/memory-explorer` — 4 tabs (Overview / Search / Explorer / Add) + prune.
- SQL-injection safe: all values via drizzle `sql`` parameterization; vector literal is numeric-only interpolation. Access tracking (`touchAccess`) fires in both vector and recency-fallback search branches.

## Phase 62 — Autonomous Execution Mesh
- Distributed AI worker layer over Phase 60/61. 9 worker agents registered on boot, recommendation-only.
- 8 tables (all `mesh_` prefixed to avoid collision with Phase 49 `execution_queue`): `mesh_agents` (unique agent_key), `mesh_missions` (unique mission_key), `mesh_tasks`, `mesh_communications`, `mesh_queue` (partial unique on mission_id WHERE status IN queued/locked), `mesh_topology_snapshots`, `mesh_worker_memory` (unique agent_key+scope+key), `mesh_audit_logs`.
- 8 modules under `server/mesh/`: `agentRegistry.ts` (seedDefaultAgents + selectBestAgent w/ cooldown), `missionPlanner.ts` (createMission + decomposition), `taskRouter.ts` (capability-matched assignment), `workerRuntime.ts` (per-task governance + providerOverride LLM call + scrub + retry), `communicationBus.ts` (typed inter-agent messages), `topologyEngine.ts` (mesh health + graph snapshot), `memoryEngine.ts` (scoped upsert), `missionEngine.ts` (lifecycle orchestrator + `runMeshTick`).
- 9 agents: growth_worker, revenue_worker, experiment_worker, personalization_worker, reliability_worker, content_worker, executive_worker (OpenAI), strategy_worker (OpenAI), automation_worker. Each with capabilities, max concurrency, cooldown.
- 10 PIN-gated routes: `GET /api/admin/mesh/{overview,agents,missions,missions/:id,tasks,topology,communications}`, `POST /api/admin/mesh/{missions,missions/:id/cancel,run}`.
- Job: `phase62_execution_mesh_tick` every 5 min (boot offset 10 min) — heartbeats agents, drains queue via atomic `FOR UPDATE SKIP LOCKED`, executes missions, snapshots topology.
- Dashboard: `/mesh` — 7 tabs (Overview / Agents / Missions / Tasks / Communications / Topology / Memory).
- **Race-safe**: `lockMeshQueueItem` (SQL `FOR UPDATE SKIP LOCKED`) + `claimMeshMission` (atomic queued|assigned|retrying→running) prevent double-dispatch. Locks auto-expire via `lock_expires_at`.
- **Cancellation is authoritative**: `executeMission` re-checks mission status before each task and `setFinalMissionStatus` refuses to overwrite a `cancelled` mission.
- **Retry lifecycle**: failed task with attempts remaining → task `queued`, mission `retrying`, queue re-enqueued with 1-min backoff (unique index dedups).
- **Queue terminal status mirrors mission outcome**: `completed` / `failed` / `blocked` / `pending_approval` / `cancelled` / `retrying`.
- **Recommendation-only**: every task passes Phase 60 `evaluateActionSafety` before any LLM call. Hard-blocks (Stripe, refunds, pricing, email, deploy, secrets) never reach a provider. No worker mutates money / infra / email / secrets.
- Provider hard-locks: DeepSeek (diagnostics/planning/operational reasoning) and OpenAI (executive synthesis) — `providerOverride` disables fallback in `modelRouter`.
- Scrub regex (keys/bearer/email/hex/phone) reused on LLM inbound + outbound + audit summaries.

## Phase 61 — Neural Command Grid
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

## Revenue/AI/Authority Features (T001–T005 — Current)
- **T001 AI Founder Concierge 2.0**: `server/ai/recommendedAction.ts` resolves stored leadScoring offer → live Stripe offer / consultation booking / generic; structured `recommendedAction` in `POST /api/chat`; in-chat CTA card in `AIConcierge.tsx`; booking preselect via sessionStorage+event in `Home.tsx`; shared `listStripeOffers()` helper.
- **T002 Unified Executive Command Center** (`/executive`): read-only PIN-gated `GET /api/admin/executive/overview` composing existing storage getters + AI status; `ExecutiveCenter.tsx`.
- **T003 AI Content Factory** (`/content-factory`): `contentDrafts` table + atomic state transitions; `server/ai/contentFactory.ts` (DeepSeek bulk / OpenAI premium); 7 PIN-gated routes `/api/admin/content-factory/*`; approval-gated, idempotent, concurrency-safe publish → `/blog`.
- **T004 Founder Authority Layer** (`/founder` public + `/authority` admin): `authorityItems` table; public `GET /api/authority` (published-only) + PIN-gated admin CRUD `/api/admin/authority`; `Authority.tsx` with Person JSON-LD (award/hasCredential/subjectOf); `AuthorityAdmin.tsx`; sitemap entry.
- **T005 AI Marketplace** (`/marketplace` public + `/marketplace-admin` admin): `marketplaceProducts` table; public `GET /api/marketplace` + `GET /api/marketplace/product/:slug` (both strip `deliveryContent`); `POST /api/marketplace/checkout` (Stripe session, degrades 503 if no `stripePriceId`/Stripe off); `GET /api/marketplace/delivery?session_id=` (returns deliverable only when `order.status==='paid'`, marks delivered); PIN-gated admin CRUD `/api/admin/marketplace` (slug-conflict 409); webhook marks marketplace orders delivered on `checkout.session.completed`; marketplace delivery block in `CheckoutSuccess.tsx`; sitemap entry.

## Sprint 70.2 — Public Homepage Feed (July 2026)
- **Public** `GET /api/homepage/feed` (no auth, `Cache-Control: public, max-age=60`) aggregates 3 already-public sources: latest 3 published blog posts (body-free projection), up to 3 Stripe offers (narrow projection: priceId/name/description/amount/currency — no productId/metadata), latest 3 approved testimonials (`approved` flag stripped). Wire contract in `shared/types/homepageFeed.ts`.
- `server/homepageFeed.ts`: `Promise.allSettled` per-source isolation (one failure → empty section + `meta.sources` status), **single-snapshot in-memory cache** (5-min TTL, bounded by design), inflight dedupe, stale-serve only when ALL sources fail. Partial-failure semantics: a partial failure overwrites the cache with an empty section for the TTL — expected, degrades gracefully. Offer source injected as function param (avoids circular import with routes.ts). `getHomepageFeedCacheStats()` exported.
- Storage (bounded, additive): `getLatestPublishedBlogPosts(limit≤12)` + `getLatestApprovedTestimonials(limit≤12)`, both desc, in `IStorage`.
- UI: `client/src/components/LatestFromElevate360.tsx` (section `#latest` after books in `Home.tsx`) — posts grid + featured offer + recent review; renders `null` on error/empty feed. **Does NOT use `.reveal` scroll classes**: `useScrollReveal` only observes elements present at page mount, and this section mounts after the async query resolves — reveal classes leave it permanently invisible. Any future async-mounted section must avoid `.reveal` or fix the hook.
- Verified: typecheck+build pass; 54ms cold / 3ms cached; RSS flat over 300 req; axe 0 WCAG 2A/AA violations; desktop/tablet/mobile screenshots.

## Sprint 71.1 — Context-Aware AI Concierge (July 2026)
- Concierge knows page/product/section BEFORE first response. Config lives in `shared/conciergeContext.ts` (`CONCIERGE_PAGE_CONTEXTS`: 15 public routes × pageTitle/section/product/greeting/knowledge/suggestedCta/recommendedLinks; `resolveConciergePagePath` strips query/hash, collapses `/blog/:slug`→`/blog` + `/knowledge/:slug`→`/knowledge`, null for unknown). Client entry `client/src/config/conciergeContext.ts` (re-exports + `buildConciergePagePayload` + `getConciergeGreeting` + `isConciergeHiddenRoute` deny-list of founder/admin prefixes — `/founder` is PUBLIC (Authority page), `/authority` is admin).
- **Security model: server never trusts client prompt text.** Client sends only `pageContext` (`page` path ≤200 + display-only fields) + `sessionMode` (Zod enum) via `chatRequestSchema`; server uses ONLY the path for its own lookup in the shared config (`buildPageContextBlock` in `server/ai/prompts.ts`). Unknown paths → one line, sanitized to `[a-zA-Z0-9/_-]` (no whitespace/newlines/# → no injection vector). Page block appended LAST in prompt for prefix caching. Pass-through: routes.ts → `runConcierge({pageSignal})` → `getConciergeReply` → `buildConciergePromptText`. Legacy payloads (no pageContext) unchanged.
- **Widget is now sitewide** (was homepage-only — moved from `Home.tsx` to `App.tsx` `GlobalConcierge`, hidden on admin routes). Page-aware greeting for default mode only (explicit modes keep intros). Split effects: mode-reset keyed `[mode]` (greeting via ref), navigation effect functional `prev.length<=1` guard — never rewrites active conversations (race-safe: onMutate pushes user msg before await).
- No changes to modelRouter/providers/auth/dashboard. Added `aria-label` to icon-only chat send button (axe fix). Verified: typecheck+build; live product-specific replies on `/apps/video-crafter`; per-page greetings on 5 pages desktop+mobile; launcher absent on `/dashboard`; architect PASS (post-fix of `/founder` deny-list bug).

## Roadmap (next phases)
- **Phase 68B** — Premium feature depth (premium concierge model routing, history recall gating)
- **Phase 69** — Voice + Video AI Integration
- **Phase 70** — Autonomous Agent Workforce

## User Preferences
- Communication style: concise, build-focused; user prefers clear progress markers and checkpoints
- Code review: run `architect` after major features (per build instructions)
- Deployment: target Render; Replit stays as dev environment
- Security: never commit `.env`; all secrets via Replit Secrets / Render env vars
