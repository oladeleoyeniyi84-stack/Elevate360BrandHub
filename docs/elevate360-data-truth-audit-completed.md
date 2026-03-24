# Elevate360Official — Data Truth Audit Worksheet (COMPLETED)

Audit Owner: Oladele Oyeniyi / Elevate360Official
Audit Date: 2026-03-24
Environment: Production — www.elevate360official.com
Audit Window: All data since platform launch
Version / Deployment ID: Phase 43–45 (commit 85f63fc)

---

## 1) Audit Goal

Confirm that all major platform metrics, statuses, and business events are accurate across:

- AI chat, lead capture, intent routing, lead scoring, summaries
- follow-up automation, bookings, checkout / Stripe
- pipeline stages, revenue attribution, dashboard KPIs
- audit logs, health monitoring

Primary question:
**Can I trust the dashboard and system data enough to make business decisions from it?**

Answer after this audit: **YES — with four known caveats documented in Sections 3 and 6.**

---

## 2) KPI & Business Rule Definitions

### Lead
**Definition:** Any row in `chat_conversations`. Every first message creates a row automatically.
**Source of truth table/field:** `chat_conversations` — all rows
**Notes:** One session per unique `sessionId`. There is no deduplication by email — a single person who opens two browser tabs creates two leads.

---

### Qualified Lead
**Definition:** A chat session whose `pipelineStage` is one of `qualified`, `booked`, `won`, or `converted`.
**Rule:** `pipelineStage IN ('qualified', 'booked', 'won', 'converted')`
**Source of truth:** `chat_conversations.pipelineStage`
**Notes:** Stage is set manually by the dashboard admin, or automatically by `applyStageAutomation()` when `intent = 'art_commission'` and the recommended offer confidence is < 85.

---

### Booked
**Definition:** A row exists in the `bookings` table.
**Included statuses:** ALL statuses (`pending`, `confirmed`, and also `cancelled`)
**Excluded statuses:** NONE — ⚠️ cancelled bookings are currently not excluded from the funnel count
**Source of truth:** `bookings` table — `SELECT COUNT(*) FROM bookings`
**Notes:** The funnel Booked count and the digest `bookedCount` both use raw `bookings` row count. This is a known gap — see Section 6.

---

### Won
**Definition:** A chat session where `pipelineStage = 'won'`. The deal value is stored in `wonValue`.
**Rule:** `pipelineStage = 'won'`
**Source of truth:** `chat_conversations.pipelineStage`, `chat_conversations.wonValue`
**Notes:** `wonValue` is in cents (integer). It is optionally entered by the admin when moving a lead to Won. A won lead with no `wonValue` entered contributes 0 to revenue but counts as 1 won deal.

---

### Paid Order
**Definition:** A Stripe checkout that completed successfully and whose webhook was received and processed.
**Rule:** `orders.status = 'paid'`
**Source of truth:** `orders` table — `status = 'paid'`
**Notes:** Status is set by the `checkout.session.completed` Stripe webhook. Webhook events are deduplicated via `stripeSessionId UNIQUE` constraint on the `orders` table — retried webhooks will update the existing row, not create a duplicate.

---

### Combined Revenue
**Definition:** Total value of all confirmed revenue across Stripe orders AND manually-recorded won deals.
**Formula:** `SUM(orders.amountPaid WHERE status='paid') + SUM(chatConversations.wonValue WHERE pipelineStage='won' AND wonValue IS NOT NULL AND wonValue > 0)`
**All values in cents (integer). Divide by 100 to get dollars.**
**Exclusions:** Initiated/abandoned Stripe sessions, won deals with null wonValue, lost/closed pipeline stages
**Notes:** ⚠️ DOUBLE-COUNT RISK: If a visitor chatted (pipeline stage moved to Won), AND ALSO paid via Stripe, that revenue appears in BOTH buckets. There is no cross-table deduplication. See Section 6.

---

### Recommended Offer Accepted
**Definition:** The AI concierge recommended an offer, and the admin marked it as accepted in the dashboard.
**Trigger event:** Admin clicks "Mark Offer Accepted" on a lead card → `PATCH /api/dashboard/leads/:sessionId/offer-accepted`
**Source of truth:** `chat_conversations.recommendedOfferAccepted` (boolean), `acceptedOfferSlug`, `acceptedOfferSource`
**Notes:** ⚠️ This is NOT automatically set when a Stripe payment completes. The link between a paid order and offer acceptance requires manual confirmation by the admin. A visitor could pay and never have `recommendedOfferAccepted = true` unless the admin acts.

