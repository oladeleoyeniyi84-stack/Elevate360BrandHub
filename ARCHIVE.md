# Elevate360 — Implementation Archive

Historical per-phase implementation notes. Active reference lives in `replit.md`.

---

## Phase 52 — Founder Control, Scale & Maturity Layer
- **5 new DB tables**: `user_roles`, `approval_requests`, `ai_explanations`, `system_health_snapshots`, `quarterly_strategy_reports`
- **Storage**: 15 new methods for roles, approval requests, AI explanations, health snapshots, quarterly reports, founder overview, what-changed-today
- **Services**: `server/services/permissionPolicy.ts` (RBAC: founder/admin/operator/analyst/reviewer), `server/services/explainability.ts` (AI decision logging), `server/services/maturityScoring.ts` (5-dimension platform maturity score)
- **Engines**: `server/automation/reliabilityWatchdog.ts` (6h cadence — stale jobs, rollback rate, health snapshot), `server/automation/quarterlyStrategyEngine.ts` (30d cadence — cross-platform strategy report)
- **Routes**: 14 new endpoints — `/api/founder/*` (overview, what-changed-today, approvals, maturity-score, approval-requests PATCH), `/api/admin/roles` (GET/POST/PATCH), `/api/explainability/*` (recent, entity summary), `/api/system/*` (health-summary, run-health-check, safe-mode, kill-switch), `/api/strategy/quarterly/*` (latest, all, generate)
- **Jobs**: 13 total (5 Phase 49 + 4 Phase 50 + 2 Phase 51 + 2 Phase 52)
- **Frontend**: 5 new panel components (FounderCommandPanel, ApprovalsQueuePanel, ExplainabilityPanel, SystemHealthPanel, MaturityScorePanel), new "Founder" tab in Dashboard; `client/src/types/founder.ts`
- **Controls**: Safe Mode (all policies → suggest_only), Kill Switch (all auto-apply disabled), manual Health Check, Generate Quarterly Strategy Report
- **Maturity scoring**: Job Health + Revenue Truth + Audit Health + Execution Safety + Growth Health → Overall Maturity (0–100, graded A–F)

## Phase 51 — Autonomous Execution Under Governance
- **4 new DB tables**: `execution_policies`, `applied_changes`, `execution_queue`, `rollback_events`
- **Storage**: 12 new methods for policies, queue, applied changes, rollbacks, and evaluation helpers
- **Services**: `server/services/executionPolicy.ts` (resolveExecutionDecision), `server/services/experimentEvaluator.ts` (evaluateExperimentOutcome)
- **Engines**: `server/automation/executionEngine.ts` (6h cadence), `server/automation/rollbackEngine.ts` (12h cadence)
- **Routes**: 13 new `/api/execution/*` endpoints (policies, queue, applied-changes, rollbacks, rollback/:id, apply-now, rollback-check, impact/:changeKey)
- **Governance modes**: `suggest_only`, `approval_required`, `auto_apply_safe` — controlled per area (offer, cta, links, experiment, override)
- **Rollback**: automatic if metrics degrade after 24h observation window, manual via PATCH endpoint

## Phase 50 — Growth Intelligence
- 4 jobs: source_performance/720m, funnel_leak_optimizer/720m, offer_optimizer/1440m, experiment_generator/1440m
- `GrowthExperiments` table; source performance snapshots; funnel leak analysis; offer optimization recommendations
- Dashboard Growth tab with experiment cards + source performance panel

## Phase 49 — Autonomous Operations
- 5 backend jobs: revenue_recovery/120m, content_opportunities/1440m, anomaly_engine/60m, founder_brief/10080m, monthly_strategy/43200m
- 12 auth-gated API endpoints
- `client/src/types/automation.ts`: AutomationJob, RecoveryCandidate, ContentOpportunity, AutonomousAlert, FounderBrief, MonthlyStrategy
- 4 new dashboard panels (AutomationSummaryCards, RecoveryQueueTable, ContentOpportunitiesPanel, AutonomousAlertsPanel)
- Dashboard Automation tab + run-now buttons; AuditTab extended with AutonomousAlertsPanel
- `App.tsx` RouteTracker posts visit on every nav
- CheckoutSuccess live order status card (payment + fulfillment status from `/api/orders/status?session_id=`)

