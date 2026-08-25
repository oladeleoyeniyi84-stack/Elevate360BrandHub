/**
 * Phase 72.8 hermetic Stripe trust-boundary regressions.
 * Uses only in-memory provider fakes: no network, keys, Stripe mutations, or charges.
 * Run: npx tsx scripts/phase72_8_stripe_tests.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getPaymentIntentMetadata,
  isPaymentIntentFullyRefunded,
  isSafeOneTimeCompletion,
  resolveAllowedOffer,
  shouldRetryUnmatchedFullRefund,
  validateMarketplacePrice,
} from "../server/billing/stripeTrust";

const product = { id: "prod_allowed123", name: "Allowed offer", active: true };
const price = {
  id: "price_server_selected",
  active: true,
  type: "one_time",
  unit_amount: 9700,
  currency: "usd",
  product,
};
let mutations = 0;
const fakeStripe = {
  products: { retrieve: async (id: string) => id === product.id ? product : { id, active: false } },
  prices: {
    retrieve: async (id: string) => id === price.id ? price : { ...price, id, active: false },
    list: async ({ product: id }: any) => ({ data: id === product.id ? [price] : [] }),
  },
  paymentIntents: {
    retrieve: async (id: string) => ({
      id,
      latest_charge: { amount: 9700, amount_refunded: 9700, refunded: true },
      metadata: { source: "elevate360-marketplace" },
    }),
  },
  checkout: { sessions: { create: async () => { mutations++; } } },
};

async function main() {
  const offer = await resolveAllowedOffer(fakeStripe, product.id);
  assert.equal(offer.priceId, price.id, "server selects the live price from an offer id");
  await assert.rejects(() => resolveAllowedOffer(fakeStripe, "price_browser_supplied"), /Invalid offer/);
  await assert.rejects(() => resolveAllowedOffer(fakeStripe, "prod_inactive"), /not active/);

  const market = await validateMarketplacePrice(fakeStripe, price.id, 9700, "USD");
  assert.equal(market.amount, 9700);
  await assert.rejects(
    () => validateMarketplacePrice(fakeStripe, price.id, 1, "usd"),
    /does not match/,
    "database/Stripe amount mismatch must fail closed",
  );

  const order = {
    status: "initiated",
    stripePriceId: price.id,
    metadata: { expectedAmountCents: 9700, expectedCurrency: "usd" },
  };
  assert.equal(isSafeOneTimeCompletion(
    { mode: "payment", payment_status: "paid", amount_total: 9700, currency: "usd" },
    order,
  ), true);
  for (const bad of [
    { mode: "payment", payment_status: "unpaid", amount_total: 9700, currency: "usd" },
    { mode: "payment", payment_status: "paid", amount_total: 1, currency: "usd" },
    { mode: "payment", payment_status: "paid", amount_total: 9700, currency: "eur" },
  ]) assert.equal(isSafeOneTimeCompletion(bad, order), false);
  assert.equal(isSafeOneTimeCompletion(
    { mode: "payment", payment_status: "paid", amount_total: 9700, currency: "usd" },
    undefined,
  ), false, "unknown externally-created session cannot fulfill");
  assert.equal(
    await isPaymentIntentFullyRefunded(fakeStripe, "pi_refunded123"),
    true,
    "completion reconciles an earlier full refund from authoritative provider state",
  );
  await assert.rejects(
    () => isPaymentIntentFullyRefunded(fakeStripe, "not-a-payment-intent"),
    /Invalid payment intent/,
  );
  const eventCreated = 1_700_000_000;
  const nowMs = eventCreated * 1000 + 1_000;
  const paymentIntentMetadata = await getPaymentIntentMetadata(fakeStripe, "pi_refunded123");
  assert.deepEqual(paymentIntentMetadata, { source: "elevate360-marketplace" });
  assert.equal(
    shouldRetryUnmatchedFullRefund(
      eventCreated,
      paymentIntentMetadata,
      nowMs + 24 * 60 * 60 * 1000,
    ),
    true,
    "empty Charge metadata plus local PaymentIntent metadata must remain retryable even after a delayed delivery",
  );
  assert.equal(
    shouldRetryUnmatchedFullRefund(eventCreated, {}, nowMs),
    true,
    "a recent legacy untagged refund must remain retryable during the completion race window",
  );
  assert.equal(
    shouldRetryUnmatchedFullRefund(eventCreated, { source: "another-application" }, nowMs),
    false,
    "an explicitly unrelated account refund must not retry forever",
  );
  assert.equal(
    shouldRetryUnmatchedFullRefund(eventCreated, {}, nowMs + 11 * 60 * 1000),
    false,
    "a stale untagged account refund must eventually be acknowledged",
  );

  const routes = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
  const legacy = routes.slice(routes.indexOf('app.post("/api/checkout/session"'), routes.indexOf('app.post("/api/checkout/strategy-session"'));
  assert.match(legacy, /offerId/);
  assert.doesNotMatch(legacy, /req\.body[^;\n]*priceId/);
  assert.match(routes, /reconcileOneTimeOrderCompletion/);
  assert.match(routes, /refundOrderByPaymentIntent/);
  assert.match(routes, /if \(!refundedOrder\)[\s\S]*getPaymentIntentMetadata[\s\S]*shouldRetryUnmatchedFullRefund[\s\S]*throw new Error\("Refund order mapping not yet available"\)/);
  assert.match(routes, /checkout\.session\.expired/);
  assert.equal(
    (routes.match(/payment_intent_data:\s*\{\s*metadata:\s*\{\s*source:/g) ?? []).length,
    3,
    "all one-time checkout creators tag their payment intents for refund reconciliation",
  );
  assert.match(
    routes,
    /app\.post\("\/api\/checkout\/session", rateLimit\(5, 60\), botGuard/,
    "general checkout must reject abusive request volume before provider mutation",
  );
  assert.match(
    routes,
    /app\.post\("\/api\/checkout\/strategy-session", rateLimit\(5, 60\), botGuard/,
    "strategy checkout must reject abusive request volume before provider mutation",
  );
  const orderStatus = routes.slice(routes.indexOf('app.get("/api/orders/status"'), routes.indexOf("// Phase 37 — Dashboard Orders"));
  assert.doesNotMatch(orderStatus, /order_id/, "public status must not permit sequential order enumeration");
  assert.doesNotMatch(orderStatus, /customerEmail/, "public status must not disclose customer PII");
  const billing = readFileSync(new URL("../server/routes/customerBilling.ts", import.meta.url), "utf8");
  assert.match(billing, /u\?\.stripeCustomerId === stripeCustomerId/);
  assert.match(billing, /const resolvedTier = tierFromPriceId\(priceId\)/);
  assert.equal(mutations, 0, "tests must never invoke a Stripe mutation");
  console.log("Phase 72.8 Stripe trust-boundary tests passed (hermetic, 0 mutations).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});