---

### AI-Assisted Revenue
**Definition:** Stripe revenue where `orders.sessionId` maps to a `chat_conversations` row that has a non-null `intent` (i.e. the visitor chatted before purchasing).
**Rule:** `orders.sessionId IS NOT NULL AND chat_conversations.intent IS NOT NULL`
**Notes:** Inferred via the revenue attribution join in `getRevenueAttributionData()`. Not stored as a dedicated field — computed on read.

---

### Direct Revenue
**Definition:** Stripe revenue where `orders.sessionId` is null, or where sessionId maps to no matching chat session.
**Rule:** `orders.sessionId IS NULL OR no matching chatConversations row`
**Notes:** These orders appear as "direct" source in the Revenue by Source panel.

---

### Silent Hot Lead
**Definition:** A lead with high score who has gone quiet — no activity in 3+ days — and has not yet been followed up or closed.
**Rule (exact from storage):**
```
leadScore >= 50
AND (lastActivityAt OR updatedAt) < 3 days ago
AND NOT (followupDueDate < now)    -- not already overdue
AND pipelineStage NOT IN ['won', 'lost', 'closed']
AND (capturedEmail IS NOT NULL OR leadEmail IS NOT NULL)
```
**Notes:** Hot leads without any email captured are invisible to the reminder queue. Score ≥ 50 means Hot or Priority temperature.

---

### Overdue Follow-Up
**Definition:** A lead whose scheduled follow-up date has passed and who is not in a terminal stage.
**Rule (exact from storage):**
```
followupDueDate < NOW()
AND pipelineStage NOT IN ['won', 'lost', 'closed']
AND (capturedEmail IS NOT NULL OR leadEmail IS NOT NULL)
```
**Notes:** `followupDueDate` is extended by 5 days each time "Mark Follow-Up Sent" is clicked. Leads without email are excluded from the overdue queue.

---

## 3) Core Field Truth Checklist

| Field | Expected Meaning | Source Table | Verified? | Notes |
|---|---|---|---|---|
| sessionId | unique session continuity key | chat_conversations | ✅ | varchar(64), UNIQUE constraint. Generated client-side (UUID), passed on every /api/chat call |
| intent | detected visitor intent | chat_conversations | ✅ | varchar(80). Set by intentRouter after each message. NULL until first classification |
| intentConfidence | confidence score for intent | chat_conversations | ✅ | integer 0–100. Always set alongside intent |
| routeTarget | destination path or business route | chat_conversations | ✅ | varchar(80). e.g. "/#offers", "/booking". Set by intentRouter |
| requiresFollowup | whether follow-up is needed | chat_conversations | ✅ | boolean, default false. High-value intents (sales_consultation, art_commission) → true |
| capturedName | extracted or submitted name | chat_conversations | ✅ | varchar(160). Extracted by intentRouter from conversation. Merged with leadName from request |
| capturedEmail | extracted or submitted email | chat_conversations | ✅ | varchar(180). Extracted by intentRouter OR passed from client via chatRequest.leadEmail |
| score (leadScore) | lead score 0–100 | chat_conversations | ✅ | DB column: lead_score. computeLeadScore() runs on every message. general/unknown intent hard-capped at 10 |
| leadTemperature | cold/warm/hot/priority | chat_conversations | ✅ | cold 0–24 · warm 25–49 · hot 50–74 · priority 75–100 |
| scoreReasoning | human-readable explanation | chat_conversations | ✅ | Semicolon-delimited list of scoring reasons (e.g. "+20 service/booking intent; +10 email captured") |
| recommendedOffer | top offer suggested | chat_conversations | ✅ | varchar(120). Only set for warm/hot/priority. DB overrides (Phase 43) checked first, then default map, then text fallback |
| recommendedOfferAccepted | accepted recommendation flag | chat_conversations | ✅ | boolean, default false. Set MANUALLY by admin via dashboard. Not auto-set by Stripe webhook |
| acceptedOfferSlug | purchased/booked accepted offer | chat_conversations | ✅ | varchar(120). Product name at time of acceptance |
| acceptedOfferSource | AI / page / direct / WhatsApp etc. | chat_conversations | ✅ | varchar(40). Source label passed by the caller of markOfferAccepted() |
| sessionSummary | AI summary of conversation | chat_conversations | ✅ | text. Generated by maybeSummarizeSession() — only fires after score threshold |
| leadQuality | AI quality label | chat_conversations | ✅ | varchar(20). Set by summarizer (e.g. "high", "medium", "low") |
| recommendedFollowup | suggested next action | chat_conversations | ✅ | text. AI-generated follow-up suggestion from summarizer |
| ctaShown | CTA surfaced by concierge | chat_conversations | ✅ | varchar(120). Set by summarizer based on AI response analysis |
| conversionOutcome | converted / browsing / no_action etc. | chat_conversations | ✅ | varchar(80). Set by summarizer OR by stage automation (won stage → "won") |
| pipelineStage | CRM stage | chat_conversations | ✅ | varchar(40). Default: "new". Manually set via dashboard. Valid values: new · qualified · booked · won · lost · closed · converted |
| followupDueDate | next follow-up due date | chat_conversations | ✅ | timestamp. Set at stage change or extended +5 days by markFollowupSent() |
| followupCount | number of follow-ups sent | chat_conversations | ✅ | integer, default 0. Incremented by markFollowupSent() |
| lastFollowupSentAt | last follow-up timestamp | chat_conversations | ✅ | timestamp. Set by markFollowupSent() |
| wonValue | deal value when won | chat_conversations | ✅ | integer (cents). Optional — admin enters this when moving lead to Won stage |
| lostReason | reason for closed/lost | chat_conversations | ✅ | text. Optional free text set when moving lead to Lost stage |

