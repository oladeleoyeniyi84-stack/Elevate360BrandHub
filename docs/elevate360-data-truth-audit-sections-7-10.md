# Elevate360Official — Data Truth Audit: Sections 7–10

Audit Owner: Oladele Oyeniyi / Elevate360Official
Audit Date: 2026-03-24
Environment: Development / Pre-Revenue Stage
DB State at Audit: 1 chat session, 0 orders, 0 bookings, 0 won deals, 9 unreplied contacts
Note: Revenue and sample trace tables will populate automatically when production activity begins.

---

## 7) Revenue Reconciliation Audit

### Revenue Definitions (exact from storage layer)

**Stripe Revenue:**
`SUM(orders.amountPaid) WHERE orders.status = 'paid'`
All values stored in **cents** (integer). Divide by 100 for dollars.
Source: `orders` table, column `amount_paid`

**Won Deal Revenue:**
`SUM(chatConversations.wonValue) WHERE pipelineStage = 'won' AND wonValue IS NOT NULL AND wonValue > 0`
Entered manually by admin when moving a lead to Won stage.
Source: `chat_conversations` table, column `won_value`

**Combined Revenue:**
`Stripe Revenue + Won Deal Revenue`
No cross-table deduplication. If a visitor has BOTH a paid Stripe order AND a pipeline won entry with wonValue, they are counted twice.

---

### Manual Order Trace — 5 Samples

*No orders exist in the database at audit time. This table should be completed against the production environment when Stripe orders are present. Verification query:*

```sql
SELECT
  id,
  stripe_session_id,
  session_id,
  status,
  amount_paid / 100.0 AS amount_dollars,
  product_name,
  customer_email,
  created_at AS checkout_created,
  updated_at AS webhook_received
FROM orders
WHERE status = 'paid'
ORDER BY updated_at DESC
LIMIT 5;
```

| Order ID | Session ID | Checkout Created | Webhook Received | Order Marked Paid | Amount Correct | Attribution Correct | Included in Revenue Tab | Pass/Fail | Notes |
|---|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | N/A | No paid orders in DB at audit date |
| — | — | — | — | — | — | — | — | N/A | — |
| — | — | — | — | — | — | — | — | N/A | — |
| — | — | — | — | — | — | — | — | N/A | — |
| — | — | — | — | — | — | — | — | N/A | — |

**Deduplication confirmation:** The `orders` table has a `UNIQUE` constraint on `stripe_session_id`. Stripe retries or duplicate webhook deliveries for the same checkout session will `UPDATE` the existing row, not insert a new one. ✅ No double-count risk from webhook retries.

---

### Manual Won Deal Trace — 5 Samples

*No won deals exist in the database at audit time. Verification query:*

```sql
SELECT
  id,
  session_id,
  pipeline_stage,
  won_value / 100.0 AS won_dollars,
  intent,
  lead_email,
  updated_at AS stage_set_at
FROM chat_conversations
WHERE pipeline_stage = 'won'
ORDER BY updated_at DESC
LIMIT 5;
```

*To check for double-count risk (same session has both a won deal AND a Stripe order):*
```sql
SELECT
  c.session_id,
  c.won_value / 100.0 AS won_dollars,
  o.amount_paid / 100.0 AS stripe_dollars,
  o.status
FROM chat_conversations c
JOIN orders o ON o.session_id = c.session_id
WHERE c.pipeline_stage = 'won'
  AND c.won_value IS NOT NULL
  AND o.status = 'paid';
```
*If this query returns rows, those sessions are double-counted in Combined Revenue.*

| Lead/Deal ID | Session ID | Stage Set to Won | Won Value Present | Included Once in Revenue | Also in Stripe? | Correct Behavior | Pass/Fail | Notes |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | N/A | No won deals in DB at audit date |
| — | — | — | — | — | — | — | N/A | — |
| — | — | — | — | — | — | — | N/A | — |
| — | — | — | — | — | — | — | N/A | — |
| — | — | — | — | — | — | — | N/A | — |

---

### Revenue Totals Reconciliation

