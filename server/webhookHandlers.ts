import { getStripeSync } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Ensure webhook route uses raw body (req.rawBody or express.raw).'
      );
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
