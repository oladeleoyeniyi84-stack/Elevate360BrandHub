---
name: Stripe refund/checkout webhook accuracy
description: Pitfalls when recording revenue analytics from Stripe webhook events (refund cumulative amounts, subscription-mode checkouts)
---

**Rule 1:** `charge.refunded` delivers `amount_refunded` as a CUMULATIVE total, and newer Stripe API versions omit `charge.refunds` from the payload by default. Never record the cumulative amount keyed by the newest refund id — a second partial refund re-records the full cumulative total (over-count). Record per-refund deltas keyed by the stable `refund.id` (dedupe makes re-delivered earlier refunds no-ops); if the refunds list is absent, record the cumulative amount once keyed by `charge.id` (under-counts later partials but never over-counts).

**Rule 2:** `checkout.session.completed` fires for BOTH one-time payments and subscription signups. Any revenue recording must branch on `session.mode === "subscription"` or subscription signups get miscounted as one-time orders (inflating paid-order count and AOV).

**Why:** Both were flagged as medium accuracy bugs in the Phase 72.3 architect review (July 2026) — the naive implementations pass all happy-path tests and only corrupt data on partial refunds / subscription checkouts.

**How to apply:** Any time a webhook handler writes money amounts to analytics or reporting tables.