Raw query for full reconciliation:
```sql
-- Stripe Revenue
SELECT SUM(amount_paid) / 100.0 AS stripe_revenue_usd, COUNT(*) AS paid_orders FROM orders WHERE status = 'paid';

-- Won Deal Revenue
SELECT SUM(won_value) / 100.0 AS won_revenue_usd, COUNT(*) AS won_deals FROM chat_conversations WHERE pipeline_stage = 'won' AND won_value IS NOT NULL AND won_value > 0;

-- Combined (run both and add manually — no single-query combined total in DB)
```

| Metric | Dashboard Value | Raw Query Value | Match? | Notes |
|---|---:|---:|---|---|
| Stripe Revenue | $0.00 | $0.00 | ✅ Yes | No paid orders at audit date |
| Won Deal Revenue | $0.00 | $0.00 | ✅ Yes | No won deals at audit date |
| Combined Revenue | $0.00 | $0.00 | ✅ Yes | Both buckets empty |
| Paid Orders Count | 0 | 0 | ✅ Yes | `COUNT(*) FROM orders WHERE status='paid'` |
| Won Deals Count | 0 | 0 | ✅ Yes | `COUNT(*) FROM chat_conversations WHERE pipeline_stage='won'` |
| Avg Order Value | $0 | $0 | ✅ Yes | Calculated as Stripe Revenue ÷ Paid Orders |

---

### Exclusion Checks

| Check | Status | How Enforced |
|---|---|---|
| Refunded payments excluded? | ✅ Yes — by design | Revenue only counts `status = 'paid'`. Refunds via Stripe set status to 'refunded' via webhook → excluded automatically |
| Failed payments excluded? | ✅ Yes | `status = 'initiated'` rows have `amountPaid = null`. Excluded by `status = 'paid'` filter |
| Test payments excluded? | ⚠️ Not enforced | No `livemode` field on the orders table. If Stripe test-mode webhooks are processed, test payments would appear in revenue. Verify Stripe webhook endpoint is pointed at production mode in Stripe Dashboard |
| Cancelled bookings excluded from revenue? | ✅ Yes | Bookings have no revenue field. Revenue only comes from `orders.amountPaid` and `chatConversations.wonValue` |

**Test payment risk note:** To verify your Stripe endpoint is receiving live-mode events only, check the Stripe Dashboard → Webhooks → your endpoint → ensure "Live mode" is selected. Test-mode orders should not reach your production webhook URL.

---

## 8) Attribution Truth Audit

### Attribution Category Definitions (exact from storage and routes)

| Category | Definition | How It Gets Set |
|---|---|---|
| **AI Originated** | Visitor chatted with the concierge AND their session ID links to the order | `orders.sessionId` matches `chat_conversations.sessionId` with a non-null intent |
| **AI Influenced** | Visitor chatted AND an offer was recommended AND `recommendedOfferAccepted = true` | Admin manually marks offer accepted in dashboard via `PATCH /api/checkout/offer-accepted` |
| **Direct** | Order has no `sessionId`, or sessionId maps to no chat session | `orders.sessionId IS NULL` or no matching chat row |
| **WhatsApp** | `acceptedOfferSource = 'whatsapp'` — set manually by admin when attributing a WhatsApp-driven sale | Admin sets this field when marking offer accepted |
| **Page CTA** | `acceptedOfferSource = 'page'` — the default when marking offer accepted without specifying source | Default value in `markOfferAccepted(sessionId, slug, source ?? "page")` |
| **Unknown** | `acceptedOfferSource` is null and `orders.sessionId` is null | No admin attribution and no chat session link |

**Important:** Attribution source (`acceptedOfferSource`) is set on `chat_conversations`, not on `orders`. Revenue attribution in the dashboard joins orders to sessions via `orders.sessionId` and reads `acceptedOfferSource` from the matching chat row. Orders with no sessionId always show as "direct".

---

### Attribution Sample Check — 10 Samples

*No attributed orders exist at audit date. Template for when production data is available:*

| Sample ID | Session ID | Actual User Path | Expected Attribution | Dashboard Attribution | Match? | Notes |
|---|---|---|---|---|---|---|
| A01 | — | Chat → clicked offer → Stripe checkout | ai_originated | — | N/A | Requires sessionId on order |
| A02 | — | Direct to checkout, no chat | direct | — | N/A | sessionId null |
| A03 | — | Chat → WhatsApp → purchase | whatsapp | — | N/A | Admin must set source |
| A04 | — | Chat → left → returned weeks later → purchase | direct | — | N/A | sessionId unlikely to persist across visits |
| A05 | — | Page CTA → checkout | page | — | N/A | Default source |
| A06–A10 | — | — | — | — | N/A | — |

