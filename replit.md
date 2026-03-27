# Elevate360Official Portfolio Website

## Overview
A full-stack brand portfolio website for **Elevate360Official** featuring mobile applications (Bondedlove, Healthwisesupport, Video Crafter) and Amazon KDP publications.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui components
- **Backend**: Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)

## Brand Colors
- **Gold**: Primary (`43 65% 55%`)
- **Navy Blue**: Background (`220 50% 10%`)
- **Orange**: Secondary/Accent (`30 90% 55%`)
- **Brown**: Muted tones (`30 40% 25%`)

## Key Features
- Hero section with overlapping typographic background
- Apps showcase (Bondedlove, Healthwisesupport, Video Crafter) with equal-height card grid + Screenshots Lightbox
- Elevate360 Art Studio section with presentation image + Etsy shop link
- Publications section with real Amazon book covers
- Featured book sections (Healthwise: Stay Healthy, Together: Let There Be Love, One Clean Meal)
- Contact form (dialog) - saves to PostgreSQL
- Newsletter signup - saves to PostgreSQL
- Social links: Instagram, YouTube, Etsy
- YouTube channel embed section with playlist iframe
- Product Comparison Table (6 products, 6 dimensions)
- Language toggle (English / Yoruba) using LanguageContext
- Blog system: `/blog`, `/blog/:slug` pages + Dashboard Blog tab CRUD
- Press Kit page at `/press-kit`
- AI Concierge Intent Router (Phase 33): OpenAI-based intent classification into 12 categories, route target mapping, email/name extraction, saved to `chat_conversations`
- Lead Scoring Engine (Phase 34): 0–100 score, 4 temperature bands (cold/warm/hot/priority), score reasoning, next-action recommendation, saved to `chat_conversations`
- Dashboard Chat Leads: temperature filter buttons (All / Priority / Hot / Warm / Cold), lead score display, intent panel, next-action display
- AI Conversation Summaries (Phase 38): auto-triggers after 6+ user messages, refreshes every 4 messages; generates sessionSummary, leadQuality, recommendedFollowup, ctaShown, conversionOutcome via GPT-4o-mini; ChatLeadRow shows intent badge (color-coded by 12 types), ScoreBadge, summary preview, follow-up panel, outcome label, "Mark as Converted" button that PATCH /api/dashboard/leads/:sessionId/convert and flips assignedStage to "converted"
- Knowledge Base Manager (Phase 35): `knowledge_documents` table (title, category, content, priority, isPublished); 11 category types (brand_story, services, apps, books, music, art_studio, faq, pricing, collaboration, support, general); dashboard Knowledge tab with CRUD form, publish toggle, priority ordering; intent-aware retrieval (`getPublishedKnowledgeByIntent`) injects up to 8 docs into concierge system prompt via `buildConciergeSystemPrompt()`; "Preview What AI Sees" panel shows full prompt + doc list per intent
- CRM Pipeline (Phase 40): 5 new columns on chat_conversations (pipelineStage, followupDueDate, wonValue, lostReason, stageHistory jsonb); 7 pipeline stages (new/contacted/qualified/booked/won/nurture/closed); dashboard Pipeline tab with horizontal Kanban board + stage summary grid; PipelineLeadCard shows intent, temp, score, summary, due-date overdue alert, won value; PATCH /api/dashboard/leads/:sessionId/stage moves stages with optional note/wonValue/lostReason/followupDueDate; total won value displayed in header
- Consultation Funnel (Phase 36): public booking section with 5 default consultation types + modal; `notifyNewBooking()` dual emails; Dashboard Bookings tab with CRUD for session offerings; auto-stage move to "booked" on booking submission
- Stripe Offers (Phase 37): 5 Stripe products seeded (AI Brand Audit $97, Premium Content Strategy $147, 1:1 Creator Session $97, Art Commission Deposit $50, Creative Review $77); `/api/offers` public + `/api/checkout/session` POST → Stripe checkout; `orders` table tracks fulfillment; `/checkout/success` page; Dashboard Orders tab with stats + Stripe Products panel; "Shop" nav link + Offers section on home page (#offers)
- Weekly Intelligence Digest (Phase 39): `recommended_offer` + `recommended_offer_confidence` fields added to chat_conversations; `digest_reports` table stores AI narratives; `server/ai/digestGenerator.ts` builds data + calls GPT-4o for narrative; stage automation rules (Qualified→suggest booking, Booked→clear overdue, Won→save value, art_commission→deposit offer); recommended offer injected into concierge system prompt per-session; Dashboard "Intelligence" tab with: 6 KPI tiles (Qualified, Booked This Week, Won This Month, Overdue, Knowledge-backed Chats, Top Offer), overdue follow-up alert panel, conversion rate by intent bars, "Generate Digest" button + full digest display with top intents, digest history
- Phase 49 Autonomous Operations: 5 backend jobs (revenue_recovery/120m, content_opportunities/1440m, anomaly_engine/60m, founder_brief/10080m, monthly_strategy/43200m); 12 auth-gated API endpoints; `client/src/types/automation.ts` (AutomationJob, RecoveryCandidate, ContentOpportunity, AutonomousAlert, FounderBrief, MonthlyStrategy); 4 new dashboard panel components (AutomationSummaryCards, RecoveryQueueTable, ContentOpportunitiesPanel, AutonomousAlertsPanel); Dashboard Automation tab with job cards + run-now buttons; AuditTab extended with AutonomousAlertsPanel; App.tsx RouteTracker posts visit on every nav; CheckoutSuccess live order status card (payment + fulfillment status from `/api/orders/status?session_id=`)

## Design System (CSS)
- **btn-primary**: Gold filled CTA button (#F4A62A)
- **btn-secondary**: Gold outline button
- **btn-tertiary**: Gold text link
- **badge-gold**: Trust badge pill (gold border + tint)
- **safe-bottom**: iPhone Safari safe area padding
- Smooth scroll anchors (#apps, #books, #art-studio)
- line-clamp-3 on app descriptions with "Learn more" links

## Data Models
- `contactMessages` - name, email, message, createdAt
- `newsletterSubscribers` - email (unique), subscribedAt
- `chatConversations` - sessionId (unique), messages (JSONB), leadName, leadEmail, createdAt, updatedAt

## API Routes
- `POST /api/contact` - Submit contact form
- `POST /api/newsletter` - Subscribe to newsletter
- `POST /api/chat` - AI Concierge chat (OpenAI GPT-4o, stores history in DB)
- `POST /api/dashboard/auth` - PIN-based dashboard login (session-based)
- `POST /api/dashboard/logout` - Clear dashboard session
- `GET /api/dashboard/leads` - All chat conversations (auth required)
- `GET /api/dashboard/contacts` - All contact form messages (auth required)
- `GET /api/dashboard/subscribers` - All newsletter subscribers (auth required)
- `POST /api/dashboard/generate` - Brand voice content generation via GPT-4o (auth required)

## AI Concierge
- `client/src/components/AIConcierge.tsx` - Chat widget (floating button, panel, quick prompts, lead capture form)
- `server/openai.ts` - OpenAI GPT-4o integration with full Elevate360 brand system prompt
- Sessions stored per visitor using sessionStorage; full conversation saved to PostgreSQL

## Creator Dashboard
- Private route at `/dashboard` — PIN-protected via `DASHBOARD_PIN` env var
- `client/src/pages/Dashboard.tsx` — 4 tabs: Brand Voice Generator, Chat Leads, Contacts, Newsletter
- Server sessions via `express-session` (8-hour duration)

## Brand Voice Generator (Phase 3)
- `POST /api/dashboard/generate` — session-protected, calls GPT-4o with brand voice system prompt
- 10 content types: instagram_caption, newsletter, tweet, youtube_description, product_description, book_promo, music_release, press_release, email_subject_lines, blog_intro
- `server/openai.ts` exports both `getConciergeReply` (visitor chat) and `generateBrandCopy` (creator tool)

## Testimonials System (Phase 32)
- **Schema**: `testimonials` table (`id`, `name`, `handle`, `rating`, `body`, `product`, `approved`, `createdAt`) — pushed to DB via `npm run db:push`
- **Storage**: `getTestimonials(all?)`, `createTestimonial()`, `deleteTestimonial()`, `toggleTestimonialApproval()` in `DatabaseStorage`
- **API Routes**:
  - `GET /api/testimonials` — public, returns only approved; used by home page
  - `GET /api/dashboard/testimonials` — auth, returns all (for Dashboard)
  - `POST /api/dashboard/testimonials` — auth, validated with `insertTestimonialSchema`
  - `PATCH /api/dashboard/testimonials/:id/toggle` — auth, toggles `approved`
  - `DELETE /api/dashboard/testimonials/:id` — auth, hard delete
- **Home page**: `id="reviews"` section renders only if there are approved testimonials (hidden otherwise). 3-column responsive grid with star ratings, product badges (colour-coded per product), reviewer name, handle, and review body. Fetched via `useQuery` from `/api/testimonials`.
- **Dashboard "Reviews" tab**: 6th tab added to DashboardContent with `Star` icon. Self-contained `ReviewsTab` component with:
  - "Add Review" toggle button → inline form (name, handle, product select, 5-star interactive rating, textarea)
  - List of all testimonials with approve toggle (`ToggleLeft`/`ToggleRight`) and delete (`Trash2`)
  - Query cache invalidation updates both dashboard and public site views instantly
- Products supported: Bondedlove, Healthwisesupport, Video Crafter, Amazon KDP, Etsy, Music

## Dashboard Digest Email (Phase 31)
- `POST /api/dashboard/digest` (dashboard-authenticated) — gathers all stats in parallel, derives leads from chat sessions with `leadEmail`, computes last-7-day counts, calls `sendDigestEmail()`
- `sendDigestEmail(stats: DigestStats)` added to `server/email.ts` — sends a richly formatted HTML digest to `CREATOR_EMAIL` with:
  - **Traffic & Engagement table**: Page Views, Chat Sessions, Leads, Contact Forms, Newsletter Subscribers — each shows all-time total + "+N this week" trend in colour
  - **Top 5 Clicked Products** leaderboard (colour-coded by product type: gold=app, blue=book, purple=music, green=art)
  - **"Open Dashboard →"** gold CTA button linking to live dashboard
- **DigestButton component** added above the Analytics charts in Dashboard Analytics tab:
  - Gold-tinted inbox icon + description + "Send Digest" button
  - Button cycles through states: idle → Sending… (pulsing icon) → Sent! (green checkmark)
  - Stays in sent state until re-clicked for a new send

## "Work With Me" Collaboration Section (Phase 30)
- New `id="collaborate"` section in `Home.tsx`, inserted between the FAQ section and the Newsletter CTA
- **4 collaboration cards** in a responsive 2-column grid (`sm:grid-cols-2`), each with a tinted icon badge and description:
  - **Brand Partnerships** (gold) — audience reach across apps, books, music, art
  - **Music Features & Licensing** (purple) — collab on tracks, licensing, co-creation
  - **App Development Consulting** (blue) — strategic guidance from experience building the 3 Elevate360 apps
  - **Media & Speaking** (green) — podcasts, panels, keynote talks on entrepreneurship & tech
- **Heading**: "Let's Build Something Together" with gold gradient on "Together"; "Collaborate" pill badge above
- **CTA**: "Start a Conversation" gold primary button wrapping `<ContactDialog>` — opens the existing contact form; sub-copy notes "response within 48 hours"
- Cards have scroll-reveal animation + subtle hover lift (`-translate-y-1`)
- New icons added: `Handshake`, `Mic`, `TrendingUp`, `Zap` from lucide-react

## Page View Analytics (Phase 29)
- `page_views` table in DB: `{ id, page, createdAt }` — pushed via `npm run db:push`
- `POST /api/track/visit` — public, no auth; records page name; called once on every home page mount via `useTrackPageView("home")`
- `GET /api/dashboard/visits` — dashboard-authenticated; returns all `{ createdAt }` records; frontend groups by day using existing `groupByDay()` utility
- `client/src/hooks/useTrackPageView.ts` — `useEffect`-based hook, fires once on mount, errors swallowed
- **Dashboard stat card row** expanded to 5 cards (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`): Page Views (orange), Chat Sessions (gold), Leads Captured (green), Contact Forms (purple), Newsletter (blue)
- **Analytics tab** gains a new "Page Views — Last 30 Days" orange area chart (with gradient fill) and "Page Views" KPI tile; chart shows empty state until first visit is recorded
- All-time total shown inline in the chart title as `N total`

## Link Click Analytics (Phase 28)
- `click_events` table in DB: `{ id, product, label, createdAt }` — pushed via `npm run db:push`
- `POST /api/track/click` — public, no auth; records product + label; fire-and-forget from frontend
- `GET /api/dashboard/clicks` — dashboard-authenticated; returns aggregated `{ product, label, count }[]` sorted by count desc
- `client/src/hooks/useTrackClick.ts` — `useCallback` hook that calls the tracking endpoint silently (errors swallowed)
- **8 tracked CTAs in Home.tsx**:
  - Apps: Bondedlove card, Healthwisesupport card, Video Crafter card (`product="app"`)
  - Music: "Listen on Audiomack" button (`product="music"`)
  - Art: "Visit Art Studio on Etsy" button (`product="art"`)
  - Books: "Buy on Amazon" for all 3 titles (`product="book"`)
- **Dashboard Analytics tab** — new "Link Clicks — All Time" section with a colour-coded progress bar leaderboard (gold=apps, blue=books, purple=music, green=art) and product category totals
- Empty state message shown until first clicks are recorded

## Site-wide Announcement Banner (Phase 27)
- `client/src/components/AnnouncementBanner.tsx` — dismissible gold strip mounted in `App.tsx`
- **Activation**: reads `announcementText` and `announcementUrl` from `GET /api/config/public` (env vars `ANNOUNCEMENT_TEXT` / `ANNOUNCEMENT_URL`); completely invisible when neither var is set — zero impact on the default experience
- **Positioning**: `fixed top-16 z-[49]` — sits just below the 64 px navbar, above all page content; the hero's generous `pt-56/pt-64` means it never hides real content
- **Design**: gold gradient strip (`#F4A62A → #ffcc6e → #F4A62A`), Megaphone icon, navy text; optional URL makes the whole text a clickable link with "Learn more →" label
- **Dismiss**: ✕ button on the right; dismissed state stored in `sessionStorage` keyed by a hash of the announcement text — a new message text automatically re-shows the banner even in the same session
- **Route guard**: returns `null` on `/dashboard` and `/links` — home page only
- **Server**: `GET /api/config/public` extended to include `announcementText` and `announcementUrl` fields alongside existing `whatsappNumber`
- **How to activate**: set `ANNOUNCEMENT_TEXT` env var (e.g. "New book just launched — grab it on Amazon!") and optionally `ANNOUNCEMENT_URL` to the destination link; restart the server

## Mobile Bottom Navigation Bar (Phase 26)
- `client/src/components/MobileBottomNav.tsx` — fixed tab bar visible only on mobile (`md:hidden`)
- **5 tabs**: Home (scrolls to top), Apps (`#apps`), Books (`#books`), Music (`#music`), Art (`#art-studio`)
- **Active section detection**: IntersectionObserver watches each section with a centred rootMargin (`-40% 0px -55% 0px`); scroll listener resets to Home when within 200px of the top
- **Design**: frosted glass panel (`rgba(7,11,19,0.88)` + `backdrop-filter: blur(20px)`), top border `border-white/10`; active tab renders gold icon + label (`#F4A62A`) + tiny dot indicator; inactive tabs dimmed white at 35% opacity
- **Tap behaviour**: smooth `scrollTo` with 72px nav offset for each section; "Home" tab hard-scrolls to `scrollY=0`
- **iOS/Android safe area**: `safe-bottom` class on outer `<nav>` adds padding for home indicator bar
- **Route guard**: returns `null` on `/dashboard` and `/links` — only shown on the home page
- **Floating button adjustments**: back-to-top lifted to `bottom-20 md:bottom-6` on mobile; WhatsApp button lifted to `bottom-36 md:bottom-24` — no overlap with the nav bar

## Art Commission Request Form (Phase 25)
- `client/src/components/CommissionDialog.tsx` — 3-step commission request dialog, triggered from the Art Studio section
- **Step 1 — Contact Details**: Name + email fields with live validation; Continue button disabled until both are valid
- **Step 2 — Project Info**: Click-to-select grid tiles for Project Type (7 options), Art Style (7 options), Budget Range (6 options); all required before advancing
- **Step 3 — Description**: Textarea (min 10 chars) + a read-only summary card showing selected type/style/budget
- **Submission**: POSTs to existing `/api/contact` with message prefixed `[ART COMMISSION REQUEST]` and all details formatted — no new DB table needed; appears in the Contacts tab of the Creator Dashboard clearly labelled
- **Success state**: Green checkmark, personalised thank-you with name + email shown, auto-close button
- **Error state**: Inline red message beneath the form if submission fails
- **Dismiss**: ✕ button, backdrop click, or Escape — all reset form state on close (300ms delay so animation completes)
- Step indicator bar with numbered circles + labels ("Your Details", "Project Info", "Description") — completed steps show gold ✓
- "Commission Custom Art" gold outline button added to Art Studio section alongside existing "Visit Art Studio on Etsy" CTA
- `commissionOpen` state in `Home.tsx`; dialog mounted at bottom of Home component

## WhatsApp Floating Button (Phase 24)
- `client/src/components/WhatsAppButton.tsx` — floating green WhatsApp button, globally registered in `App.tsx`
- **Activation**: reads `WHATSAPP_NUMBER` from `GET /api/config/public` (server env var) — button is completely hidden if the number is not set; safe to ship without it configured
- **Positioning**: `fixed bottom-24 left-4 z-[150]` — sits above the mobile nav safe area, left side (back-to-top is on the right — no overlap)
- **Link format**: `https://wa.me/{number}?text=ENCODED_MESSAGE` with pre-filled message "Hi Elevate360! I visited your website and would love to connect. 👋"
- **Phone cleaning**: strips all non-digit characters from env var before building URL (supports +234, spaces, dashes, etc.)
- **Tooltip bubble**: appears on hover/focus — "Chat with us on WhatsApp" — slides in from left with `animate-in`; triangular pointer arrow on the right
- **Entrance animation**: fades up 1.2s after the number is loaded — never jarring; hidden on `/dashboard` route
- **Design**: 56×56px circle, WhatsApp brand gradient (135° #25D366→#128C7E), green glow box-shadow, hover scale 110%, active scale 95%
- **Server route**: `GET /api/config/public` returns `{ whatsappNumber: string | null }` — extensible for future public config values

## Scroll-Triggered Newsletter Popup (Phase 23)
- `client/src/components/NewsletterPopup.tsx` — self-contained popup, registered globally in `App.tsx`
- **Trigger**: fires once the user has scrolled ≥60% of the page (genuine engagement signal), then waits 800ms before appearing — never jarring
- **Session gating**: stores a `e360_popup_dismissed` flag in `sessionStorage` — shows at most once per browser session; never shown on `/dashboard` or `/links` (route-checked via `useLocation`)
- **Dismiss paths**: ✕ button, backdrop click, Escape key — all set the session flag
- **Design**: `lux-card` rounded-3xl panel, Sparkles icon, headline + subtext, email input with Mail icon, gold "Subscribe — It's Free" CTA; slides up + fades in from bottom (`animate-in slide-in-from-bottom-8`)
- **Success state**: green ✓ circle, "You're in!" message, auto-closes after 2.2s — no manual dismissal needed
- **Error state**: inline red error message beneath the input field
- **API**: reuses `POST /api/newsletter` — same backend as the inline form; toast-free (feedback shown inline inside the popup)
- Escape key listener cleaned up on unmount; scroll listener removed after first threshold crossing to avoid memory leaks

## FAQ / Accordion Section (Phase 22)
- `client/src/components/FAQSection.tsx` — reusable accordion component
- **10 questions** across 5 topics: Brand/General (×2), Apps (×2), Books (×2), Art Studio (×2), Music + Newsletter (×2)
- **Layout**: 2-column grid on md+ (5 items per column), single column on mobile — no carousel needed
- **Accordion behaviour**: only one item open at a time; first item open by default; click to toggle; clicking same item closes it
- **Animation**: `maxHeight` + `opacity` CSS transitions (300 ms ease-in-out) driven by `scrollHeight` ref — no max-height guessing
- **ChevronDown** icon rotates 180° when open (300 ms CSS transition)
- Each item: `border border-white/10 rounded-2xl`, hover highlights to `border-primary/30`; question in semi-bold; answer in `text-muted-foreground`
- "Still have questions?" footer row triggers the ContactDialog via `#contact-trigger` element click
- Section anchored at `id="faq"` for smooth-scroll linking from nav/footer
- **FAQ structured data** (`@type: FAQPage`) added to `client/index.html` as a second JSON-LD block — 9 Q&A pairs eligible for Google rich results / FAQ snippets in search

## Meet the Creator Section (Phase 21)
- New section in `Home.tsx` between the last book section and the final CTA
- **Two-column layout** (stacks on mobile): left = avatar/identity, right = story + timeline
- **Avatar block**: 208×208 rounded-2.5rem card with gold gradient monogram "OO", ambient gold glow shadow, "✦ Verified Creator" pill badge
- **Role chips**: 5 `badge-gold` pills — Entrepreneur, Author, App Developer, Visual Artist, Music Producer
- **Social row**: Instagram, YouTube, Etsy icon buttons (rounded, border-hover gold)
- **Bio copy**: 3 paragraphs covering brand mission and philosophy; italic brand quote "Elevate the world, one product at a time."
- **Milestone timeline**: left-bordered list (4 entries: 2023–2026) with gold dot markers, year labels in primary uppercase, event text
- **Mini stat row**: 3 `lux-card` tiles — "3 Apps Built", "3 Books Published", "10K+ Lives Reached"
- Ambient centre-glow blob behind entire section; scroll-reveal animations (reveal-left / reveal-right)

## Testimonials & Social Proof Section (Phase 20)
- New section inserted in `Home.tsx` between the Stats and Apps sections
- **6 testimonial cards** — one per product (Bondedlove, Healthwisesupport, Healthwise book, Together book, Video Crafter, One Clean Meal)
- Each card: 5-star gold rating row, blockquote, avatar circle (initials + matching accent color), name + location, product badge pill in matching color
- **Layout**: horizontal snap-scroll on mobile (82vw cards, no visible scrollbar via `.scrollbar-hide`), 3-column CSS grid on md+ — no JS carousel needed
- **Trust badges row** at bottom: stacked avatar cluster, "10,000+ happy users", 4.9 average rating, Amazon Best Seller badge
- All cards use `reveal` + stagger delays; scroll-reveal IntersectionObserver fires them in on scroll
- `Star` icon from lucide-react used for ratings (filled gold)
- `.scrollbar-hide` utility added to `client/src/index.css` (webkit + firefox cross-browser)

## Social Share Buttons (Phase 19)
- `client/src/components/ShareButton.tsx` — universal share component
- On mobile / Chromium: invokes `navigator.share()` (native OS share sheet)
- On desktop: falls back to a floating dropdown (bottom-up, 150ms animate-in) with 3 options:
  - 💬 WhatsApp — `wa.me/?text=...` deep link
  - 𝕏 X / Twitter — `twitter.com/intent/tweet` with pre-filled text + URL
  - Copy Link — `navigator.clipboard.writeText`, shows green "Copied!" for 1.8 s then auto-closes
- Click-outside closes dropdown (document `mousedown` listener)
- All clicks stop propagation so inner share button never triggers parent `<a>` card navigation
- Added to **3 app cards** (Bondedlove, Healthwisesupport, Video Crafter) — sits beside "Open app" button
- Added to **3 book cards** (Healthwise, Together, One Clean Meal) — sits beside "Buy on Amazon" button
- Each card has a unique pre-written share message with book/app title and relevant description

## Custom 404 Page (Phase 18)
- `client/src/pages/not-found.tsx` fully replaced — removed generic gray card with developer message
- Full-screen navy branded page matching the site design system
- Ambient gold glow blob behind content
- Gradient "404" numeral in gold (10rem/14rem) with `bg-clip-text` gradient
- "This page doesn't exist" heading + friendly description
- Two CTA buttons: "Go to Homepage" (gold pill) and "All Links → /links" (ghost pill)
- 2×2 quick-nav grid: Mobile Apps, Publications, Music, Art Studio (all link back into the main page sections)
- Minimal header with logo + Home link; footer with copyright

## Reply to Contacts from Dashboard (Phase 17)
- Schema: Added `repliedAt timestamp` column to `contact_messages` table; migration applied via `npm run db:push`
- `server/email.ts`: New `sendContactReply(toName, toEmail, replyText)` — sends branded HTML reply email directly to the visitor
- `server/storage.ts`: New `replyContactMessage(id)` — stamps `repliedAt = now()` and returns updated row
- `server/routes.ts`: `POST /api/dashboard/contacts/:id/reply` — auth-guarded; validates `replyText` (1–5000 chars), sends email, marks replied
- `Dashboard.tsx`: New `ContactCard` component with:
  - Gold "Reply" pill button → expands inline textarea + Send button
  - "Sending…" loading state during mutation
  - On success: reply drawer closes, green "✓ Replied" badge appears immediately (optimistic local state)
  - `onReplied` callback triggers `contactsQuery.refetch()` to sync badge across page refreshes
  - Error message shown inline if send fails

## Rich Footer (Phase 16)
- Replaced minimal 2-element footer with a full 4-column branded footer in `Home.tsx`
- **Brand column** (spans 2 on mobile): logo, tagline "Empowering lives through technology, creativity, and words", `/links` page shortcut, 4 circular social icon buttons (Instagram, YouTube, Audiomack, Etsy)
- **Explore column**: smooth-scroll links to #apps, #art-studio, #music, #books + Get in Touch (ContactDialog)
- **Our Apps column**: Bondedlove, Healthwisesupport, Video Crafter (external links with hover ExternalLink icon)
- **Books column**: 3 book titles + Author Central page (external links)
- **Bottom bar**: copyright · "Elevate the world, one product at a time." tagline
- Background: `#070b13` (slightly deeper navy than main bg) for visual depth

## Scroll Utilities (Phase 15)
- `client/src/components/ScrollUtilities.tsx` — two UX polish elements rendered globally via `App.tsx`
- **Reading progress bar**: fixed `top-0`, 3px high, gold→champagne gradient, width = scrollY / total scroll × 100%; updates at 75ms throttle via passive scroll listener; `z-[60]` so sits above nav
- **Back-to-top button**: fixed `bottom-6 right-6`, circular 44px gold button with ArrowUp icon; fades + slides in after 420px scroll; fades + slides out when near top; hover scales 110%; active scales 95%; `prefers-reduced-motion` uses `'auto'` instead of `'smooth'` for scroll behavior

## Animated Stats Section (Phase 14)
- `client/src/hooks/useCountUp.ts` — count-up hook using IntersectionObserver + requestAnimationFrame; ease-out cubic easing; respects `prefers-reduced-motion`
- `StatCard` component inline in `Home.tsx` — emoji, large animated number, label, description
- Stats section between hero and apps: 3 Mobile Apps · 3 Books Published · 1 Art Studio · 4 Music Genres
- 2-column grid on mobile, 4-column on desktop; each card has staggered reveal-scale animation
- Section labeled "Elevate360 By The Numbers" in small caps tracking

## Cookie Consent Banner (Phase 13)
- `client/src/components/CookieBanner.tsx` — GDPR-aware cookie notice
- Appears 1.8 s after first visit (only if no stored consent); never shown again once decided
- "Accept All" → stores `accepted` in localStorage, GA4 opt-out disabled (tracking on)
- "Decline" / ✕ → stores `declined`, sets `window['ga-disable-G-5N80T0FN54'] = true` (GA4 off)
- On every page load, stored `declined` immediately fires GA opt-out before any events
- Design: navy card, bottom-full on mobile / bottom-right floating card on ≥md; gold accept button, ghost decline button; 300 ms slide-up dismiss animation
- Rendered in `App.tsx` so it appears on all routes (/, /links, /dashboard)

## Link in Bio Page (Phase 12)
- Route: `/links` — mobile-first standalone page, perfect for Instagram bio / YouTube description
- `client/src/pages/Links.tsx` — branded link hub with all Elevate360 destinations
- Sections: Website CTA (gold highlight), 3 Apps, 4 Book links + Author Central, Audiomack, Etsy, compact newsletter subscribe form, Contact
- `LinkCard` component with press animation (scale-down on tap) and highlight variant
- `SectionLabel` grouping headings with uppercase tracking
- `NewsletterForm` updated with `compact` prop → stacked layout with rounded-xl styling
- Social icons row: Instagram, YouTube, Audiomack, Etsy

## Mobile Navigation (Phase 11)
- Hamburger button added to nav bar (visible md:hidden), toggles `mobileMenuOpen` state
- Slide-down mobile drawer: smooth `max-h` CSS transition, 300ms ease-in-out
- Drawer links: Applications (→ #apps), Art Studio (→ #art-studio), Music (→ #music), Publications (→ #books) — each with a gold icon
- Full-width "Get in Touch" button at bottom of drawer (opens ContactDialog)
- Auto-closes on scroll past 80px or on any link/button click
- All links have `data-testid` attributes for testing

## Email Notifications (Phase 10)
- `server/email.ts` — Resend REST API helper (no SDK, native fetch); branded HTML email templates in gold/navy
- `RESEND_API_KEY` secret + `CREATOR_EMAIL=weareelevate360@gmail.com` env var
- 3 notification functions:
  - `notifyNewContact(name, email, message)` — fires after contact form submission; includes reply button
  - `notifyNewLead(sessionId, name?, email?)` — fires when AI concierge captures a lead email
  - `notifyNewSubscriber(email)` — fires on newsletter signup; sends welcome email to subscriber + admin alert to creator
- All notifications fire **after** the HTTP response (non-blocking, `.catch(() => {})` so errors never break the API)
- Graceful degradation: if `RESEND_API_KEY` not set, logs warning and skips silently
- From address: `onboarding@resend.dev` (Resend free default); upgrade by verifying `elevate360official.com` domain in Resend dashboard

## Scroll-Reveal Animations (Phase 9)
- `client/src/hooks/useScrollReveal.ts` — lightweight IntersectionObserver hook, fires once per element when 10% visible + 60px root margin
- `client/src/index.css` — 4 animation classes: `.reveal` (fade up), `.reveal-left` (slide right), `.reveal-right` (slide left), `.reveal-scale` (zoom in); `.in-view` triggers via JS; stagger via `.reveal-delay-1/2/3/4`; `prefers-reduced-motion` respected
- Applied to: Apps section header, 3 app cards (staggered), Art Studio left/right, Music left/right, Publications left/right, 3 featured book lux-cards (staggered scale-in), CTA heading

## Audiomack Live Player (Phase 8)
- Music section on homepage: replaced static mock track list with a live Audiomack embed player
- Embed URL: `https://audiomack.com/embed/artist-page/elevate360music`
- iframe styled with rounded-3xl border, violet glow shadow; 420px height; autoplay allowed
- "Streaming live · Powered by Audiomack" label beneath the player

## PWA — Progressive Web App (Phase 7)
- `client/public/manifest.json` — app name, short_name, theme_color (#F4A62A), background (#0d1a2e), standalone display, 3 shortcuts (Apps, Books, Music)
- `client/public/sw.js` — service worker: cache-first for static assets, network-first for API/dashboard, offline fallback to "/"
- `client/index.html` — manifest link, apple-touch-icon, apple-mobile-web-app meta tags
- `client/src/main.tsx` — service worker registration on window load
- Install prompt: Chrome/Android will show "Add to Home Screen" automatically when PWA criteria are met

## SEO & Structured Data (Phase 4)
- `client/index.html` — Full JSON-LD schema markup: Organization, WebSite, SoftwareApplication ×3, Book ×3, MusicGroup, Person
- `client/public/robots.txt` — `Allow: /` with Sitemap reference
- `server/sitemap.ts` — Dynamic XML sitemap generator with all pages and anchor sections
- `/sitemap.xml` route — serves sitemap with 24-hour cache header
- Enhanced meta: keywords, author, robots, theme-color, og:locale, twitter:creator

## Custom Domain
- Canonical host: `www.elevate360official.com` (set via `CANONICAL_HOST` env var)
- `server/canonicalRedirect.ts` middleware redirects non-canonical hosts and enforces HTTPS via 301 redirects
- Dev bypass for localhost, 127.0.0.1, and .replit.dev domains

## File Structure
- `client/src/pages/Home.tsx` - Main landing page
- `client/src/components/ContactDialog.tsx` - Contact form dialog
- `client/src/components/NewsletterForm.tsx` - Newsletter signup form
- `shared/schema.ts` - Database schema + Zod validation
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database CRUD operations
- `server/db.ts` - Database connection
- `server/canonicalRedirect.ts` - Canonical host redirect middleware

## Phase 51 — Autonomous Execution Under Governance (Complete)
- **4 new DB tables**: `execution_policies`, `applied_changes`, `execution_queue`, `rollback_events`
- **Storage**: 12 new methods for policies, queue, applied changes, rollbacks, and evaluation helpers
- **Services**: `server/services/executionPolicy.ts` (resolveExecutionDecision), `server/services/experimentEvaluator.ts` (evaluateExperimentOutcome)
- **Engines**: `server/automation/executionEngine.ts` (6h cadence), `server/automation/rollbackEngine.ts` (12h cadence)
- **Routes**: 13 new `/api/execution/*` endpoints (policies, queue, applied-changes, rollbacks, rollback/:id, apply-now, rollback-check, impact/:changeKey)
- **Jobs**: 11 total (5 Phase 49 + 4 Phase 50 + 2 Phase 51)
- **Frontend**: 4 panels (ExecutionPoliciesPanel, ExecutionQueuePanel, AppliedChangesPanel, RollbackAlertsPanel), new "execution" tab in Dashboard
- **Governance modes**: `suggest_only`, `approval_required`, `auto_apply_safe` — controlled per area (offer, cta, links, experiment, override)
- **Rollback**: automatic if metrics degrade after 24h observation window, manual via PATCH endpoint

## External Links
- Amazon Books: B0GMBNPZC9, B0G5DWG61V, B0FSDTPVJC
- Instagram: https://www.instagram.com/officialelevate360/
- YouTube: https://www.youtube.com/channel/UCDGnUhgvM__6Mw8q26H-urQ
- Etsy: https://www.etsy.com/shop/Elevate360Official
- Brand logo: @assets/Elevate360_Brand_Logo_1772418122164.png
- Art Studio image: @assets/Elevate360Art_Studio_Presentation_1772460961759.png