## Phase 40 — CRM Pipeline
- 5 new columns on `chat_conversations`: pipelineStage, followupDueDate, wonValue, lostReason, stageHistory (jsonb)
- 7 pipeline stages: new/contacted/qualified/booked/won/nurture/closed
- Dashboard Pipeline tab with horizontal Kanban board + stage summary grid
- `PipelineLeadCard` shows intent, temp, score, summary, due-date overdue alert, won value
- `PATCH /api/dashboard/leads/:sessionId/stage` — moves stages with optional note/wonValue/lostReason/followupDueDate
- Total won value displayed in header

## Phase 39 — Weekly Intelligence Digest
- `recommended_offer` + `recommended_offer_confidence` fields added to `chat_conversations`
- `digest_reports` table stores AI narratives
- `server/ai/digestGenerator.ts` builds data + calls GPT-4o for narrative
- Stage automation rules (Qualified→suggest booking, Booked→clear overdue, Won→save value, art_commission→deposit offer)
- Recommended offer injected into concierge system prompt per-session
- Dashboard "Intelligence" tab: 6 KPI tiles, overdue follow-up alert panel, conversion rate by intent bars, "Generate Digest" button + full digest display with top intents, digest history

## Phase 38 — AI Conversation Summaries
- Auto-triggers after 6+ user messages, refreshes every 4 messages
- Generates sessionSummary, leadQuality, recommendedFollowup, ctaShown, conversionOutcome via GPT-4o-mini
- `ChatLeadRow` shows intent badge (color-coded by 12 types), ScoreBadge, summary preview, follow-up panel, outcome label
- "Mark as Converted" button → `PATCH /api/dashboard/leads/:sessionId/convert` (flips assignedStage to "converted")

## Phase 37 — Stripe Offers
- 5 Stripe products seeded: AI Brand Audit $97, Premium Content Strategy $147, 1:1 Creator Session $97, Art Commission Deposit $50, Creative Review $77
- `/api/offers` public + `/api/checkout/session` POST → Stripe checkout
- `orders` table tracks fulfillment
- `/checkout/success` page
- Dashboard Orders tab with stats + Stripe Products panel
- "Shop" nav link + Offers section on home page (`#offers`)

## Phase 36 — Consultation Funnel
- Public booking section with 5 default consultation types + modal
- `notifyNewBooking()` dual emails
- Dashboard Bookings tab with CRUD for session offerings
- Auto-stage move to "booked" on booking submission

## Phase 35 — Knowledge Base Manager
- `knowledge_documents` table: title, category, content, priority, isPublished
- 11 category types: brand_story, services, apps, books, music, art_studio, faq, pricing, collaboration, support, general
- Dashboard Knowledge tab with CRUD form, publish toggle, priority ordering
- Intent-aware retrieval (`getPublishedKnowledgeByIntent`) injects up to 8 docs into concierge system prompt via `buildConciergeSystemPrompt()`
- "Preview What AI Sees" panel shows full prompt + doc list per intent

## Phase 34 — Lead Scoring Engine
- 0–100 score, 4 temperature bands (cold/warm/hot/priority)
- Score reasoning, next-action recommendation, saved to `chat_conversations`
- Dashboard Chat Leads: temperature filter buttons (All / Priority / Hot / Warm / Cold), lead score display, intent panel, next-action display

## Phase 33 — AI Concierge Intent Router
- OpenAI-based intent classification into 12 categories
- Route target mapping, email/name extraction
- Saved to `chat_conversations`

## Phase 32 — Testimonials System
- **Schema**: `testimonials` table (id, name, handle, rating, body, product, approved, createdAt)
- **Storage**: `getTestimonials(all?)`, `createTestimonial()`, `deleteTestimonial()`, `toggleTestimonialApproval()` in `DatabaseStorage`
- **API Routes**:
  - `GET /api/testimonials` — public, approved only
  - `GET /api/dashboard/testimonials` — auth, all
  - `POST /api/dashboard/testimonials` — auth, `insertTestimonialSchema` validated
  - `PATCH /api/dashboard/testimonials/:id/toggle` — auth, toggles approved
  - `DELETE /api/dashboard/testimonials/:id` — auth, hard delete
- **Home page**: `id="reviews"` section renders only if approved testimonials exist; 3-column responsive grid
- **Dashboard "Reviews" tab**: Add Review toggle + inline form (name, handle, product select, 5-star interactive rating, textarea); list with approve toggle + delete
- Products: Bondedlove, Healthwisesupport, Video Crafter, Amazon KDP, Etsy, Music

