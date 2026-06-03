---
name: session regenerate prod-only failures
description: Why express-session regenerate() can 500 in production while save() works, and the resilient pattern
---

# express-session `regenerate()` is the prod-only failing op for customer auth

**Symptom:** customer signup/login return HTTP 500 `{"message":"Session error"}` in
production (Render) but work in dev tsx *and* the local production bundle. `/api/auth/me`
returns null.

**Root cause isolation:** the `"Session error"` string only comes from the
`req.session.regenerate()` error branch. Founder dashboard auth works in prod and does
`req.session.dashboardAuthed = true` + `req.session.save()` WITHOUT regenerate. The ONLY
extra operation customer auth performs is `regenerate()`, which issues a
`store.destroy()` DELETE on `user_sessions` before generating a new session. That DELETE
is what fails in prod (likely DB role lacks DELETE on the session table, or prod session
table state). Not reproducible locally because dev/prod-bundle hit a healthy session table.

**Note:** connect-pg-simple v10 *does* substitute a custom `tableName` into
`createTableIfMissing` DDL (`table.sql` `replaceAll('"session"', quotedTable)`), so the
"hardcoded session table" footgun is NOT present in v10 — don't chase it.

**Resilient pattern (the fix):** keep `regenerate()` as the fixation-safe happy path, but
if it errors, log and fall back to the proven set-id + `save()` path (the same one founder
auth uses in prod). Only a final `save()` failure is fatal. See
`establishCustomerSession()` in `server/routes/customerBilling.ts`.

**Why:** a single store DELETE hiccup should never take down all auth. Degrading session-id
rotation only on the error edge is an acceptable tradeoff vs. total auth outage.

**Follow-up worth doing:** root-cause the prod session-store DELETE failure (DB grants/role)
so regenerate stays the dominant path.

**Update (final):** decision was to REMOVE `regenerate()` from customer signup/login entirely and use the direct `req.session.customerId = id` + `req.session.save()` pattern (identical to founder auth), plus `createTableIfMissing: true` on the connect-pg-simple store (tableName `user_sessions`). Net: no session-store DELETE happens during auth, so the prod-only failure cannot occur. Tradeoff: no session-id rotation on login (matches founder auth behavior).