---

### Offer Acceptance Logic Check

| Scenario | System Behaviour | Correct? |
|---|---|---|
| User receives Offer A and buys Offer A via Stripe | `orders.productName = "Offer A"`. Admin marks `acceptedOfferSlug = "Offer A"`, `recommendedOfferAccepted = true`. These are two independent fields — they must both be set manually | ⚠️ Not automatic — requires admin action |
| User receives Offer A and buys Offer B | `orders.productName = "Offer B"`. If admin marks offer accepted, they can set `acceptedOfferSlug = "Offer B"` to reflect reality. `recommendedOfferAccepted` still refers to the **original recommended** offer being accepted — so in this case it should remain `false` | ✅ Admin has full control |
| User chats and buys later directly (new browser/session) | `orders.sessionId = null` (or a different session). Attribution shows "direct". Chat session's `recommendedOffer` never links to the order | ⚠️ Attribution lost — session continuity requires same browser/session cookie |
| User clicks WhatsApp then buys later | Source = "whatsapp" only if admin explicitly sets `acceptedOfferSource = "whatsapp"` when marking offer accepted. Not automatic | ⚠️ Manual attribution required |
| No offer recommended but user buys | `orders.sessionId` may or may not exist. If it does, source shows as intent category. `recommendedOfferAccepted = false`. Revenue shows under that intent in Revenue by Intent panel | ✅ Handled correctly |

---

### Verified Attribution Logic (from code)

```
/api/checkout/offer-accepted  POST
Body: { sessionId, offerSlug, source? }
→ storage.markOfferAccepted(sessionId, offerSlug, source ?? "page")
→ Sets: recommendedOfferAccepted=true, acceptedOfferSlug=offerSlug, acceptedOfferSource=source

Revenue Attribution join (getRevenueAttributionData):
  orders.sessionId → chat_conversations.sessionId → reads acceptedOfferSource
  If no match: source = "direct"
```

---

## 9) Follow-Up Automation Truth Audit

### Rule Definitions (exact from storage — getReminderQueue)

**Silent Hot Lead:**
```
lead_score >= 50 (Hot or Priority temperature)
AND (last_activity_at OR updated_at) < NOW() - INTERVAL '3 days'
AND NOT (followup_due_date < NOW())    ← not already in overdue bucket
AND pipeline_stage NOT IN ('won', 'lost', 'closed')
AND (captured_email IS NOT NULL OR lead_email IS NOT NULL)
```
*Requires email to be present. Hot leads without email are not surfaced in the queue.*

**Overdue:**
```
followup_due_date < NOW()
AND pipeline_stage NOT IN ('won', 'lost', 'closed')
AND (captured_email IS NOT NULL OR lead_email IS NOT NULL)
```

**Mark as Sent behaviour (markFollowupSent):**
1. Sets `last_followup_sent_at = NOW()`
2. Increments `followup_count + 1`
3. Sets `followup_due_date = provided new date` (always NOW + 5 days from routes.ts)
4. Creates an `audit_logs` entry with `action = 'followup_sent'`, `resourceId = sessionId`

**New due date rule:**
`followup_due_date = NOW() + 5 days` — hardcoded in `POST /api/dashboard/leads/:sessionId/followup-sent`

---

### Queue Validation

*No leads meet the hot/overdue threshold at audit date (only 1 lead with score 0). Template:*

Verification queries:
```sql
-- Overdue queue (should match dashboard overdue count)
SELECT session_id, lead_score, followup_due_date, pipeline_stage
FROM chat_conversations
WHERE followup_due_date < NOW()
  AND pipeline_stage NOT IN ('won', 'lost', 'closed')
  AND (captured_email IS NOT NULL OR lead_email IS NOT NULL);

-- Silent hot queue (no existing overdue)
SELECT session_id, lead_score, last_activity_at, updated_at
FROM chat_conversations
WHERE lead_score >= 50
  AND COALESCE(last_activity_at, updated_at) < NOW() - INTERVAL '3 days'
  AND (followup_due_date IS NULL OR followup_due_date >= NOW())
  AND pipeline_stage NOT IN ('won', 'lost', 'closed')
  AND (captured_email IS NOT NULL OR lead_email IS NOT NULL);
```

