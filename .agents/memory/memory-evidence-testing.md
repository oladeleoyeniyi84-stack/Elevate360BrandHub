---
name: Memory evidence testing
description: How to produce credible RSS/leak evidence for this app; dev-mode numbers are misleading.
---

# Memory evidence testing

Rule: when proving memory boundedness, run the load test against the **production build** (`npm run build` then `PORT=5001 NODE_ENV=production SESSION_SECRET=<any> node dist/index.cjs`), not the dev workflow.

**Why:** dev mode (tsx + Vite middleware + source maps) inflates RSS ~4-5x and retains ~260MB after first-touch module loading — it looks like a leak but isn't. Prod build showed flat ~102MB RSS under the same load. The meaningful signal in either mode is the *plateau across repeated passes*, not the absolute number or the baseline→post delta (first pass always retains lazy-loaded modules).

**How to apply:** `scripts/phase69_load_test.ts` does authed repeated passes over the heaviest dashboard endpoints and samples the PIN-gated `/api/dashboard/system/memory` endpoint. Background servers started with `&` in one bash tool call die when the call returns — start server + run test + kill in a single shell invocation.

Also: prod-build `/api/health` returns 503 locally when Stripe/AI keys are absent — expected, not a boot failure; verify boot via the log, auth via `/api/dashboard/summary` with `x-dashboard-pin`.
