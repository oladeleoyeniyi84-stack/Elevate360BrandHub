// Native Stripe webhook signature verification — no Replit sync dependency.
import type Stripe from "stripe";
import { getStripeClient } from "./stripeClient";

export class WebhookHandlers {
  /**
   * Verify a Stripe webhook signature and return the parsed event.
   * Throws if Stripe is not configured, the webhook secret is missing,
   * the payload is not a Buffer, or the signature is invalid.
   */
  static verifyAndParse(payload: Buffer, signature: string): Stripe.Event {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Ensure the webhook route uses raw body (req.rawBody or express.raw)."
      );
    }
    const stripe = getStripeClient();
    if (!stripe) throw new Error("Stripe is not configured");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

    return stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