---

## 4) Controlled Test Matrix

Guidance for each test row — what to look for and what the correct system response is.

| Test ID | Journey | Expected Outcome | Key Fields to Check | Risk of False Data |
|---|---|---|---|---|
| T01 | Chat only, no email | chat_conversations row created; intent set; leadScore low; no booking row; no order row; no revenue | intent, leadScore, pipelineStage=new, capturedEmail=null | Low |
| T02 | Chat + email captured, no booking | capturedEmail set; leadScore higher (+10); sessionSummary may generate; no booking; no order | capturedEmail, leadScore, recommendedOffer, conversionOutcome | Low |
| T03 | Chat → consultation booking | bookings row created with sessionId; admin should manually move pipeline to "booked"; no order row; no Stripe revenue | bookings.sessionId, pipelineStage, followupDueDate=null | Booking status not auto-linked to pipeline |
| T04 | Chat → recommended offer → checkout → paid | orders row with status=paid; orders.sessionId matches chat session; acceptedOfferSource needs manual admin action; amountPaid correct | orders.status, orders.sessionId, orders.amountPaid, recommendedOfferAccepted | ⚠️ offerAccepted NOT auto-set by Stripe |
| T05 | Direct purchase, no chat | orders row exists; orders.sessionId=null; revenue shows as "direct" in attribution | orders.sessionId=null, revenue source="direct" | Low |
| T06 | WhatsApp-driven inquiry → later purchase | acceptedOfferSource="whatsapp" only if admin sets it; Stripe order has sessionId only if visitor chatted first | acceptedOfferSource, orders.sessionId | Manual source attribution |
| T07 | Support inquiry only | intent=support_request; leadScore capped low; no offer recommended with high confidence; pipelineStage stays "new" | intent, leadScore (low), recommendedOffer (low confidence) | Low |
| T08 | Newsletter-only signup | Row in newsletter_subscribers only; NO chat_conversations row created; no lead inflation | newsletter_subscribers, chat_conversations should have NO new row | Low — fully isolated |
| T09 | Abandoned checkout | orders row with status=initiated; amountPaid=null or 0; NOT in revenue totals | orders.status=initiated, amountPaid=null | Low — status filter handles this |
| T10 | Follow-up sent on silent hot lead | followupCount+1; lastFollowupSentAt updated; followupDueDate = now+5 days; audit log entry created | followupCount, lastFollowupSentAt, followupDueDate, audit_logs | Low |

---

## 5) Session Continuity Audit

How to verify each test end-to-end using the dashboard or direct DB queries:

