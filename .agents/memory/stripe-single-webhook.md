---
name: Stripe single webhook endpoint / single signing secret
description: Why this repo routes all Stripe webhook events through one endpoint
---

# Stripe webhooks: one endpoint, one signing secret

Each Stripe webhook endpoint has its OWN signing secret. This repo configures a
single `STRIPE_WEBHOOK_SECRET`, so you can only verify ONE registered endpoint.

**Rule:** never register a second webhook route (e.g. a separate `/api/billing/webhook`)
that verifies with the same shared secret — only one can be the one Stripe points at,
so the other silently never fires.

**How to apply:** route every webhook concern through the single existing
`POST /api/stripe/webhook`. New concerns (e.g. subscription billing) export a
self-filtering handler (`handleBillingEvent`) that ignores events it doesn't own,
and the single endpoint calls it after its existing block. If two genuinely separate
endpoints are ever required, add a distinct signing-secret env var per endpoint.

**Why:** discovered in Phase 68A review — a second subscription webhook endpoint
sharing the one secret would force an either/or breakage between one-time order
fulfillment and subscription sync.
