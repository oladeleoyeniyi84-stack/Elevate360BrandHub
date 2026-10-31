/**
 * Controlled transaction-acceptance checks.
 * No live Stripe calls, customer data, payments, emails or production writes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { WebhookHandlers } from "./webhookHandlers";
import { persistInitiatedOrderOrExpire } from "./billing/checkoutSafety";
import { isSafeOneTimeCompletion, resolveAllowedOffer, validateMarketplacePrice } from "./billing/stripeTrust";

test("signed Stripe fixture authenticates; tampering and wrong secret fail closed", () => {
  const savedKey = process.env.STRIPE_SECRET_KEY;
  const savedSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const localKey = "sk_test_hermetic_fixture_no_network";
  const localSecret = "whsec_hermetic_fixture_no_network";
  process.env.STRIPE_SECRET_KEY = localKey;
  process.env.STRIPE_WEBHOOK_SECRET = localSecret;
  try {
    const offlineStripe = new Stripe(localKey, { apiVersion: "2024-12-18.acacia" as any });
    const payload = JSON.stringify({
      id: "evt_hermetic123", object: "event", type: "checkout.session.completed",
      livemode: false, data: { object: { id: "cs_test_hermetic", payment_status: "unpaid" } },
    });
    const signed = offlineStripe.webhooks.generateTestHeaderString({ payload, secret: localSecret });
    const verified = WebhookHandlers.verifyAndParse(Buffer.from(payload), signed);
    assert.equal(verified.id, "evt_hermetic123");
    assert.equal(verified.livemode, false);
    assert.throws(() => WebhookHandlers.verifyAndParse(Buffer.from(payload + " "), signed), /signature|payload/i);
    assert.throws(() => WebhookHandlers.verifyAndParse(Buffer.from(payload), "t=0,v1=invalid"), /signature|timestamp/i);
    assert.throws(() => WebhookHandlers.verifyAndParse(payload as any, signed), /Buffer/);
  } finally {
    if (savedKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = savedKey;
    if (savedSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = savedSecret;
  }
});

test("checkout URL is never released after failed order persistence", async () => {
  let expired = 0;
  const persistenceError = new Error("synthetic database write failure");
  await assert.rejects(
    persistInitiatedOrderOrExpire(
      async () => { throw persistenceError; },
      async () => { expired++; },
    ),
    (err: unknown) => err === persistenceError,
  );
  assert.equal(expired, 1);
  const result = await persistInitiatedOrderOrExpire(
    async () => ({ id: 12, status: "initiated" }),
    async () => { expired++; },
  );
  assert.deepEqual(result, { id: 12, status: "initiated" });
  assert.equal(expired, 1);
});

test("server-selected Stripe prices must be active, exact and linked to active product", async () => {
  const product = { id: "prod_fixture123", name: "Consultation", active: true };
  const price = { id: "price_fixture", type: "one_time", active: true, unit_amount: 9700, currency: "usd", product };
  const fake = {
    products: { retrieve: async () => product },
    prices: {
      list: async () => ({ data: [price] }),
      retrieve: async () => price,
    },
  };
  const allowed = await resolveAllowedOffer(fake, product.id);
  assert.equal(allowed.amount, 9700);
  await assert.rejects(() => resolveAllowedOffer(fake, "price_client_supplied"), /Invalid offer identifier/);
  assert.equal((await validateMarketplacePrice(fake, price.id, 9700, "usd")).priceId, price.id);
  await assert.rejects(() => validateMarketplacePrice(fake, price.id, 1, "usd"), /does not match/);
  assert.equal(isSafeOneTimeCompletion(
    { mode: "payment", payment_status: "paid", amount_total: 9700, currency: "usd" },
    { status: "initiated", metadata: { expectedAmountCents: 9700, expectedCurrency: "usd" } },
  ), true);
  assert.equal(isSafeOneTimeCompletion(
    { mode: "payment", payment_status: "unpaid", amount_total: 9700, currency: "usd" },
    { status: "initiated", metadata: { expectedAmountCents: 9700, expectedCurrency: "usd" } },
  ), false);
});

test("public forms cannot bypass server persistence, webhook signature or idempotency guards", () => {
  const source = readFileSync("server/routes.ts", "utf8");
  assert.match(source, /app\.post\("\/api\/contact"[\s\S]*?storage\.createContactMessage\(data\)/);
  assert.match(source, /app\.post\("\/api\/newsletter"[\s\S]*?storage\.createNewsletterSubscriber\(data\)/);
  assert.match(source, /app\.post\("\/api\/bookings"[\s\S]*?storage\.createBookingIdempotent\(data\)/);
  assert.match(source, /app\.post\("\/api\/stripe\/webhook"[\s\S]*?WebhookHandlers\.verifyAndParse/);
  assert.match(source, /claimStripeWebhookEvent\(event\.id, event\.type/);
  assert.match(source, /persistInitiatedOrderOrExpire/);
});

test("Resend notification is serialized and accepted only by an in-memory fetch stub", async () => {
  const vars = ["RESEND_API_KEY", "CREATOR_EMAIL", "EMAIL_FROM"] as const;
  const before = Object.fromEntries(vars.map(v => [v, process.env[v]]));
  const originalFetch = globalThis.fetch;
  let calls = 0;
  process.env.RESEND_API_KEY = "re_test_hermetic_no_external_sends";
  process.env.CREATOR_EMAIL = "owner@example.test";
  process.env.EMAIL_FROM = "Elevate360 <no-reply@example.test>";
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(String(input), "https://api.resend.com/emails");
    assert.equal(init?.method, "POST");
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer re_test_hermetic_no_external_sends");
    const body = JSON.parse(String(init?.body)) as Record<string, string>;
    assert.equal(body.to, "owner@example.test");
    assert.ok(body.subject.includes("New contact"));
    assert.ok(body.html.includes("&lt;script&gt;"));
    assert.equal(body.html.includes("<script>"), false);
    return new Response(JSON.stringify({ id: "email_hermetic" }), { status: 202 });
  };
  try {
    // Import only after setting fixtures; email.ts caches provider configuration at module initialization.
    const email = await import("./email");
    await email.notifyNewContact("Visitor", "visitor@example.test", "<script>hello</script>");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of vars) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