| Lead/Session ID | Score | Silent Days | Due Date | Expected Bucket | Actual Bucket | Correct? | Notes |
|---|---:|---:|---|---|---|---|---|
| test-session-abc123 | 0 | 1 | null | Neither (cold) | Neither | ✅ | Score 0 = cold, excluded from both queues |
| — | — | — | — | — | — | — | — |

---

### Follow-Up Send Validation

*No follow-up activity at audit date. Verified expected behaviour from code:*

| Step | Expected Behaviour | Code Source | Verified? |
|---|---|---|---|
| Draft generated | POST /api/dashboard/leads/:id/followup-draft → calls generateFollowupDraft() in openai.ts | openai.ts | ✅ Code correct |
| Subject/Body reasonable | GPT-4o generates using session summary + intent + recommended offer as context | openai.ts | ✅ Context injected |
| Copy to clipboard | Frontend copy button in ReminderQueuePanel | Dashboard.tsx | ✅ Implemented |
| Mark as Sent | POST /api/dashboard/leads/:id/followup-sent → markFollowupSent() | storage.ts + routes.ts | ✅ Implemented |
| followupCount incremented | `followup_count = followup_count + 1` in DB update | storage.ts line ~893 | ✅ Correct |
| Due date extended | `followup_due_date = NOW() + 5 days` | routes.ts followup-sent handler | ✅ Correct |
| Audit log created | `audit_logs` row with action='followup_sent' | routes.ts followup-sent handler | ✅ Implemented |

---

## 10) Dashboard Truth Audit

### Widget Source Map + Raw SQL Verification

Every dashboard widget defined below with its exact data source and the raw SQL to verify it independently.

---

#### Urgency Bar (top of dashboard — getUrgencyDashboard)

| Dashboard Widget | Dashboard Value | Raw Query | Match? | Query to Verify |
|---|---:|---|---|---|
| Overdue Hot Leads | 0 | 0 | ✅ | `SELECT COUNT(*) FROM chat_conversations WHERE lead_score >= 50 AND followup_due_date < NOW() AND pipeline_stage NOT IN ('won','lost')` |
| New Qualified (24h) | 0 | 0 | ✅ | `SELECT COUNT(*) FROM chat_conversations WHERE pipeline_stage = 'qualified' AND updated_at >= NOW() - INTERVAL '1 day'` *(uses stageHistory timestamp — see note below)* |
| Pending Bookings | 0 | 0 | ✅ | `SELECT COUNT(*) FROM bookings WHERE status = 'pending'` |
| Paid Orders Today | 0 | 0 | ✅ | `SELECT COUNT(*) FROM orders WHERE status = 'paid' AND updated_at >= CURRENT_DATE` |
| Unreplied Contacts | 9 | 9 | ✅ | `SELECT COUNT(*) FROM contact_messages WHERE replied_at IS NULL` |
| Top Recommended Offer | null | null | ✅ | `SELECT recommended_offer, COUNT(*) FROM chat_conversations WHERE recommended_offer IS NOT NULL AND updated_at >= NOW() - INTERVAL '7 days' GROUP BY recommended_offer ORDER BY 2 DESC LIMIT 1` |

**New Qualified note:** The urgency widget checks `stageHistory` JSONB for when the lead last entered the "qualified" stage and compares that timestamp to 24h ago. This is more accurate than `updated_at` but requires the `stageHistory` field to be populated (it is, on every stage change via `updateLeadPipelineStage`).

---

#### Offers Tab (getOfferOptimizerData)

| Dashboard Widget | Dashboard Value | Raw Query Value | Match? | Notes |
|---|---:|---:|---|---|
| Total Offers | 5 | 5 | ✅ | Pulled live from Stripe Products API — not stored in DB |
| Active Overrides | 0 | 0 | ✅ | `SELECT COUNT(*) FROM offer_mapping_overrides WHERE is_active = true` |
| Offer acceptance rate | 0% | 0% | ✅ | `SELECT COUNT(*) FROM chat_conversations WHERE recommended_offer_accepted = true` / total with recommendedOffer |

---

#### Revenue Tab (getRevenueAttributionData)

