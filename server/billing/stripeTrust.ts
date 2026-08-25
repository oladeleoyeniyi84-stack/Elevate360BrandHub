// Phase 72.8 — Stripe commerce trust-boundary helpers.
// These functions only perform provider reads. They are dependency-injected so
// regression tests use a hermetic fake and can never create a charge/session.

export type ValidatedOneTimePrice = {
  priceId: string;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
};

type StripeReadClient = {
  products: { retrieve(id: string): Promise<any> };
  prices: {
    retrieve(id: string, params?: any): Promise<any>;
    list(params: any): Promise<{ data: any[] }>;
  };
  paymentIntents?: {
    retrieve(id: string, params?: any): Promise<any>;
  };
};

function activeProduct(product: any): product is { id: string; name: string; active: true } {
  return Boolean(product && !product.deleted && product.active === true && typeof product.id === "string");
}

function validatePrice(price: any, product: any): ValidatedOneTimePrice {
  if (!price || price.active !== true || price.type !== "one_time") {
    throw new Error("Offer price is not an active one-time price");
  }
  if (!activeProduct(product)) throw new Error("Offer product is not active");
  const linkedProductId = typeof price.product === "string" ? price.product : price.product?.id;
  if (linkedProductId !== product.id) throw new Error("Offer price does not belong to the allowed product");
  if (!Number.isSafeInteger(price.unit_amount) || price.unit_amount < 0) {
    throw new Error("Offer price does not have a fixed unit amount");
  }
  if (typeof price.currency !== "string" || !/^[a-zA-Z]{3}$/.test(price.currency)) {
    throw new Error("Offer price currency is invalid");
  }
  return {
    priceId: price.id,
    productId: product.id,
    productName: product.name,
    amount: price.unit_amount,
    currency: price.currency.toLowerCase(),
  };
}

// The public offer identifier is a product id, never a price id. The server
// chooses the same first active one-time price used by the offer listing.
export async function resolveAllowedOffer(client: StripeReadClient, offerId: string): Promise<ValidatedOneTimePrice> {
  if (!/^prod_[A-Za-z0-9]+$/.test(offerId)) throw new Error("Invalid offer identifier");
  const product = await client.products.retrieve(offerId);
  if (!activeProduct(product)) throw new Error("Offer product is not active");
  const prices = await client.prices.list({ product: product.id, active: true, type: "one_time", limit: 1 });
  if (prices.data.length !== 1) throw new Error("Offer has no active one-time price");
  return validatePrice(prices.data[0], product);
}

// Marketplace rows are the server-side allowlist. Also require Stripe's live
// amount/currency/product state to agree with the authoritative database row.
export async function validateMarketplacePrice(
  client: StripeReadClient,
  priceId: string,
  expectedAmount: number,
  expectedCurrency: string,
): Promise<ValidatedOneTimePrice> {
  const price = await client.prices.retrieve(priceId, { expand: ["product"] });
  const product = typeof price.product === "string"
    ? await client.products.retrieve(price.product)
    : price.product;
  const validated = validatePrice(price, product);
  if (validated.amount !== expectedAmount || validated.currency !== expectedCurrency.toLowerCase()) {
    throw new Error("Marketplace price does not match the configured product");
  }
  return validated;
}

export function isSafeOneTimeCompletion(
  session: any,
  order: { status?: string | null; stripePriceId?: string | null; metadata?: unknown } | undefined,
): boolean {
  if (!order || session?.mode !== "payment" || session?.payment_status !== "paid") return false;
  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const expectedAmount = metadata.expectedAmountCents;
  const expectedCurrency = metadata.expectedCurrency;
  if (!Number.isSafeInteger(expectedAmount) || expectedAmount !== session.amount_total) return false;
  if (typeof expectedCurrency !== "string" || expectedCurrency.toLowerCase() !== String(session.currency ?? "").toLowerCase()) return false;
  return order.status === "initiated" || order.status === "paid";
}

// Checkout completion and refund webhooks can arrive out of order. Before a
// one-time completion is allowed to deliver anything, read Stripe's
// authoritative payment state so an earlier full refund cannot be discarded
// merely because the local order did not yet have its payment-intent id.
export async function isPaymentIntentFullyRefunded(
  client: StripeReadClient,
  paymentIntentId: string,
): Promise<boolean> {
  if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
    throw new Error("Invalid payment intent identifier");
  }
  if (!client.paymentIntents) {
    throw new Error("Payment intent lookup is unavailable");
  }
  const paymentIntent = await client.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const charge = paymentIntent?.latest_charge;
  if (!charge || typeof charge === "string") {
    throw new Error("Payment intent charge state is unavailable");
  }
  return charge.refunded === true ||
    (Number.isSafeInteger(charge.amount) &&
      Number.isSafeInteger(charge.amount_refunded) &&
      charge.amount_refunded >= charge.amount);
}

export async function getPaymentIntentMetadata(
  client: StripeReadClient,
  paymentIntentId: string,
): Promise<Record<string, string>> {
  if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
    throw new Error("Invalid payment intent identifier");
  }
  if (!client.paymentIntents) {
    throw new Error("Payment intent lookup is unavailable");
  }
  const paymentIntent = await client.paymentIntents.retrieve(paymentIntentId);
  const metadata = paymentIntent?.metadata;
  if (!metadata || typeof metadata !== "object") return {};
  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

const LOCAL_PAYMENT_SOURCES = new Set([
  "elevate360-website",
  "elevate360-marketplace",
  "strategy-session",
]);
const UNTAGGED_REFUND_RETRY_WINDOW_MS = 10 * 60 * 1000;

// If a full-refund webhook races completion before the local order gains its
// payment-intent link, acknowledging it would permanently discard the refund.
// Known-local payments therefore remain retryable. Older untagged payments are
// eventually ignored so unrelated account activity cannot retry forever.
export function shouldRetryUnmatchedFullRefund(
  eventCreatedSeconds: unknown,
  metadata: unknown,
  nowMs = Date.now(),
): boolean {
  const source =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>).source
      : undefined;
  if (typeof source === "string" && LOCAL_PAYMENT_SOURCES.has(source)) return true;
  if (typeof source === "string" && source.trim().length > 0) return false;

  const createdMs =
    typeof eventCreatedSeconds === "number" && Number.isFinite(eventCreatedSeconds)
      ? eventCreatedSeconds * 1000
      : NaN;
  if (!Number.isFinite(createdMs)) return true;
  return nowMs - createdMs <= UNTAGGED_REFUND_RETRY_WINDOW_MS;
}