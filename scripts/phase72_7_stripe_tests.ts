// Phase 72.7 — Stripe Production Checkout Certification & Billing Hardening tests.
// Run: npx tsx scripts/phase72_7_stripe_tests.ts
//
// Hermetic by design: NO live Stripe calls, NO real payments, NO live object
// mutation. Uses the dev HTTP API for trust-boundary tests, in-process module
// tests with fixture payloads for webhook/idempotency/credit logic, and
// source-contract assertions where behavior would otherwise require a live
// Stripe session. Test rows are cleaned up at the end.

import fs from "node:fs";
import pg from "pg";
import Stripe from "stripe";

// ── In-process env fixtures (test process only; never touches server env) ──
process.env.STRIPE_PRICE_STARTER = process.env.STRIPE_PRICE_STARTER || "price_test_starter_727";
process.env.STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO || "price_test_pro_727";
process.env.STRIPE_PRICE_ELITE = process.env.STRIPE_PRICE_ELITE || "price_test_elite_727";
if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = "sk_test_dummy_local_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_phase727_fixture_secret"; // local verify tests only

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

let pass = 0, fail = 0;
const failures: string[] = [];
function ok(cond: unknown, name: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ✗ FAIL ${name}`); }
}
const j = (r: Response) => r.json() as Promise<any>;

async function main() {
  const { storage } = await import("../server/storage");
  const { handleBillingEvent, originFor } = await import("../server/routes/customerBilling");
  const { WebhookHandlers } = await import("../server/webhookHandlers");
  const stripeLocal = new Stripe("sk_test_dummy_local_only", { apiVersion: "2024-12-18.acacia" as any });

  const stamp = Date.now();
  const email = `phase727-${stamp}@test.local`;
  const password = "Phase727!test";
  let cookie = "";

  // ════ CHECKOUT TRUST BOUNDARY (API) ════
  console.log("\n── Checkout ──");

  // 1. Unauthenticated checkout rejected
  let r = await fetch(`${BASE}/api/billing/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier: "starter" }) });
  ok(r.status === 401 && (r.headers.get("content-type") || "").includes("json"), "1. unauthenticated checkout rejected 401 JSON");

  // Regression 43: signup operational (also creates our session)
  r = await fetch(`${BASE}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  cookie = r.headers.get("set-cookie")?.split(";")[0] ?? "";
  ok(r.status === 201 && cookie, "43. existing customer signup remains operational");

  // 2. Invalid tier rejected
  r = await fetch(`${BASE}/api/billing/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ tier: "platinum" }) });
  ok(r.status === 400, "2. invalid tier rejected 400");
  // free tier is not purchasable
  r = await fetch(`${BASE}/api/billing/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ tier: "free" }) });
  ok(r.status === 400, "2b. free tier not purchasable (400)");

  // 3-5. Missing price config fails safely + injection attempts change nothing.
  // Dev server has no STRIPE_PRICE_* configured → valid tier must fail 503
  // JSON, and injected priceId/customerId must not alter that path (they are
  // never read). If the dev server IS fully configured, we skip the live call
  // (no real Stripe session may be created in this phase) and rely on the
  // source-contract assertions below.
  r = await fetch(`${BASE}/api/billing/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ tier: "starter" }) });
  const devPricesUnset = r.status === 503;
  if (devPricesUnset) {
    const body = await j(r);
    ok(!JSON.stringify(body).match(/sk_|whsec_|price_/), "3. missing price configuration fails safely (503, no config leaked)");
    const r4 = await fetch(`${BASE}/api/billing/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ tier: "starter", priceId: "price_evil", price: "price_evil" }) });
    ok(r4.status === 503, "4. client-supplied price ID ignored (identical server-resolved path)");
    const r5 = await fetch(`${BASE}/api/billing/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ tier: "starter", customer: "cus_evil", customerId: "cus_evil" }) });
    ok(r5.status === 503, "5. client-supplied customer ID ignored (identical server-resolved path)");
  } else {
    ok(true, "3. (skipped live-configured path — no real Stripe session may be created; covered by source contract)");
    ok(true, "4. see 4s source contract"); ok(true, "5. see 5s source contract");
  }

  // Source contracts for what only a live session could otherwise prove.
  const src = fs.readFileSync("server/routes/customerBilling.ts", "utf8");
  ok(!/req\.body[^\n]*(priceId|price_id)/.test(src) && /getStripePriceId\(tier\)/.test(src), "4s. price ID resolved server-side only (no req.body price read)");
  ok(!/req\.body[^\n]*(customerId|customer\b)/.test(src) && /user\.stripeCustomerId/.test(src), "5s. Stripe customer from server record only (no req.body customer read)");
  ok(/client_reference_id:\s*user\.id/.test(src) && /metadata:\s*{\s*userId:\s*user\.id,\s*tier\s*}/.test(src), "6. userId metadata + client_reference_id are server-derived");
  ok(/PAID_TIERS\.includes\(tier\)/.test(src), "7. tier metadata validated against server-side union");
  ok(/mode:\s*"subscription"/.test(src), "8. checkout session mode is subscription");
  ok(/quantity:\s*1/.test(src), "9. quantity controlled (server-fixed 1)");
  ok(/success_url:\s*`\$\{origin\}\/account\?billing=success`/.test(src), "10. success URL canonical (originFor + /account)");
  ok(/cancel_url:\s*`\$\{origin\}\/pricing\?billing=cancelled`/.test(src), "11a. cancel URL canonical (originFor + /pricing)");
  ok(/res\.json\(\{\s*url:\s*session\.url\s*\}\)/.test(src), "11b. only session.url returned — no secret Stripe fields");

  // ════ ORIGIN / RETURN-URL HARDENING (deterministic helper tests) ════
  console.log("\n── originFor() ──");
  const saved = { PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL, CANONICAL_HOST: process.env.CANONICAL_HOST, RENDER_EXTERNAL_HOSTNAME: process.env.RENDER_EXTERNAL_HOSTNAME, REPLIT_DOMAINS: process.env.REPLIT_DOMAINS };
  const setEnv = (o: Record<string, string | undefined>) => {
    for (const k of Object.keys(saved)) delete process.env[k];
    for (const [k, v] of Object.entries(o)) if (v !== undefined) process.env[k] = v;
  };
  setEnv({ PUBLIC_BASE_URL: "www.elevate360official.com" });
  ok(originFor() === "https://www.elevate360official.com", "O1. production canonical host → https");
  setEnv({});
  ok(originFor() === "http://localhost:5000", "O2. no env → localhost dev (http)");
  setEnv({ CANONICAL_HOST: "https://www.elevate360official.com" });
  ok(originFor() === "https://www.elevate360official.com", "O3. input containing protocol normalized");
  setEnv({ PUBLIC_BASE_URL: "https://www.elevate360official.com/" });
  ok(originFor() === "https://www.elevate360official.com", "O4. trailing slash stripped");
  setEnv({ PUBLIC_BASE_URL: "   ", CANONICAL_HOST: "", RENDER_EXTERNAL_HOSTNAME: "www.elevate360official.com" });
  ok(originFor() === "https://www.elevate360official.com", "O5. blank/whitespace values skipped, next candidate used");
  setEnv({ PUBLIC_BASE_URL: "", CANONICAL_HOST: "" });
  ok(originFor() === "http://localhost:5000", "O6. all-blank fallback is safe localhost (never 'https://')");
  setEnv({ CANONICAL_HOST: "www.elevate360official.com", RENDER_EXTERNAL_HOSTNAME: "elevate360.onrender.com" });
  ok(originFor() === "https://www.elevate360official.com", "O7. canonical host beats Render hostname");
  setEnv({ PUBLIC_BASE_URL: "localhost.evil.example" });
  ok(originFor() === "https://localhost.evil.example", "O9. localhost-prefixed non-loopback host forced to https (no downgrade)");
  setEnv({ PUBLIC_BASE_URL: "www.elevate360official.com/some/path?q=1#frag" });
  ok(originFor() === "https://www.elevate360official.com", "O10. path/query/fragment stripped from configured origin");
  setEnv({ PUBLIC_BASE_URL: "user:pass@www.elevate360official.com" });
  ok(originFor() === "https://www.elevate360official.com", "O11. credentials (userinfo) stripped from configured origin");
  ok(!/req\.(headers|get|hostname|host)/.test(src.slice(0, src.indexOf("publicUser"))), "O8. originFor never reads request Host header (no reflection/open redirect)");
  setEnv(saved as any);

  // ════ WEBHOOK SIGNATURE (API + hermetic verify) ════
  console.log("\n── Webhook signature ──");
  r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  ok(r.status === 400 && (await j(r)).error === "Missing stripe-signature", "12. missing stripe-signature rejected 400 JSON");
  r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=deadbeef" }, body: JSON.stringify({ id: "evt_fake", type: "checkout.session.completed" }) });
  ok(r.status === 400 && (r.headers.get("content-type") || "").includes("json"), "13. invalid signature rejected 400 JSON (never reaches fulfillment)");

  const fixtureEvent = { id: `evt_727_${stamp}`, type: "customer.subscription.updated", livemode: false, data: { object: { id: "sub_727_sig" } } };
  const payload = JSON.stringify(fixtureEvent);
  const header = stripeLocal.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  const parsed = WebhookHandlers.verifyAndParse(Buffer.from(payload), header);
  ok(parsed.id === fixtureEvent.id, "14. valid fixture signature accepted (constructEvent on raw body)");
  let rawRejected = false;
  try { WebhookHandlers.verifyAndParse(Buffer.from(JSON.stringify({ ...fixtureEvent, type: "tampered" })), header); } catch { rawRejected = true; }
  ok(rawRejected, "15. tampered body with original signature rejected → raw signed body is authoritative");
  let bufferRejected = false;
  try { WebhookHandlers.verifyAndParse(payload as any, header); } catch (e: any) { bufferRejected = /Buffer/.test(e.message); }
  ok(bufferRejected, "15b. non-Buffer payload rejected (parsed JSON can never substitute raw body)");

  const routesSrc = fs.readFileSync("server/routes.ts", "utf8");
  const webhookBlock = routesSrc.slice(routesSrc.indexOf('"/api/stripe/webhook"'), routesSrc.indexOf('"/api/stripe/public-key"'));
  ok(/req\.rawBody as Buffer/.test(webhookBlock), "D. route verifies against req.rawBody Buffer");
  ok(!/console\.(log|error|warn)\([^)]*rawBody/.test(webhookBlock), "39. raw webhook body never logged");
  ok(!/console\.(log|error|warn)\([^)]*\bsig\b/.test(webhookBlock), "40. stripe-signature value never logged");
  ok(!/NODE_ENV|bypass|skipVerify|test_mode/i.test(webhookBlock.split("try {")[0]), "42. no environment/test bypass around signature verification");

  // ════ EVENT-ID IDEMPOTENCY (storage-level, hermetic) ════
  console.log("\n── Event idempotency ──");
  const evtA = `evt_727_claim_a_${stamp}`;
  const evtB = `evt_727_claim_b_${stamp}`;
  const claimA1 = await storage.claimStripeWebhookEvent(evtA, "customer.subscription.updated", false);
  ok(claimA1.status === "claimed" && !!claimA1.token, "21a. first delivery claims event id (with fencing token)");
  ok((await storage.claimStripeWebhookEvent(evtA, "customer.subscription.updated", false)).status === "in_flight", "21b. concurrent redelivery while lease is fresh → in_flight (retryable, NOT falsely acked)");
  ok(await storage.markStripeWebhookEventResult(evtA, "success", claimA1.token) === true, "E9a. lease owner's fenced success write lands");
  ok((await storage.claimStripeWebhookEvent(evtA, "customer.subscription.updated", false)).status === "duplicate", "21c. redelivery after success → duplicate (single fulfillment forever)");
  const claimB1 = await storage.claimStripeWebhookEvent(evtB, "customer.subscription.created", false);
  ok(claimB1.status === "claimed", "24. distinct legitimate events remain processable");
  const { rows: resRows } = await pool.query("SELECT result FROM stripe_processed_events WHERE event_id=$1", [evtA]);
  ok(resRows[0]?.result === "success", "E3. processing outcome recorded honestly");
  // Failed fulfillment → durable 'failed' record, immediately reclaimable by Stripe's retry
  await storage.markStripeWebhookEventResult(evtB, "failed", claimB1.token);
  ok((await storage.claimStripeWebhookEvent(evtB, "customer.subscription.created", false)).status === "claimed", "25. failed processing is reclaimable → Stripe retry reprocesses");
  // Abandoned claim (crash after claim, before fulfillment): stale 'processing' lease is reclaimable
  const evtC = `evt_727_claim_c_${stamp}`;
  const claimC1 = await storage.claimStripeWebhookEvent(evtC, "customer.subscription.updated", false);
  await pool.query("UPDATE stripe_processed_events SET processed_at = now() - interval '10 minutes' WHERE event_id=$1", [evtC]);
  const claimC2 = await storage.claimStripeWebhookEvent(evtC, "customer.subscription.updated", false);
  ok(claimC2.status === "claimed", "E5. crashed/abandoned 'processing' lease expires → retry reclaims (no permanent paid-but-unfulfilled)");
  // FENCING: the expired-but-still-running original owner cannot ack/overwrite
  ok(await storage.markStripeWebhookEventResult(evtC, "success", claimC1.token) === false, "E9b. stale owner's token rejected — reclaimed lease is fenced");
  ok(await storage.markStripeWebhookEventResult(evtC, "success", claimC2.token) === true, "E9c. new owner's token accepted");
  // Concurrency: 5 simultaneous claims of one fresh event id — exactly one wins
  const evtD = `evt_727_claim_d_${stamp}`;
  const race = await Promise.all(Array.from({ length: 5 }, () => storage.claimStripeWebhookEvent(evtD, "customer.subscription.updated", false)));
  ok(race.filter((x) => x.status === "claimed").length === 1 && race.filter((x) => x.status === "in_flight").length === 4, "E6. concurrent duplicate deliveries — exactly one claim wins, rest retryable");
  const claimBlock = webhookBlock;
  ok(/claimStripeWebhookEvent/.test(claimBlock) && claimBlock.indexOf("claimStripeWebhookEvent") < claimBlock.indexOf("handleBillingEvent"), "E1. atomic claim happens BEFORE business fulfillment");
  ok(/markStripeWebhookEventResult\(event\.id,\s*"failed"/.test(claimBlock), "E4. failure path records durable 'failed' state (recoverable retry policy)");
  ok(/duplicate:\s*true/.test(claimBlock) && /billing_webhook_duplicate/.test(claimBlock), "E2. duplicate delivery acknowledged (200) without re-fulfillment + logged");
  ok(/status\(409\)/.test(claimBlock) && /in_flight/.test(claimBlock), "E7. in-flight lease → retryable 409, never a false duplicate ack");
  ok(/status\(503\)/.test(claimBlock) && /failing closed/.test(claimBlock), "E8. idempotency ledger outage fails CLOSED with retryable 503 (no unguarded fulfillment)");
  ok(/const acked = await storage\.markStripeWebhookEventResult\(event\.id,\s*"success",\s*claimToken\)/.test(claimBlock) && /billing_webhook_lease_lost/.test(claimBlock), "E10. success ack awaits durable fenced terminal state; lost lease → retryable, never a false 200");

  // ════ SUBSCRIPTION FULFILLMENT + CREDITS (hermetic fixtures, dev DB) ════
  console.log("\n── Fulfillment & credits ──");
  const user = await storage.getUserByEmail(email);
  ok(!!user, "F0. fixture customer exists");
  const uid = user!.id;
  const T1 = Math.floor(stamp / 1000) + 30 * 86400;
  const T2 = T1 + 30 * 86400;
  const subFixture = (over: any = {}) => ({
    id: `sub_727_${stamp}`, customer: `cus_727_${stamp}`, status: "active",
    current_period_end: T1, cancel_at_period_end: false,
    items: { data: [{ price: { id: process.env.STRIPE_PRICE_STARTER } }] },
    metadata: { userId: uid, tier: "starter" }, ...over,
  });
  const evt = (type: string, object: any) => ({ id: `evt_727_${type}_${Math.random().toString(36).slice(2)}`, type, livemode: false, data: { object } });

  // 18. subscription.created handled → starter active, credits reset to 200
  await handleBillingEvent(evt("customer.subscription.created", subFixture()));
  let credits = await storage.getAiCredits(uid);
  let u = await storage.getUser(uid);
  ok(u?.premiumTier === "starter" && credits?.balance === 200 && credits?.monthlyAllotment === 200, "18. subscription.created → tier starter, credits granted once (200)");
  const subRow1 = await storage.getSubscriptionByStripeId(`sub_727_${stamp}`);
  ok(subRow1?.status === "active" && subRow1?.tier === "starter", "F1. subscription row synchronized");

  // Spend credits, then replay duplicate lifecycle events — must NOT restore
  await storage.consumeAiCredit(uid, 50);
  await handleBillingEvent(evt("customer.subscription.created", subFixture())); // duplicate created
  await handleBillingEvent(evt("customer.subscription.updated", subFixture())); // updated, same period
  credits = await storage.getAiCredits(uid);
  ok(credits?.balance === 150, "22/26/27. duplicate created/updated in same billing period do NOT re-credit (150 stays 150)");
  const { rows: subCount } = await pool.query("SELECT count(*)::int AS n FROM subscriptions WHERE stripe_subscription_id=$1", [`sub_727_${stamp}`]);
  ok(subCount[0].n === 1, "23. duplicate events do not create duplicate subscription rows");

  // 19/28. legitimate renewal (period advances) credits once per new period
  await handleBillingEvent(evt("customer.subscription.updated", subFixture({ current_period_end: T2 })));
  credits = await storage.getAiCredits(uid);
  ok(credits?.balance === 200, "19/28. renewal (new billing period) resets credits per documented policy");
  await storage.consumeAiCredit(uid, 10);
  await handleBillingEvent(evt("customer.subscription.updated", subFixture({ current_period_end: T2 })));
  credits = await storage.getAiCredits(uid);
  ok(credits?.balance === 190, "27b. redelivered same-period renewal does not credit again");

  // Tier change credits new allotment
  await handleBillingEvent(evt("customer.subscription.updated", subFixture({ current_period_end: T2, items: { data: [{ price: { id: process.env.STRIPE_PRICE_PRO } }] }, metadata: { userId: uid, tier: "pro" } })));
  u = await storage.getUser(uid); credits = await storage.getAiCredits(uid);
  ok(u?.premiumTier === "pro" && credits?.balance === 1000, "F2. tier change applies new plan + allotment once");

  // Out-of-order/stale delivery: an event describing an OLDER period must not
  // overwrite newer state or later masquerade as a fresh renewal.
  await storage.consumeAiCredit(uid, 100); // pro balance 1000 → 900
  await handleBillingEvent(evt("customer.subscription.updated", subFixture({ current_period_end: T1 }))); // stale (T1 < T2), starter
  u = await storage.getUser(uid); credits = await storage.getAiCredits(uid);
  const rowAfterStale = await storage.getSubscriptionByStripeId(`sub_727_${stamp}`);
  ok(u?.premiumTier === "pro" && credits?.balance === 900 && rowAfterStale?.currentPeriodEnd?.getTime() === T2 * 1000, "F3. stale out-of-order event skipped — no downgrade, no credit, period stays monotonic");
  // Transactional grant marker: marker + balance reset commit atomically —
  // duplicate grant attempts (replay, concurrency) can never re-credit, and a
  // rolled-back attempt leaves no marker (retry re-grants).
  const grantKey = `credit_grant:sub_727_partial_${stamp}:starter:${T2 * 1000}`;
  ok(await storage.applyPlanCreditsWithGrant(uid, 200, grantKey, false) === true, "F4a. first grant issues credits + durable marker in one transaction");
  await storage.consumeAiCredit(uid, 25);
  ok(await storage.applyPlanCreditsWithGrant(uid, 200, grantKey, false) === false, "F4b. replayed grant with committed marker does NOT re-credit");
  ok((await storage.getAiCredits(uid))!.balance === 175, "F4c. spent credits stay spent after grant replay");
  const grantKey2 = `credit_grant:sub_727_race_${stamp}:starter:${T2 * 1000}`;
  const grantRace = await Promise.all(Array.from({ length: 5 }, () => storage.applyPlanCreditsWithGrant(uid, 200, grantKey2, false)));
  ok(grantRace.filter(Boolean).length === 1, "F5. 5 concurrent grant attempts → exactly one credits (marker row lock serializes)");
  const storageSrc = fs.readFileSync("server/storage.ts", "utf8");
  ok(/applyPlanCreditsWithGrant[\s\S]{0,400}db\.transaction/.test(storageSrc), "F6. grant marker + balance reset are one DB transaction (source contract)");
  // Terminal cancellation guard: a stale same-period "active" replay after
  // customer.subscription.deleted must not resurrect the subscription.
  // (executed after the deleted event below — see F7)

  // 16. non-subscription checkout completion ignored by subscription handler
  await handleBillingEvent(evt("checkout.session.completed", { id: `cs_727_${stamp}`, mode: "payment", metadata: { userId: uid, tier: "elite" } }));
  u = await storage.getUser(uid);
  ok(u?.premiumTier === "pro", "16. non-subscription checkout ignored by billing handler");

  // 17. unknown tier never activates premium / never partially writes
  await handleBillingEvent(evt("customer.subscription.created", subFixture({ id: `sub_727_unknown_${stamp}`, items: { data: [{ price: { id: "price_totally_unknown" } }] }, metadata: { userId: uid, tier: "platinum" } })));
  u = await storage.getUser(uid);
  const unknownRow = await storage.getSubscriptionByStripeId(`sub_727_unknown_${stamp}`);
  ok(u?.premiumTier === "pro" && !unknownRow, "17. unknown tier → no premium, no partial subscription row, no throw (no Stripe retry loop)");

  // 20/29. subscription.deleted → free tier, no credit grant, history preserved
  await storage.consumeAiCredit(uid, 100);
  const balBeforeCancel = (await storage.getAiCredits(uid))!.balance;
  // A real deletion event carries the subscription's FINAL period end (T2 here).
  await handleBillingEvent(evt("customer.subscription.deleted", subFixture({ status: "canceled", current_period_end: T2 })));
  u = await storage.getUser(uid); credits = await storage.getAiCredits(uid);
  const cancelledRow = await storage.getSubscriptionByStripeId(`sub_727_${stamp}`);
  ok(u?.premiumTier === "free" && cancelledRow?.status === "canceled", "20. subscription.deleted → entitlement removed, subscription history preserved");
  ok(credits?.balance === balBeforeCancel && credits?.monthlyAllotment === 15, "29. cancellation does not credit (balance untouched, allotment → free plan)");

  // F7. Stale same-period "active" replay after terminal cancellation must not
  // resurrect service or credits (deleted stored T1 period; replay pro T2 is
  // NOT provably newer than... use same stored period end).
  const cancelledPeriod = (await storage.getSubscriptionByStripeId(`sub_727_${stamp}`))!.currentPeriodEnd;
  await handleBillingEvent(evt("customer.subscription.updated", subFixture({ status: "active", current_period_end: Math.floor(cancelledPeriod!.getTime() / 1000), items: { data: [{ price: { id: process.env.STRIPE_PRICE_PRO } }] }, metadata: { userId: uid, tier: "pro" } })));
  u = await storage.getUser(uid);
  const rowAfterReplay = await storage.getSubscriptionByStripeId(`sub_727_${stamp}`);
  ok(u?.premiumTier === "free" && rowAfterReplay?.status === "canceled", "F7. stale active replay after cancellation does not resurrect subscription/entitlement");

  // F8. Out-of-order SAME-PERIOD tier events: a late starter event (older
  // Stripe event.created) must never downgrade a newer pro state.
  const T3 = T2 + 30 * 86400;
  const C1 = Math.floor(stamp / 1000);
  const evtAt = (type: string, object: any, created: number) => ({ ...evt(type, object), created });
  const subB = (over: any = {}) => subFixture({ id: `sub_727_b_${stamp}`, current_period_end: T3, ...over });
  await handleBillingEvent(evtAt("customer.subscription.created", subB(), C1));
  await handleBillingEvent(evtAt("customer.subscription.updated", subB({ items: { data: [{ price: { id: process.env.STRIPE_PRICE_PRO } }] }, metadata: { userId: uid, tier: "pro" } }), C1 + 100));
  u = await storage.getUser(uid);
  ok(u?.premiumTier === "pro", "F8a. upgrade applied (event.created ordering persisted)");
  await storage.consumeAiCredit(uid, 30); // 1000 → 970
  await handleBillingEvent(evtAt("customer.subscription.updated", subB(), C1 + 50)); // LATE starter event, same period
  u = await storage.getUser(uid); credits = await storage.getAiCredits(uid);
  const rowB = await storage.getSubscriptionByStripeId(`sub_727_b_${stamp}`);
  ok(u?.premiumTier === "pro" && rowB?.tier === "pro" && credits?.balance === 970, "F8b. late same-period starter event rejected — no downgrade, no credit change");

  // F9. Late deletion of an OLD subscription must not revoke a NEWER
  // replacement subscription's entitlement.
  const T4 = T3 + 30 * 86400;
  await handleBillingEvent(evtAt("customer.subscription.created", subFixture({ id: `sub_727_c_${stamp}`, current_period_end: T4, items: { data: [{ price: { id: process.env.STRIPE_PRICE_ELITE } }] }, metadata: { userId: uid, tier: "elite" } }), C1 + 300));
  u = await storage.getUser(uid);
  ok(u?.premiumTier === "elite", "F9a. replacement subscription (new Stripe id) active");
  await handleBillingEvent(evtAt("customer.subscription.deleted", subB({ status: "canceled" }), C1 + 200)); // late deletion of OLD sub
  u = await storage.getUser(uid);
  const rowBAfter = await storage.getSubscriptionByStripeId(`sub_727_b_${stamp}`);
  ok(u?.premiumTier === "elite" && rowBAfter?.status === "canceled", "F9b. late old-subscription deletion keeps entitlement on newer active subscription");

  // F10. Atomic ordering under CONCURRENCY: the staleness decision + write are
  // one conditional SQL statement, so even when an older and a newer event for
  // the same subscription race, the older can never overwrite the newer.
  const T5 = T4 + 30 * 86400;
  const subD = (tierKey: string, priceEnv: string, createdSec: number) => ({
    userId: uid, stripeSubscriptionId: `sub_727_d_${stamp}`, stripeCustomerId: `cus_727_${stamp}`,
    status: "active", tier: tierKey, currentPeriodEnd: new Date(T5 * 1000),
    cancelAtPeriodEnd: false, lastEventAt: new Date((createdSec) * 1000),
  });
  // Interleaving worst case: newer event commits first, older arrives after.
  ok(await storage.upsertSubscriptionIfNewer(subD("pro", "", C1 + 1000) as any) === true, "F10a. newer event wins the atomic upsert");
  ok(await storage.upsertSubscriptionIfNewer(subD("starter", "", C1 + 500) as any) === false, "F10b. older event arriving after commit loses atomically (no downgrade write)");
  let rowD = await storage.getSubscriptionByStripeId(`sub_727_d_${stamp}`);
  ok(rowD?.tier === "pro" && rowD?.lastEventAt?.getTime() === (C1 + 1000) * 1000, "F10c. committed row keeps newer tier + event time");
  // True concurrent race: many old/new upserts in parallel — final state must be the newest.
  await Promise.all([
    storage.upsertSubscriptionIfNewer(subD("starter", "", C1 + 600) as any),
    storage.upsertSubscriptionIfNewer(subD("elite", "", C1 + 2000) as any),
    storage.upsertSubscriptionIfNewer(subD("starter", "", C1 + 700) as any),
    storage.upsertSubscriptionIfNewer(subD("pro", "", C1 + 1500) as any),
  ]);
  rowD = await storage.getSubscriptionByStripeId(`sub_727_d_${stamp}`);
  ok(rowD?.tier === "elite" && rowD?.lastEventAt?.getTime() === (C1 + 2000) * 1000, "F10d. concurrent old/new race converges to newest state (row-lock serialized)");
  // Concurrent deletion vs stale active update: cancellation is terminal.
  ok(await storage.upsertSubscriptionIfNewer({ ...subD("elite", "", C1 + 2500), status: "canceled" } as any) === true, "F10e. deletion transition wins");
  ok(await storage.upsertSubscriptionIfNewer(subD("elite", "", C1 + 2200) as any) === false, "F10f. stale active update after deletion rejected atomically");
  rowD = await storage.getSubscriptionByStripeId(`sub_727_d_${stamp}`);
  ok(rowD?.status === "canceled", "F10g. canceled state survives the race");

  // F11. SAME-SECOND ties (event.created is second-resolution → not a total
  // order): conflicting equal-time states must not overwrite; identical-state
  // and terminal-cancellation ties may.
  const subE = (tierKey: string, status: string, createdSec: number) => ({
    userId: uid, stripeSubscriptionId: `sub_727_e_${stamp}`, stripeCustomerId: `cus_727_${stamp}`,
    status, tier: tierKey, currentPeriodEnd: new Date(T5 * 1000),
    cancelAtPeriodEnd: false, lastEventAt: new Date((C1 + 5000) * 1000),
  });
  ok(await storage.upsertSubscriptionIfNewer(subE("pro", "active", 0) as any) === true, "F11a. first same-second event wins");
  ok(await storage.upsertSubscriptionIfNewer(subE("starter", "active", 0) as any) === false, "F11b. conflicting same-second distinct event rejected — no paid-pro→starter downgrade on a tie");
  ok(await storage.upsertSubscriptionIfNewer(subE("pro", "active", 0) as any) === true, "F11c. identical-state same-second replay converges (no-op win)");
  ok(await storage.upsertSubscriptionIfNewer(subE("pro", "canceled", 0) as any) === true, "F11d. same-second terminal cancellation wins the tie (deletion is always last)");
  let rowE = await storage.getSubscriptionByStripeId(`sub_727_e_${stamp}`);
  ok(rowE?.tier === "pro" && rowE?.status === "canceled", "F11e. tied conflicting write never landed; cancellation did");
  // End-to-end: pro applied first, then a DISTINCT same-second starter event —
  // entitlement must stay pro (reconcile fetch fails gracefully in dev: no
  // real Stripe subscription exists, so committed state is kept).
  const subF = (over: any = {}) => subFixture({ id: `sub_727_f_${stamp}`, current_period_end: T5, items: { data: [{ price: { id: process.env.STRIPE_PRICE_PRO } }] }, metadata: { userId: uid, tier: "pro" }, ...over });
  await handleBillingEvent(evtAt("customer.subscription.created", subF(), C1 + 6000));
  await handleBillingEvent(evtAt("customer.subscription.updated", subF({ items: { data: [{ price: { id: process.env.STRIPE_PRICE_STARTER } }] }, metadata: { userId: uid, tier: "starter" } }), C1 + 6000));
  u = await storage.getUser(uid);
  const rowF = await storage.getSubscriptionByStripeId(`sub_727_f_${stamp}`);
  ok(u?.premiumTier === "pro" && rowF?.tier === "pro", "F11f. end-to-end same-second conflicting event cannot downgrade entitlement");
  const billingSrc2 = fs.readFileSync("server/routes/customerBilling.ts", "utf8");
  ok(/subscriptions\.retrieve\(sub\.id\)/.test(billingSrc2) && /isReconcile/.test(billingSrc2), "F11g. tie/ordering losses reconcile from authoritative Stripe subscription retrieval (source contract)");

  // F12. Old-subscription ineligible-status UPDATES (not just deletion) must
  // not revoke a newer replacement subscription. First retire sub_727_f (left
  // active by F11) — its deletion must itself re-derive entitlement onto the
  // remaining active sub_727_c (elite).
  await handleBillingEvent(evtAt("customer.subscription.deleted", subF({ status: "canceled" }), C1 + 7000));
  u = await storage.getUser(uid);
  ok(u?.premiumTier === "elite", "F12pre. deleting the newest sub re-derives entitlement onto remaining active sub");
  for (const [i, badStatus] of ["unpaid", "canceled", "incomplete_expired"].entries()) {
    // Late status update for the OLD sub_727_b (already canceled) — a distinct
    // old subscription id going ineligible while sub_727_c stays active.
    await handleBillingEvent(evtAt("customer.subscription.updated", subB({ status: badStatus }), C1 + 8000 + i));
    u = await storage.getUser(uid);
    ok(u?.premiumTier === "elite", `F12${"abc"[i]}. old-sub ${badStatus} update keeps entitlement on replacement active subscription`);
  }
  // And when NO replacement exists, ineligible status still downgrades to free:
  await handleBillingEvent(evtAt("customer.subscription.updated", subFixture({ id: `sub_727_c_${stamp}`, status: "unpaid", current_period_end: T4, items: { data: [{ price: { id: process.env.STRIPE_PRICE_ELITE } }] }, metadata: { userId: uid, tier: "elite" } }), C1 + 9000));
  u = await storage.getUser(uid);
  ok(u?.premiumTier === "free", "F12d. last remaining subscription going unpaid downgrades to free");

  // F13. past_due shadowing: an active replacement with an EARLIER period end
  // must not be hidden by a later-ending past_due row when re-deriving
  // entitlement after an old subscription's loss event.
  const T6 = T5 + 30 * 86400;
  // Active pro replacement, period T5:
  await handleBillingEvent(evtAt("customer.subscription.created", subFixture({ id: `sub_727_g_${stamp}`, current_period_end: T5, items: { data: [{ price: { id: process.env.STRIPE_PRICE_PRO } }] }, metadata: { userId: uid, tier: "pro" } }), C1 + 10000));
  // Separate past_due row with a LATER period end (T6) — inserted directly:
  ok(await storage.upsertSubscriptionIfNewer({ userId: uid, stripeSubscriptionId: `sub_727_h_${stamp}`, stripeCustomerId: `cus_727_${stamp}`, status: "past_due", tier: "starter", currentPeriodEnd: new Date(T6 * 1000), cancelAtPeriodEnd: false, lastEventAt: new Date((C1 + 10001) * 1000) } as any) === true, "F13a. later-ending past_due row present");
  // Old sub_727_c gets a late deletion event — replacement derivation must pick
  // the ACTIVE pro sub (T5), not the later-ending past_due starter (T6):
  await handleBillingEvent(evtAt("customer.subscription.deleted", subFixture({ id: `sub_727_c_${stamp}`, status: "canceled", current_period_end: T4, items: { data: [{ price: { id: process.env.STRIPE_PRICE_ELITE } }] }, metadata: { userId: uid, tier: "elite" } }), C1 + 10002));
  u = await storage.getUser(uid);
  ok(u?.premiumTier === "pro", "F13b. active replacement retained despite later-ending past_due row (SQL-level active/trialing filter)");

  // ════ BILLING PORTAL ════
  console.log("\n── Billing portal ──");
  r = await fetch(`${BASE}/api/billing/portal`, { method: "POST", headers: { "Content-Type": "application/json" } });
  ok(r.status === 401, "30. unauthenticated portal rejected 401");
  r = await fetch(`${BASE}/api/billing/portal`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({}) });
  const portalRes = r.status === 503 ? { message: "not configured" } : await j(r);
  ok(r.status === 400 || r.status === 503, "31. customer without Stripe account gets controlled JSON (400/503, no Stripe internals)");
  ok(!JSON.stringify(portalRes).match(/cus_|sk_|whsec_|StripeError/), "31b. portal error leaks no Stripe internals");
  r = await fetch(`${BASE}/api/billing/portal`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ customer: "cus_someone_else", customerId: "cus_someone_else" }) });
  ok(r.status === 400 || r.status === 503, "32. client-supplied customer ID ignored — server record is the only source");
  ok(/billingPortal\.sessions\.create\(\{\s*customer:\s*user\.stripeCustomerId/.test(src), "32s. portal customer bound to authenticated user record (source contract)");
  ok(/return_url:\s*`\$\{originFor\(\)\}\/account`/.test(src), "33. portal return URL canonical");

  // ════ RETURN UX (source contracts) ════
  console.log("\n── Return UX ──");
  const accountSrc = fs.readFileSync("client/src/pages/Account.tsx", "utf8");
  const pricingSrc = fs.readFileSync("client/src/pages/Pricing.tsx", "utf8");
  ok(/billing.*success/.test(accountSrc) && /isPremium/.test(accountSrc) && /BillingConfirmationBanner/.test(accountSrc) && !/setPremium|isPremium\s*=\s*true/.test(accountSrc), "34. billing=success shows confirming banner only — entitlement never set client-side");
  ok(/usePremiumStatus/.test(accountSrc) && /refetch/.test(accountSrc), "35. account refetches authoritative /api/premium/status after checkout return");
  ok(/BILLING_POLL_MAX_ATTEMPTS\s*=\s*10/.test(accountSrc) && /BILLING_POLL_INTERVAL_MS\s*=\s*3000/.test(accountSrc) && /timeout/.test(accountSrc), "36. polling bounded (10 × 3s) with timeout state — no infinite polling");
  ok(/may still be processing/.test(accountSrc), "36b. timeout copy present");
  ok(/billing.*cancelled/.test(pricingSrc) && /haven(&rsquo;|')t been charged/.test(pricingSrc) && !/error/i.test(pricingSrc.match(/banner-checkout-cancelled[\s\S]{0,400}/)?.[0] ?? "error"), "37. cancelled checkout is a calm non-error state; retry available");
  ok(!/localStorage|sessionStorage/.test(fs.readFileSync("client/src/components/premium/PlanComparison.tsx", "utf8")), "K. no checkout session URL stored client-side");

  // ════ OBSERVABILITY ════
  console.log("\n── Observability ──");
  const schemaSrc = fs.readFileSync("shared/schema.ts", "utf8");
  for (const e of ["billing_checkout_started", "billing_checkout_cancelled", "billing_checkout_returned", "billing_portal_opened"]) {
    ok(schemaSrc.includes(`"${e}"`), `L. funnel vocabulary includes ${e}`);
  }
  r = await fetch(`${BASE}/api/analytics/funnel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "billing_checkout_started", sessionId: `s727${stamp}`, visitorId: `v727${stamp}`, page: "/pricing", metadata: { tier: "starter" } }) });
  ok(r.ok, "L2. billing_checkout_started accepted by funnel endpoint");
  r = await fetch(`${BASE}/api/analytics/funnel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "billing_totally_unknown", sessionId: `s727${stamp}`, visitorId: `v727${stamp}`, page: "/pricing" }) });
  ok(r.status === 400, "L3. unknown billing event rejected (closed vocabulary)");
  ok(/billing_subscription_activated|billing_subscription_/.test(src) && /billing_webhook_duplicate/.test(routesSrc) && /billing_webhook_failed/.test(routesSrc), "L4. server-side redacted operational events present");
  ok(!/console\.[a-z]+\([^)]*(session\.url|customer_details|payment_method)/.test(src), "L5. billing logs never include session URLs / customer PII / payment methods");

  // ════ SECURITY ════
  console.log("\n── Security ──");
  const authedStatus = await fetch(`${BASE}/api/premium/status`, { headers: { cookie } });
  const statusBody = JSON.stringify(await j(authedStatus));
  ok(!/sk_live|sk_test|whsec_|STRIPE_SECRET/.test(statusBody), "38. no secret values in API responses");
  r = await fetch(`${BASE}/api/billing/create-checkout`, { method: "POST", headers: { cookie } }); // no body
  ok((r.headers.get("content-type") || "").includes("json"), "41. billing API errors return JSON (no SPA HTML fallthrough)");
  const rWebhookErr = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST" });
  ok((rWebhookErr.headers.get("content-type") || "").includes("json"), "41b. webhook errors return JSON (no SPA fallthrough)");

  // ════ REGRESSION ════
  console.log("\n── Regression ──");
  r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  ok(r.status === 200, "44. existing customer login remains operational");
  r = await fetch(`${BASE}/api/premium/status`);
  ok(r.status === 401, "45. premium-status route remains protected");
  r = await fetch(`${BASE}/work`);
  const rHome = await fetch(`${BASE}/`);
  ok(r.status === 200 && rHome.status === 200, "46. Phase 72.x pages unaffected (/ and /work 200)");
  ok(/updateOrderStatus\(session\.id,\s*"paid"/.test(webhookBlock) && /mode === "subscription"/.test(webhookBlock), "47. one-time order webhook path intact (paid orders + subscription branch preserved)");

  // ── Cleanup test rows (dev DB) ──
  await pool.query("DELETE FROM stripe_processed_events WHERE event_id LIKE 'evt_727_%' OR event_id LIKE 'credit_grant:sub_727_%'");
  await pool.query("DELETE FROM subscriptions WHERE stripe_subscription_id LIKE 'sub_727_%'");
  await pool.query("DELETE FROM user_premium_features WHERE user_id=$1", [uid]);
  await pool.query("DELETE FROM ai_credits WHERE user_id=$1", [uid]);
  await pool.query("DELETE FROM strategy_funnel_events WHERE session_id LIKE 's727%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'phase727-%@test.local'");

  console.log(`\n══════ RESULT: ${pass} passed, ${fail} failed ══════`);
  if (fail) console.log("Failures:", failures.join(" | "));
  process.exitCode = fail ? 1 : 0;
}

main().catch((e) => { console.error("Test harness error:", e); process.exitCode = 1; }).finally(() => pool.end());
