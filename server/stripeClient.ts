// Stripe client — Replit managed credentials (DO NOT hardcode keys)
import Stripe from 'stripe';

let connectionSettings: any;

async function fetchConnection(hostname: string, xReplitToken: string, environment: string) {
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', environment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-Replit-Token': xReplitToken,
    },
  });

  const data = await response.json();
  const settings = data.items?.[0];
  if (!settings || !settings.settings.publishable || !settings.settings.secret) return null;
  return settings;
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

  // Try production first when deployed; fall back to development if not configured
  if (isProduction) {
    const prod = await fetchConnection(hostname!, xReplitToken, 'production');
    if (prod) {
      connectionSettings = prod;
      return {
        publishableKey: connectionSettings.settings.publishable as string,
        secretKey: connectionSettings.settings.secret as string,
      };
    }
    console.warn('[stripe] production connection not found — falling back to development connection');
  }

  // development (or fallback)
  const dev = await fetchConnection(hostname!, xReplitToken, 'development');
  if (!dev) throw new Error('Stripe connection not found (tried production + development)');
  connectionSettings = dev;

  return {
    publishableKey: connectionSettings.settings.publishable as string,
    secretKey: connectionSettings.settings.secret as string,
  };
}

// WARNING: Never cache this client. Call fresh on every request.
export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