## Phase 31 — Dashboard Digest Email
- `POST /api/dashboard/digest` (auth) — gathers all stats in parallel, derives leads from chat sessions with leadEmail, computes last-7-day counts, calls `sendDigestEmail()`
- `sendDigestEmail(stats: DigestStats)` in `server/email.ts` — sends HTML digest to `CREATOR_EMAIL` with:
  - Traffic & Engagement table (Page Views, Chat Sessions, Leads, Contact Forms, Newsletter Subscribers) with all-time totals + "+N this week" trend
  - Top 5 Clicked Products leaderboard (color-coded)
  - "Open Dashboard →" gold CTA button
- `DigestButton` component above Analytics charts: idle → Sending… → Sent! state cycle

## Phase 30 — "Work With Me" Collaboration Section
- `id="collaborate"` section in `Home.tsx`, between FAQ and Newsletter CTA
- 4 collaboration cards (2-column responsive grid):
  - Brand Partnerships (gold), Music Features & Licensing (purple), App Development Consulting (blue), Media & Speaking (green)
- Heading: "Let's Build Something Together" with gold gradient on "Together"
- CTA: "Start a Conversation" gold button → `<ContactDialog>`; sub-copy "response within 48 hours"
- Cards: scroll-reveal animation + hover lift (`-translate-y-1`)
- New icons: Handshake, Mic, TrendingUp, Zap (lucide-react)

## Phase 29 — Page View Analytics
- `page_views` table: `{ id, page, createdAt }`
- `POST /api/track/visit` — public; called once on home page mount via `useTrackPageView("home")`
- `GET /api/dashboard/visits` — auth; returns all `{ createdAt }` records
- `useTrackPageView` hook — fires once on mount, errors swallowed
- Dashboard stat row expanded to 5 cards: Page Views, Chat Sessions, Leads, Contacts, Newsletter
- Analytics tab: "Page Views — Last 30 Days" orange area chart + KPI tile

## Phase 28 — Link Click Analytics
- `click_events` table: `{ id, product, label, createdAt }`
- `POST /api/track/click` — public, fire-and-forget
- `GET /api/dashboard/clicks` — auth, aggregated `{ product, label, count }[]`
- `useTrackClick` hook — silent (errors swallowed)
- 8 tracked CTAs in `Home.tsx`: 3 apps, 1 music (Audiomack), 1 art (Etsy), 3 books (Amazon)
- Dashboard Analytics: "Link Clicks — All Time" leaderboard (gold=apps, blue=books, purple=music, green=art) + category totals

## Phase 27 — Site-wide Announcement Banner
- `client/src/components/AnnouncementBanner.tsx` — dismissible gold strip mounted in `App.tsx`
- Reads `announcementText` + `announcementUrl` from `GET /api/config/public` (env vars `ANNOUNCEMENT_TEXT`/`ANNOUNCEMENT_URL`); invisible when unset
- Positioning: `fixed top-16 z-[49]` — below 64px navbar
- Design: gold gradient strip, Megaphone icon, navy text; URL makes whole text clickable + "Learn more →"
- Dismiss: ✕ on right; state stored in sessionStorage keyed by hash of text
- Route guard: returns null on `/dashboard` and `/links`
- Server: `GET /api/config/public` includes `announcementText`, `announcementUrl`

## Phase 26 — Mobile Bottom Navigation Bar
- `client/src/components/MobileBottomNav.tsx` — fixed tab bar visible only on mobile (`md:hidden`)
- 5 tabs: Home (scrolls to top), Apps, Books, Music, Art
- Active section detection via IntersectionObserver (rootMargin `-40% 0px -55% 0px`); scroll listener resets to Home within 200px of top
- Design: frosted glass `rgba(7,11,19,0.88)` + `backdrop-filter: blur(20px)`; active tab gold + dot indicator
- iOS/Android safe area via `safe-bottom` class
- Floating button adjustments: back-to-top `bottom-20 md:bottom-6`, WhatsApp `bottom-36 md:bottom-24`

## Phase 25 — Art Commission Request Form
- `client/src/components/CommissionDialog.tsx` — 3-step dialog from Art Studio section
- Step 1: Contact Details (name + email with live validation)
- Step 2: Project Info (Project Type ×7, Art Style ×7, Budget ×6 — click-to-select tiles)
- Step 3: Description (min 10 chars) + read-only summary
- Submission: `POST /api/contact` with `[ART COMMISSION REQUEST]` prefix — no new DB table
- Success state: green checkmark + personalised thank-you; Error: inline red
- Step indicator bar with numbered circles; completed steps show gold ✓
- "Commission Custom Art" gold outline button added to Art Studio section

