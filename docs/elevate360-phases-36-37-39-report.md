# Elevate360Official — Phase Build Report
**Project:** www.elevate360official.com | Oladele Oyeniyi  
**Stack:** React + Vite + Tailwind CSS v4 + Express + PostgreSQL/Drizzle ORM  
**Report covers:** Phase 36 (Code Pack) · Phase 37 (Completion Summary) · Phase 39 (Completion Summary)

---

## PHASE 36 — Consultation Funnel & Booking System
### Status: COMPLETE ✅

### What Was Built
A full-stack consultation booking funnel that transforms the site from a portfolio into a service business — public-facing booking UI, backend management, automated email receipts, CRM integration, and a complete creator-side management dashboard.

---

### Schema Changes — `shared/schema.ts`

**New table: `consultations`**
```typescript
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull().default(60),        // minutes
  price: integer("price").notNull().default(0),               // cents
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**New table: `bookings`**
```typescript
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }),           // links to chat lead
  consultationId: integer("consultation_id"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  preferredDate: varchar("preferred_date", { length: 100 }),
  message: text("message"),
  status: varchar("status", { length: 40 }).notNull().default("pending"),
  // status values: pending | confirmed | completed | cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Zod schemas added:**
- `insertConsultationSchema` — validated insert type
- `updateConsultationSchema` — partial updates
- `insertBookingSchema` — public submission validation
- Types: `Consultation`, `InsertConsultation`, `Booking`, `InsertBooking`

---

### Storage Interface — `server/storage.ts`

**New IStorage methods:**
```typescript
// Consultations
getConsultations(activeOnly?: boolean): Promise<Consultation[]>
getConsultation(id: number): Promise<Consultation | undefined>
createConsultation(data: InsertConsultation): Promise<Consultation>
updateConsultation(id: number, data: UpdateConsultation): Promise<Consultation | undefined>
deleteConsultation(id: number): Promise<void>
toggleConsultationActive(id: number): Promise<Consultation | undefined>
seedDefaultConsultations(): Promise<void>

// Bookings
createBooking(data: InsertBooking): Promise<Booking>
getAllBookings(): Promise<(Booking & { consultationTitle?: string })[]>
updateBookingStatus(id: number, status: string): Promise<Booking | undefined>
deleteBooking(id: number): Promise<void>
```

**Default consultation seed** (5 offerings created at server startup if table is empty):

| Title | Duration | Price |
|-------|----------|-------|
| Brand Strategy Session | 60 min | $97 |
| AI Content Blueprint | 45 min | $67 |
| Creative Direction Call | 30 min | $47 |
| Product Launch Planning | 90 min | $147 |
| Collaboration Discovery | 30 min | Free |

---

### API Routes — `server/routes.ts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/consultations` | Public | Fetch active session types for the home page |
| `POST` | `/api/bookings` | Public | Submit a booking request (triggers email + CRM stage) |
| `GET` | `/api/dashboard/bookings` | Dashboard PIN | List all bookings with consultation title joined |
| `PATCH` | `/api/dashboard/bookings/:id/status` | Dashboard PIN | Update booking status |
| `DELETE` | `/api/dashboard/bookings/:id` | Dashboard PIN | Delete a booking |
| `GET` | `/api/dashboard/consultations` | Dashboard PIN | List all consultation types |
| `POST` | `/api/dashboard/consultations` | Dashboard PIN | Create new session offering |
| `PATCH` | `/api/dashboard/consultations/:id` | Dashboard PIN | Edit session details |
| `PATCH` | `/api/dashboard/consultations/:id/toggle` | Dashboard PIN | Toggle isActive |
| `DELETE` | `/api/dashboard/consultations/:id` | Dashboard PIN | Delete consultation type |

**POST `/api/bookings` logic:**
```typescript
// 1. Validate with insertBookingSchema (Zod)
// 2. Save booking to DB
// 3. Fire notifyNewBooking() — dual emails (non-blocking)
// 4. If sessionId present → auto-move pipeline stage to "booked"
//    storage.updateLeadPipelineStage(sessionId, "booked", "Booked via website")
// 5. Return { success: true, booking }
```

---

### Email Notifications — `server/email.ts`

**`notifyNewBooking(booking, consultationTitle)`** — fires two emails simultaneously:

**Email 1 — Admin notification** (to `weareelevate360@gmail.com`)
- Subject: `"New Booking Request — {ClientName}"`
- Body: client name, email, session type, preferred date, message, link to dashboard

**Email 2 — Client receipt** (to client email)
- Subject: `"Booking Received — Elevate360Official"`
- Body: confirmation that request was received, session details, 24-hour response promise, WhatsApp number for urgent contact

---

### Frontend — `client/src/pages/Home.tsx`

**Section added** at `id="book-session"`:
- `useQuery(["/api/consultations"])` fetches active offerings
- Responsive card grid: session title, duration, price badge, description
- **Booking modal** with:
  - Session type selector (pre-selected from card click)
  - Name, email, preferred date fields
  - Message textarea
  - Submit with loading state, success confirmation, error handling
- "Book a Session" nav link in desktop nav + mobile menu

---

### Dashboard Tab — `client/src/pages/Dashboard.tsx`

**`BookingsTab` component — two sub-panels:**

**Panel 1: Booking Requests**
- KPI row: Total / Pending / Confirmed / Completed counts
- Each booking card: client name + email, session type, preferred date, message preview
- Status dropdown per booking: Pending → Confirmed → Completed → Cancelled
- Delete button with confirmation state

**Panel 2: Session Offerings**
- List of all consultation types with price, duration, active toggle
- "Add New Session" collapsible form: title, description, duration, price, currency
- Edit mode per offering
- Active/inactive toggle switch

---

## PHASE 37 — Stripe Offers, Checkout & Orders
### Status: COMPLETE ✅

### Summary
Integrated Stripe to monetize the brand through 5 pre-seeded digital offers. Visitors can purchase directly from the home page, payment flows through Stripe's hosted checkout, and fulfillment is tracked in the database with webhook-verified status updates.

### What Was Built

**Infrastructure files created:**
- `server/stripeClient.ts` — singleton Stripe SDK client using `getUncachableStripeClient()` (never cached, always fresh instance per call)
- `server/webhookHandlers.ts` — `WebhookHandlers` class handling `checkout.session.completed` events
- `scripts/seed-stripe-products.ts` — one-time script to create 5 products in Stripe

**Schema: `orders` table**

| Column | Type | Description |
|--------|------|-------------|
| `stripeSessionId` | text (unique) | Stripe checkout session ID |
| `stripePaymentIntentId` | text | Payment intent for refund tracking |
| `stripeProductId` | text | Which product was purchased |
| `stripePriceId` | text | Which price tier |
| `productName` | text | Human-readable product name |
| `customerEmail` | text | Buyer's email |
| `amountPaid` | integer | Cents (e.g., 9700 = $97.00) |
| `status` | varchar | `initiated` → `paid` → `refunded` |
| `sessionId` | varchar | Links order to chat lead for attribution |

**5 Stripe Products Seeded:**

| Product | Price | Icon | Highlight |
|---------|-------|------|-----------|
| AI Brand Audit | $97 | 🔍 | Yes (Most Popular) |
| Premium Content Strategy | $147 | 📋 | No |
| 1:1 Creator Session | $97 | 🎯 | No |
| Art Commission Deposit | $50 | 🎨 | No |
| Creative Review | $77 | ✨ | No |

**API Routes added:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/offers` | Public | Fetch active Stripe products from synced DB |
| `GET` | `/api/stripe/public-key` | Public | Return Stripe publishable key |
| `POST` | `/api/checkout/session` | Public | Create Stripe Checkout session, record initiated order |
| `POST` | `/api/stripe/webhook` | Stripe signature | Mark order paid, move lead to won stage |
| `GET` | `/api/dashboard/orders` | Dashboard PIN | All orders + revenue stats |
| `GET` | `/api/dashboard/offers` | Dashboard PIN | Live Stripe products with prices |

**Checkout flow:**
1. Visitor clicks "Buy Now" on offer card
2. `POST /api/checkout/session` → creates Stripe session, saves `initiated` order
3. Redirect to Stripe hosted checkout page
4. On payment: webhook fires → order status → `paid`, lead pipeline → `won`, `wonValue` recorded
5. Success redirect to `/checkout/success?session_id=...`

**New page: `client/src/pages/CheckoutSuccess.tsx`**
- Registered at `/checkout/success` in `App.tsx`
- Green checkmark, 3-step "What happens next" guide
- Links back to home + book session

**Home.tsx additions:**
- `#offers` section with 3-column card grid
- Each card: icon, name, delivery days, description, price, "Buy Now" button
- "Shop" link in desktop nav + mobile menu
- `handleBuyNow()` → POST to `/api/checkout/session` → redirect to Stripe URL

**Dashboard "Orders" tab:**
- Revenue summary (4 stats tiles: Total, Paid, Abandoned, Revenue)
- "Order History" sub-panel: full order list with customer email, product, amount, status badge
- "Stripe Products" sub-panel: live product list from Stripe with prices, metadata, link to Stripe Dashboard

---

## PHASE 39 — Weekly Intelligence Digest
### Status: COMPLETE ✅

### Summary
Added a "business brain" layer that connects lead data, offer performance, CRM pipeline events, and AI-generated executive summaries into a unified Intelligence dashboard tab. The concierge AI now nudges each visitor toward a specific monetization offer based on real-time lead scoring signals.

### What Was Built

**Schema additions to `chat_conversations`:**
```typescript
// Phase 39 — Recommended Offer layer
recommendedOffer: varchar("recommended_offer", { length: 120 }),
recommendedOfferConfidence: integer("recommended_offer_confidence").default(0),
```

**New table: `digest_reports`**

| Column | Type | Description |
|--------|------|-------------|
| `weekStart` / `weekEnd` | timestamp | Week window for the report |
| `narrative` | text | Full GPT-4o generated executive summary |
| `topIntents` | jsonb | `[{ intent, count }]` array |
| `hotLeadsCount` | integer | Leads with score ≥ 50 this week |
| `qualifiedCount` | integer | Leads in qualified/booked/won stage |
| `bookedCount` | integer | Bookings this week |
| `wonValue` | integer | Total won revenue (cents, all time) |
| `followupsDue` | integer | Leads past their follow-up date |
| `unansweredHotLeads` | integer | Hot leads with no AI summary yet |
| `topRecommendedOffer` | text | Most-recommended offer among hot leads |
| `knowledgeBackedChats` | integer | Sessions with AI summary (knowledge used) |
| `conversionByIntent` | jsonb | `{ intent: percentage }` conversion rates |

---

### Recommended Offer Layer — `server/ai/leadScoring.ts`

`LeadScoreResult` now includes:
```typescript
recommendedOffer: string | null;
recommendedOfferConfidence: number;  // 0–100
```

**Intent → Offer mapping:**

| Intent | Recommended Offer | Base Confidence |
|--------|-------------------|-----------------|
| `art_commission` | Art Commission Deposit | 90% |
| `sales_consultation` | 1:1 Creator Session | 85% |
| `sales_service` | AI Brand Audit | 80% |
| `app_interest` | AI Brand Audit | 60% |
| `book_interest` | Premium Content Strategy | 55% |
| `music_interest` | Creative Review | 50% |
| `support_request` | 1:1 Creator Session | 40% |
| `general_brand` | AI Brand Audit | 30% |

Confidence is boosted +10 for priority leads, +5 for hot leads. Cold leads get no offer recommendation.

---

### Stage Automation Rules — `server/services/leadService.ts`

**`applyStageAutomation(sessionId, newStage, wonValue?)`** — called on every pipeline stage change:

```
Stage → "qualified"   → Set recommendedOffer = "1:1 Creator Session" (if none set)
Stage → "booked"      → Clear followupDueDate (removes overdue alert)
Stage → "won"         → Record wonValue + set conversionOutcome = "won"
Intent = art_commission → Override recommendedOffer = "Art Commission Deposit" @ 90%
```

---

### AI Concierge Integration — `server/openai.ts`

`buildConciergeSystemPrompt()` now accepts optional `recommendedOffer?: string | null`.

When set, it appends to the system prompt:
```
## Recommended Next Step for This Visitor
Based on signals from this conversation, the AI scoring system recommends 
nudging toward: [offer name].
When it feels natural, guide the conversation toward this offer at 
elevate360official.com/#offers or the booking page. Never force it.
```

The `/api/chat` route reads `conversation.recommendedOffer` and passes it to the concierge — so from message 2 onward, the AI already knows the best offer for this specific visitor.

---

### New API Routes — `server/routes.ts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dashboard/intelligence` | Dashboard PIN | 6 KPIs + overdue leads + conversion by intent |
| `POST` | `/api/digest/generate` | Dashboard PIN | Trigger GPT-4o digest generation + save |
| `GET` | `/api/digest/latest` | Dashboard PIN | Fetch most recent digest |
| `GET` | `/api/digest/all` | Dashboard PIN | Full digest history |

---

### Digest Generator — `server/ai/digestGenerator.ts`

**`buildDigestData()`** — aggregates from DB:
- Week's chat sessions, hot leads, qualified pipeline count, booked count
- All-time won value, overdue follow-ups, unanswered hot leads
- Intent distribution (top 5), recommended offer frequency among hot leads
- Knowledge-backed chat count, conversion rate per intent
- Last 5 hot lead session summaries as AI context snippets

**`generateDigestNarrative(data)`** — GPT-4o call with structured prompt:
```
Format output as:
1. Headline — one sentence capturing the week's story
2. What's Working — 2-3 bullets on strong signals
3. Where to Focus — 2-3 bullets with specific actions
4. Content Opportunity — 1 specific content/product idea
5. Your Number to Beat — one clear metric to improve next week
```

---

### Dashboard "Intelligence" Tab — `client/src/pages/Dashboard.tsx`

**New tab** (second in the dashboard, after Analytics):

**6 KPI Tiles:**

| Tile | Source | Color |
|------|--------|-------|
| Qualified in Pipeline | `qualifiedCount` | Gold |
| Booked This Week | `bookedThisWeek` | Green |
| Won This Month | `wonThisMonth` | Purple |
| Overdue Follow-ups | `overdueFollowups` | Red (if > 0) |
| Knowledge-backed Chats | `knowledgeBackedChats` | Blue |
| Top Recommended Offer | `topRecommendedOffer` | Gold (full width) |

**Overdue Follow-up Alert Panel:**
- Red-bordered block listing up to 5 overdue leads
- Per lead: name, email, intent badge (color-coded), due date
- "+ N more overdue" link to Pipeline tab if > 5

**Conversion Rate by Intent:**
- Horizontal progress bars per intent
- Shows: intent name | progress bar | won/total · percentage
- Sorted by total volume descending

**Weekly Digest Card:**
- Week window header + generated timestamp
- Stat badges: hot leads, won revenue (if > 0), overdue count
- Full AI narrative (pre-line whitespace preserved for markdown-style formatting)
- Top intents chip row with intent-color coding
- "Top offer to push" callout

**Generate button** → `POST /api/digest/generate` → auto-refreshes latest digest  
**View History** toggle → loads all past digests in summary cards

---

## Storage Methods Added (Phase 39) — `server/storage.ts`

```typescript
saveDigestReport(data): Promise<DigestReport>
getLatestDigest(): Promise<DigestReport | null>
getAllDigests(): Promise<DigestReport[]>
getDashboardIntelligence(): Promise<{
  qualifiedCount: number;
  bookedThisWeek: number;
  wonThisMonth: number;
  overdueFollowups: number;
  topRecommendedOffer: string | null;
  knowledgeBackedChats: number;
  conversionByIntent: Record<string, { total, won, rate }>;
  overdueLeads: { sessionId, leadName, leadEmail, intent, followupDueDate }[];
}>
```

---

## File Change Index (All Three Phases)

| File | Phase | Change Type |
|------|-------|-------------|
| `shared/schema.ts` | 36, 37, 39 | Added `consultations`, `bookings`, `orders`, `digest_reports` tables; added `recommendedOffer` fields to `chatConversations` |
| `server/storage.ts` | 36, 37, 39 | Added 18 new interface methods + implementations |
| `server/routes.ts` | 36, 37, 39 | Added 18 new API endpoints; wired stage automation into PATCH /stage |
| `server/email.ts` | 36 | Added `notifyNewBooking()` with dual-email HTML templates |
| `server/openai.ts` | 39 | Updated `buildConciergeSystemPrompt()` + `getConciergeReply()` to accept `recommendedOffer` |
| `server/stripeClient.ts` | 37 | Created — Stripe singleton |
| `server/webhookHandlers.ts` | 37 | Created — Stripe webhook processor |
| `server/ai/leadScoring.ts` | 39 | Updated — added `recommendedOffer` + `recommendedOfferConfidence` to output |
| `server/ai/digestGenerator.ts` | 39 | Created — full digest data builder + GPT-4o narrative generator |
| `server/services/leadService.ts` | 39 | Updated — added `applyStageAutomation()` + recommended offer save |
| `scripts/seed-stripe-products.ts` | 37 | Created — seeds 5 Stripe products |
| `client/src/App.tsx` | 37 | Added `/checkout/success` route |
| `client/src/pages/Home.tsx` | 36, 37, 39 | Added `#book-session` section, `#offers` section, "Shop" nav link |
| `client/src/pages/Dashboard.tsx` | 36, 37, 39 | Added `BookingsTab`, `OrdersTab`, `DigestTab`; added "Bookings", "Orders", "Intelligence" tabs |
| `client/src/pages/CheckoutSuccess.tsx` | 37 | Created — post-payment success page |

---

## Test Endpoints (curl examples)

```bash
# Get active consultation types
curl https://www.elevate360official.com/api/consultations

# Submit a booking
curl -X POST https://www.elevate360official.com/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test","clientEmail":"test@test.com","consultationId":1}'

# Get public offers (from Stripe)
curl https://www.elevate360official.com/api/offers

# Create checkout session
curl -X POST https://www.elevate360official.com/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_xxx","productName":"AI Brand Audit"}'
```

---

*Report generated: March 24, 2026 | Elevate360Official build log*