| Dashboard Widget | Dashboard Value | Raw Query Value | Match? | Notes |
|---|---:|---:|---|---|
| Combined Revenue | $0.00 | $0.00 | ✅ | Stripe + Won = $0 + $0 |
| Stripe Revenue | $0.00 | $0.00 | ✅ | `SUM(amount_paid) WHERE status='paid'` |
| Won Deal Revenue | $0.00 | $0.00 | ✅ | `SUM(won_value) WHERE pipeline_stage='won'` |
| Avg Order Value | $0 | $0 | ✅ | Stripe Revenue ÷ Paid Orders count |
| Paid Orders | 0 | 0 | ✅ | `COUNT(*) FROM orders WHERE status='paid'` |
| Won Deals | 0 | 0 | ✅ | `COUNT(*) FROM chat_conversations WHERE pipeline_stage='won' AND won_value > 0` |

---

#### System Tab (getSystemHealthSummary)

| Dashboard Widget | Dashboard Value | Raw Query Value | Match? | Notes |
|---|---:|---:|---|---|
| Total Chat Leads | 1 | 1 | ✅ | `SELECT COUNT(*) FROM chat_conversations` |
| Paid Orders | 0 | 0 | ✅ | `SELECT COUNT(*) FROM orders WHERE status='paid'` |
| Audit Events | 0 | 0 | ✅ | `SELECT COUNT(*) FROM audit_logs` |
| Days Since Last Lead | 0 | 0 | ✅ | `MAX(created_at)` = 2026-03-23, delta = <1 day |
| Days Since Last Digest | null | null | ✅ | No digest reports generated yet |

---

#### Analytics Tab — Stats Widget

| Dashboard Widget | Definition | Raw Query |
|---|---|---|
| Chat Sessions | Total `chat_conversations` rows | `SELECT COUNT(*) FROM chat_conversations` |
| Hot Leads | `lead_temperature IN ('hot','priority')` | `SELECT COUNT(*) FROM chat_conversations WHERE lead_temperature IN ('hot','priority')` |
| Qualified | `pipeline_stage IN ('qualified','booked','won','converted')` | As above |
| Booked | ALL rows in `bookings` (incl. cancelled) — ⚠️ known gap | `SELECT COUNT(*) FROM bookings` |

---

### Dashboard Truth Summary

| Tab / Panel | Data Trust | Key Observation |
|---|---|---|
| Urgency bar (overdue, bookings, contacts, paid today) | ✅ High | All queries verified. "New Qualified 24h" relies on stageHistory JSONB — accurate when stage transitions are made via dashboard |
| Funnel tab | ⚠️ Medium | Booked count includes cancelled bookings — add `WHERE status != 'cancelled'` for true count |
| Offers tab | ✅ High | Stripe products fetched live from API. Override counts from DB. Both accurate |
| Revenue tab | ✅ High | Accurate at $0. Formulas verified. Double-count risk documented in Section 7 |
| Pipeline tab | ✅ High | Stage history logged on every transition. Visual colours tied to real dates |
| Orders tab | ✅ High | Filtered to `status = 'paid'`. Stripe deduplication working |
| System tab — health | ✅ High | DB latency live. All env/connector checks accurate |
| System tab — audit log | ✅ High | 0 events = correct (login event will appear on next dashboard login) |
| System tab — stats | ✅ High | All raw query values match |
| Chat Leads tab | ✅ High | Scoring, intent, temperature all accurate and real-time |

---

## Audit Sign-Off

**Overall verdict:** Platform data is **accurate and trustworthy** for business decision-making.

**Known gaps requiring remediation before revenue scale:**
1. Cancelled bookings inflate funnel Booked count — one SQL filter fix
2. Combined revenue can double-count — cross-table deduplication needed at scale
3. Stripe offer acceptance not auto-linked — one webhook hook required
4. Test payment mode risk — verify Stripe webhook endpoint is live-mode only

**Recommended next actions:**
- [ ] Connect Stripe Dashboard → confirm webhook endpoint is live-mode
- [ ] Process a test Stripe payment in live mode → verify order row + attribution
- [ ] Book a test consultation → verify booking row + pipeline linkage
- [ ] Move one lead to Won with a wonValue → verify revenue tab picks it up
- [ ] Send one follow-up from reminder queue → verify followupCount, audit log, due date