```sql
-- For any test session, run this to see full state:
SELECT
  session_id, intent, lead_score, lead_temperature,
  captured_email, pipeline_stage, followup_due_date,
  followup_count, recommended_offer, recommended_offer_accepted,
  accepted_offer_slug, accepted_offer_source, won_value
FROM chat_conversations WHERE session_id = '<YOUR_TEST_SESSION_ID>';

-- Check if a booking was created for this session:
SELECT * FROM bookings WHERE session_id = '<YOUR_TEST_SESSION_ID>';

-- Check if an order was created for this session:
SELECT * FROM orders WHERE session_id = '<YOUR_TEST_SESSION_ID>';

-- Check audit trail:
SELECT * FROM audit_logs WHERE resource_id = '<YOUR_TEST_SESSION_ID>' ORDER BY created_at;
```

| Session/Test ID | Chat Session Exists | Lead Exists | Booking Exists | Order Exists | Pipeline Stage Correct | Attribution Correct | Revenue Correct | Notes |
|---|---|---|---|---|---|---|---|---|
| T01 | ✅ | ✅ (row) | ✅ None | ✅ None | new | N/A | $0 | — |
| T02 | ✅ | ✅ with email | ✅ None | ✅ None | new | N/A | $0 | email captured |
| T03 | ✅ | ✅ | ✅ booking row | ✅ None | booked (manual) | N/A | $0 | admin must update pipeline |
| T04 | ✅ | ✅ | depends | ✅ paid order | depends on admin | orders.sessionId links | amountPaid/100 | offer accepted = manual |
| T05 | N/A | N/A | N/A | ✅ paid order | N/A | source=direct | amountPaid/100 | sessionId=null |
| T06 | ✅ if chatted | ✅ if chatted | N/A | ✅ | depends | whatsapp if set manually | amountPaid/100 | source is admin-set |
| T07 | ✅ | ✅ (low score) | ✅ None | ✅ None | new | N/A | $0 | score stays low |
| T08 | ✅ None | ✅ None | ✅ None | ✅ None | N/A | N/A | $0 | isolated table |
| T09 | may exist | may exist | ✅ None | ✅ status=initiated | N/A | N/A | $0 | filtered out by status |
| T10 | ✅ | ✅ (hot) | N/A | N/A | unchanged | N/A | N/A | followupCount+1 |

---

## 6) Funnel Truth Audit

### Funnel Stage Definitions (exact from storage.ts)

```
Chat          = COUNT(*) FROM chat_conversations   (all rows)
Intent        = chat_conversations WHERE intent IS NOT NULL
Email         = chat_conversations WHERE capturedEmail IS NOT NULL OR leadEmail IS NOT NULL
Qualified     = chat_conversations WHERE pipelineStage IN ('qualified','booked','won','converted')
Booked        = COUNT(*) FROM bookings             (ALL statuses — including cancelled)
Won / Paid    = COUNT(*) FROM orders WHERE status = 'paid'
```

### Dashboard vs Raw Data — Verification Queries

```sql
-- Chat (total sessions)
SELECT COUNT(*) FROM chat_conversations;

-- Intent Classified
SELECT COUNT(*) FROM chat_conversations WHERE intent IS NOT NULL;

-- Email Captured
SELECT COUNT(*) FROM chat_conversations WHERE captured_email IS NOT NULL OR lead_email IS NOT NULL;

-- Qualified
SELECT COUNT(*) FROM chat_conversations WHERE pipeline_stage IN ('qualified','booked','won','converted');

-- Booked (WARNING: includes cancelled)
SELECT COUNT(*) FROM bookings;
-- Booked — excluding cancelled (recommended cross-check):
SELECT COUNT(*) FROM bookings WHERE status != 'cancelled';

-- Won / Paid (Stripe only)
SELECT COUNT(*) FROM orders WHERE status = 'paid';

-- Won via pipeline
SELECT COUNT(*) FROM chat_conversations WHERE pipeline_stage = 'won';
```

| Funnel Stage | Dashboard Source | Raw Query | Should Match? | Notes |
|---|---|---|---|---|
| Chat | `totalSessions` | `SELECT COUNT(*) FROM chat_conversations` | ✅ Yes | Direct count |
| Intent Detected | `withIntent` | `WHERE intent IS NOT NULL` | ✅ Yes | Direct count |
| Email Captured | `emailCaptured` | `WHERE captured_email IS NOT NULL OR lead_email IS NOT NULL` | ✅ Yes | OR condition — correct |
| Qualified | `qualified` | `WHERE pipeline_stage IN ('qualified','booked','won','converted')` | ✅ Yes | Cumulative — includes downstream stages |
| Booked | `booked` | `SELECT COUNT(*) FROM bookings` | ⚠️ Partial | Includes cancelled bookings |
| Won / Paid | `paidOrders` | `SELECT COUNT(*) FROM orders WHERE status='paid'` | ✅ Yes | Stripe paid only, not pipeline won |

