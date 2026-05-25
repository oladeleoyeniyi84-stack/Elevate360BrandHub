// Stripe client — native SDK only (no Replit connector, no managed sync).
// Production-safe for Render: reads STRIPE_SECRET_KEY directly from env.
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.warn("[stripe] STRIPE_SECRET_KEY not configured");
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }

  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Backwards-compatible wrapper used throughout routes.ts.
// Returns the native Stripe client or throws if not configured.
export async function getUncachableStripeClient(): Promise<Stripe> {
  const client = getStripeClient();
  if (!client) throw new Error("Stripe is not configured");
  return client;
}

// Publishable key for the frontend (Stripe.js). Set STRIPE_PUBLISHABLE_KEY
// in Render env vars. Returns null if not set so the client can degrade.
export async function getStripePublishableKey(): Promise<string | null> {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? null;
}
