---
name: Billing webhook tier validation before write
description: Why the Stripe subscription sync must validate the resolved tier before any DB write
---

# Validate the resolved tier before any DB write in subscription sync

The webhook subscription sync resolves a tier from `tierFromPriceId(priceId) ??
metadata.tier ?? "starter"`. The metadata fallback can carry an arbitrary string
(e.g. an out-of-band Stripe subscription with `metadata.tier="elite"` — there is no
elite plan; valid tiers are only free/starter/pro).

**Rule:** validate the resolved tier (`isValidTier`) BEFORE `upsertSubscription` /
`applyTier`. Unknown tier → log a warning and `return` (no write, no throw).
`applyTier` also self-guards as defense-in-depth.

**Why:** two distinct failures, both seen in Phase 68A:
1. `applyTier` did `PLANS[tier].monthlyCredits` → `TypeError` on an unknown tier →
   webhook returns 500 → Stripe retries the event forever.
2. `upsertSubscription` ran BEFORE `applyTier`, so the crash left a partial row
   (subscriptions.tier="elite") while the user stayed `free` with no credits/features.

**How to apply:** any new tier-driven write path (sync, cancellation) must gate on
`isValidTier` before persisting; the app's own `create-checkout` already rejects
non-starter/pro with 400, so invalid tiers only arrive out-of-band via Stripe.