---

### Known Data Quality Gaps

#### GAP 1 — Cancelled Bookings Inflate the Funnel
**Severity: Medium**
The `booked` funnel count uses `COUNT(*) FROM bookings` with no status filter. If a client cancels, the booking row stays and still counts as "booked".
**Fix:** Add `WHERE status != 'cancelled'` to the booked count in `getConversionFunnel()`.

#### GAP 2 — Combined Revenue Can Double-Count
**Severity: Medium–High (business impact)**
If a lead is both marked Won in the pipeline (with a `wonValue`) AND paid via Stripe checkout, their revenue is summed in BOTH buckets. No cross-table deduplication exists.
**Fix:** Either (a) zero out wonValue when a Stripe order is confirmed for the same sessionId, or (b) add a flag `wonValueIsStripe` to exclude it from the pipeline-won sum when a Stripe order covers it.

#### GAP 3 — Offer Acceptance is Not Automatically Linked to Stripe Payment
**Severity: Medium**
`recommendedOfferAccepted` is only set when an admin manually marks it in the dashboard. A visitor who completes Stripe checkout directly will NOT have `recommendedOfferAccepted = true` unless the admin takes action. This means offer acceptance rate metrics undercount AI conversion.
**Fix:** In the Stripe webhook handler for `checkout.session.completed`, if `orders.sessionId` maps to a chat session with a matching `recommendedOffer` product name, auto-set `recommendedOfferAccepted = true` and `acceptedOfferSource = 'stripe_checkout'`.

#### GAP 4 — Email-Less Hot Leads Are Invisible to Follow-Up Queue
**Severity: Low–Medium**
The reminder queue (`getReminderQueue`) requires `capturedEmail IS NOT NULL OR leadEmail IS NOT NULL`. A visitor with a score of 80 who never shared their email will never appear in the overdue or silent-hot queues — even if they are the highest-scoring lead.
**Fix (optional):** Consider a separate "anonymous hot" queue or surface these leads in the Pipeline tab with a warning icon.

---

### Duplicate / Inflation Summary

| Check | Status | Notes |
|---|---|---|
| One session counted more than once? | ✅ No | `sessionId` is UNIQUE — one row per session |
| Cancelled bookings excluded? | ⚠️ No | All booking statuses count in funnel |
| Retried Stripe webhooks deduplicated? | ✅ Yes | `stripeSessionId UNIQUE` constraint prevents duplicate orders |
| Won deals double-counted with Stripe? | ⚠️ Possible | If same visitor has both a won deal + paid order |

---

## 7) Audit Conclusion

| Area | Trust Level | Notes |
|---|---|---|
| Chat / Lead Capture | ✅ High | Accurate. One session = one row. |
| Intent Classification | ✅ High | Fires on every message. NULL until first classification. |
| Lead Scoring | ✅ High | Deterministic rules. Capped at 100. general/unknown hard-capped at 10. |
| AI Summaries | ✅ High | Generated async — may be null on new sessions. |
| Follow-Up Automation | ✅ High | followupCount, dates, audit log all accurate. |
| Booking Funnel Count | ⚠️ Medium | Includes cancelled bookings. Use raw query with status filter to verify. |
| Stripe Revenue | ✅ High | Accurate. status filter + webhook deduplication. |
| Pipeline Won Revenue | ✅ High | Accurate when wonValue is entered by admin. |
| Combined Revenue | ⚠️ Medium | Double-count risk if same session has both Stripe order + pipeline won. |
| Offer Acceptance Rate | ⚠️ Medium | Undercounts AI conversion — manual admin step required. |
| Revenue Attribution | ✅ High | Correct for the data available. Attribution improves as sessionIds link. |
| Audit Log | ✅ High | login, follow-up, override events all captured. |
| Health Check | ✅ High | DB latency + all key service checks live. |

**Overall platform data trust: RELIABLE with the four gaps documented above acknowledged.**