## Phase 24 — WhatsApp Floating Button
- `client/src/components/WhatsAppButton.tsx` — globally registered in `App.tsx`
- Reads `WHATSAPP_NUMBER` from `GET /api/config/public`; hidden if unset
- Position: `fixed bottom-24 left-4 z-[150]`
- Link: `https://wa.me/{number}?text=ENCODED_MESSAGE`
- Phone cleaning: strips all non-digits
- Tooltip bubble on hover/focus with triangular pointer
- Design: 56×56px circle, WhatsApp gradient (135° #25D366→#128C7E), green glow shadow

## Phase 23 — Scroll-Triggered Newsletter Popup
- `client/src/components/NewsletterPopup.tsx` — globally registered in `App.tsx`
- Trigger: scrolled ≥60%, then 800ms delay
- Session gating: `e360_popup_dismissed` flag — at most once per session; never on `/dashboard` or `/links`
- Dismiss: ✕, backdrop click, Escape
- Design: `lux-card` rounded-3xl, Sparkles icon, gold "Subscribe — It's Free" CTA; slides up + fades in
- Success: green ✓ "You're in!" auto-closes after 2.2s
- API: reuses `POST /api/newsletter`

## Phase 22 — FAQ / Accordion Section
- `client/src/components/FAQSection.tsx` — reusable accordion
- 10 questions across 5 topics (Brand, Apps, Books, Art, Music+Newsletter)
- 2-column grid on md+, single column on mobile
- Accordion: only one open at a time; first open by default; click to toggle
- Animation: `maxHeight` + `opacity` CSS transitions (300ms) driven by `scrollHeight` ref
- ChevronDown rotates 180° when open
- "Still have questions?" footer → ContactDialog via `#contact-trigger`
- FAQ structured data (`@type: FAQPage`) — second JSON-LD block in `client/index.html` — 9 Q&A pairs

## Phase 21 — Meet the Creator Section
- Between last book section and final CTA in `Home.tsx`
- Two-column layout (stacks on mobile): avatar/identity + story/timeline
- Avatar: 208×208 rounded-2.5rem with gold gradient monogram "OO", "✦ Verified Creator" pill
- Role chips: Entrepreneur, Author, App Developer, Visual Artist, Music Producer
- Social row: Instagram, YouTube, Etsy icon buttons
- Bio: 3 paragraphs + italic quote
- Milestone timeline: left-bordered list (2023–2026) with gold dot markers
- Mini stat row: 3 `lux-card` tiles — "3 Apps Built", "3 Books Published", "10K+ Lives Reached"

## Phase 20 — Testimonials & Social Proof Section
- Between Stats and Apps sections
- 6 testimonial cards — one per product
- Each: 5-star gold rating, blockquote, avatar circle, name + location, product badge pill
- Layout: horizontal snap-scroll on mobile (82vw cards, `.scrollbar-hide`), 3-column grid on md+
- Trust badges row: stacked avatar cluster, "10,000+ happy users", 4.9 rating, Amazon Best Seller
- `.scrollbar-hide` utility added to `client/src/index.css`

## Phase 19 — Social Share Buttons
- `client/src/components/ShareButton.tsx` — universal share component
- Mobile/Chromium: `navigator.share()` (native sheet)
- Desktop: floating dropdown with WhatsApp, X/Twitter, Copy Link
- Click-outside closes dropdown
- All clicks `stopPropagation` so parent `<a>` doesn't trigger
- Added to 3 app cards + 3 book cards; each with unique pre-written share message

## Phase 18 — Custom 404 Page
- `client/src/pages/not-found.tsx` fully replaced
- Full-screen navy branded page, ambient gold glow blob
- Gradient "404" numeral in gold (10rem/14rem) with `bg-clip-text`
- "Go to Homepage" (gold pill) + "All Links → /links" (ghost pill)
- 2×2 quick-nav grid: Mobile Apps, Publications, Music, Art Studio

## Phase 17 — Reply to Contacts from Dashboard
- Schema: `repliedAt timestamp` column added to `contact_messages`
- `sendContactReply(toName, toEmail, replyText)` in `server/email.ts`
- `replyContactMessage(id)` in storage — stamps `repliedAt = now()`
- `POST /api/dashboard/contacts/:id/reply` — auth, validates 1–5000 chars
- `ContactCard` component with inline reply textarea, Sending… loading, "✓ Replied" badge optimistic

## Phase 16 — Rich Footer
- 4-column branded footer in `Home.tsx`
- Brand column (spans 2 on mobile): logo, tagline, `/links`, 4 social buttons (Instagram, YouTube, Audiomack, Etsy)
- Explore column: smooth-scroll links to #apps, #art-studio, #music, #books + Get in Touch
- Our Apps column: Bondedlove, Healthwisesupport, Video Crafter
- Books column: 3 titles + Author Central
- Bottom bar: copyright + tagline
- Background: `#070b13`

## Phase 15 — Scroll Utilities
- `client/src/components/ScrollUtilities.tsx` — globally in `App.tsx`
- Reading progress bar: fixed `top-0`, 3px, gold→champagne gradient; 75ms throttle; `z-[60]`
- Back-to-top button: fixed `bottom-6 right-6`, 44px gold circle; fades in after 420px scroll; `prefers-reduced-motion` → `'auto'` scroll

## Phase 14 — Animated Stats Section
- `useCountUp` hook — IntersectionObserver + requestAnimationFrame; ease-out cubic; respects `prefers-reduced-motion`
- `StatCard` inline in `Home.tsx`: emoji, large animated number, label, description
- Stats: 3 Apps · 3 Books · 1 Art Studio · 4 Music Genres
- 2-col mobile / 4-col desktop; staggered reveal-scale
- Heading: "Elevate360 By The Numbers" in small caps

## Phase 13 — Cookie Consent Banner
- `client/src/components/CookieBanner.tsx` — GDPR-aware notice
- Appears 1.8s after first visit (only if no stored consent); never again once decided
- Accept All → localStorage `accepted`, GA4 opt-out disabled
- Decline / ✕ → localStorage `declined`, sets `window['ga-disable-G-5N80T0FN54'] = true`
- On every page load, stored `declined` immediately fires GA opt-out
- Design: navy card, bottom-full on mobile / bottom-right floating on ≥md
- Rendered in `App.tsx` — appears on /, /links, /dashboard

## Phase 12 — Link in Bio Page
- Route: `/links` — mobile-first
- `client/src/pages/Links.tsx` — branded link hub
- Sections: Website CTA, 3 Apps, 4 Book links + Author Central, Audiomack, Etsy, compact newsletter, Contact
- `LinkCard` component with press animation (scale-down) + highlight variant
- `NewsletterForm` `compact` prop → stacked rounded-xl
- Social row: Instagram, YouTube, Audiomack, Etsy

## Phase 11 — Mobile Navigation
- Hamburger button in nav bar (`md:hidden`), toggles `mobileMenuOpen`
- Slide-down drawer: `max-h` CSS transition, 300ms
- Links: Applications, Art Studio, Music, Publications (each with gold icon)
- Full-width "Get in Touch" button at bottom (opens ContactDialog)
- Auto-closes on scroll past 80px or any link/button click

## Phase 10 — Email Notifications
- `server/email.ts` — Resend REST API (no SDK, native fetch); branded HTML templates in gold/navy
- `RESEND_API_KEY` + `CREATOR_EMAIL=weareelevate360@gmail.com`
- 3 notification functions:
  - `notifyNewContact(name, email, message)` — fires after contact form; includes reply button
  - `notifyNewLead(sessionId, name?, email?)` — fires when concierge captures lead email
  - `notifyNewSubscriber(email)` — fires on newsletter signup; welcome to subscriber + admin alert
- All fire **after** HTTP response (non-blocking, `.catch(() => {})`)
- Graceful degradation: warns + skips if `RESEND_API_KEY` not set
- From: `onboarding@resend.dev` (verify `elevate360official.com` in Resend dashboard to upgrade)

## Phase 9 — Scroll-Reveal Animations
- `useScrollReveal` hook — IntersectionObserver, fires once at 10% visible + 60px root margin
- 4 animation classes in `client/src/index.css`: `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale`; `.in-view` triggers via JS
- Stagger via `.reveal-delay-1/2/3/4`; `prefers-reduced-motion` respected
- Applied to Apps header, 3 app cards (staggered), Art Studio L/R, Music L/R, Publications L/R, 3 featured book lux-cards, CTA heading

## Phase 8 — Audiomack Live Player
- Replaced static mock track list with live Audiomack embed
- Embed: `https://audiomack.com/embed/artist-page/elevate360music`
- iframe: rounded-3xl border, violet glow shadow; 420px height; autoplay allowed
- Label: "Streaming live · Powered by Audiomack"

## Phase 7 — PWA
- `client/public/manifest.json` — name, short_name, theme_color #F4A62A, background #0d1a2e, standalone, 3 shortcuts (Apps, Books, Music)
- `client/public/sw.js` — cache-first for static, network-first for API/dashboard, offline fallback to "/"
- `client/index.html` — manifest link, apple-touch-icon, apple-mobile-web-app meta tags
- `client/src/main.tsx` — SW registration on window load
- Install prompt: Chrome/Android auto-shows when criteria met

## Phase 4 — SEO & Structured Data
- `client/index.html` — Full JSON-LD: Organization, WebSite, SoftwareApplication ×3, Book ×3, MusicGroup, Person
- `client/public/robots.txt` — `Allow: /` with Sitemap reference
- `server/sitemap.ts` — Dynamic XML sitemap generator
- `/sitemap.xml` route — 24-hour cache header
- Enhanced meta: keywords, author, robots, theme-color, og:locale, twitter:creator

## Phase 3 (legacy) — Brand Voice Generator
- `POST /api/dashboard/generate` — session-protected, calls GPT-4o with brand voice system prompt
- 10 content types: instagram_caption, newsletter, tweet, youtube_description, product_description, book_promo, music_release, press_release, email_subject_lines, blog_intro
- `server/openai.ts` exports `getConciergeReply` (visitor chat) and `generateBrandCopy` (creator tool)

---

## AI Concierge Presence System
- Creator avatar photo in floating launcher with gold ring pulse
- `ConciergePresenceHeader` with live/always-here chip
- 6 session mode chips: Brand Strategy, AI Content, Creative Direction, App/Product, Collaboration
- Mode-aware intro messages and placeholder text
- `SessionPresenceCard` hover preview on booking cards
- Cross-sync event between consultation grid and concierge (`e360:set-concierge-mode`)
- CSS animations: e360-chip, e360-avatar-live, e360-avatar-speaking, e360Pulse, e360Float

## Design System (CSS)
- `btn-primary`: Gold filled CTA button (#F4A62A)
- `btn-secondary`: Gold outline button
- `btn-tertiary`: Gold text link
- `badge-gold`: Trust badge pill (gold border + tint)
- `safe-bottom`: iPhone Safari safe area padding
- Smooth scroll anchors: #apps, #books, #art-studio, #music, #faq, #collaborate, #offers, #reviews
- `line-clamp-3` on app descriptions with "Learn more" links
- `.scrollbar-hide` utility for horizontal snap scrolls

## Critical Fixes (April 2026)
1. **Job runner persistence**: now reads stored `nextRunAt` from DB on startup — prevents all 13 jobs from re-firing on every autoscale restart, stops `execution_queue` bloat. Added `getAutomationJob(jobKey)` to storage.
2. **Stripe sync awaited**: `syncBackfill()` now `await`ed at startup (was fire-and-forget) — ensures Stripe products are in DB before server serves traffic.
3. **Manual Stripe re-sync**: `POST /api/dashboard/stripe/sync` endpoint added.
4. **Production DB seeded**: 8 testimonials, 5 blog posts, 20 knowledge documents via API calls to production server.

## Comprehensive Test Suite (March 2026)
- 0 TypeScript errors
- 11 public endpoints all 200
- 13 auth-gated GET endpoints all 401
- 4 sensitive POST endpoints all 401 without auth
- Health check all green (DB, OpenAI, Resend, Stripe)
- Booking/contact/chat/checkout all working
- Stripe webhook registration skipped in dev (only canonical production domain)

## Session Fixes & Improvements (April 2026)
- Removed duplicate `site.webmanifest`: `client/public/` now has only `manifest.json`
- AI Concierge knowledge base seeded: 10 docs (brand, Bondedlove, Healthwisesupport, books, services, music, Etsy art, contact, founder bio, FAQ). Script: `scripts/seed-knowledge.ts`
- Fixed session key mismatch: `Home.tsx` and `CheckoutSuccess.tsx` were reading `localStorage["e360_session_id"]` (never set) instead of `sessionStorage["e360_chat_session"]`. Post-purchase offer attribution now works.
- Blog seeded: 5 published posts (Bondedlove, Healthwisesupport, One Clean Meal, Audiomack, Brand Ecosystem)
- Sitemap dynamic: `server/sitemap.ts` auto-includes published blog posts; yields 13+ URLs
