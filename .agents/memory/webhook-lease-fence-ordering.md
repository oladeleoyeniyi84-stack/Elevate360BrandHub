---
name: Webhook lease/fence/ordering pattern
description: Certified pattern for exactly-once, order-safe Stripe (or any) webhook processing under retries, crashes, and concurrency
---

Certified through 8 architect review rounds (Stripe checkout certification). The layers, each closing a distinct failure class:

1. **Event-ID lease ledger** — claim event.id via INSERT…ON CONFLICT with a fencing token; reclaim only stale (>5 min) or 'failed' rows. Duplicate → 200; in-flight → 409. Claim infra error fails CLOSED (503, retryable). Terminal success ack must be AWAITED and fenced (token match in SQL); lost lease → 409, never a 200 without a committed success.
2. **Transactional side-effects** — credit grants (or any once-per-key effect) commit the idempotency marker and the effect in ONE db.transaction. No 'processing' state; crash rolls back both.
3. **Atomic ordering-enforced upsert** — the staleness decision and the state write must be ONE conditional SQL statement (ON CONFLICT DO UPDATE … WHERE guards), never read-then-check-then-write in app code (concurrent events both pass the app check). Guards: event-time monotonic (Stripe event.created), period monotonic, cancellation terminal. Return "won"; only winners apply downstream entitlements.
4. **Same-second ties** — event.created is second-resolution, NOT a total order. Equal timestamps may only win when the write is a state no-op (identical tier+status) or terminal cancellation. Conflicting ties → reject and reconcile by retrieving the live object from the provider, stamped with retrieval time (snapshot subsumes all prior events); retrieval failure keeps committed state (fail-safe).
5. **Cross-subscription entitlement loss** — on ANY ineligible transition (deleted/canceled/unpaid/incomplete_expired), re-derive user entitlement from the newest remaining active/trialing subscription with a DIFFERENT provider id, filtered IN SQL (a later-ending past_due row must not shadow a valid active replacement). Never unconditionally downgrade to free.

**Why:** each of these was a real High finding — app-level guards race, cumulative fields double-count, second-resolution timestamps tie, and old-subscription events revoke replacement plans.
**How to apply:** any webhook-driven state sync where the provider retries, reorders, or delivers concurrently.
