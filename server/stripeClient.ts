// Stripe client — Replit managed credentials (DO NOT hardcode keys)
import Stripe from 'stripe';

let connectionSettings: any;
// Cache credentials for 30 min to avoid hitting the connectors API on every request.
// Stripe keys don't rotate mid-session, so this is safe.
let credentialsCache: { publishableKey: string; secretKey: string; expiresAt: number } | null = null;
const CREDENTIALS_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
    signal: AbortSignal.timeout(8000),
  });

  const data = await response.json();
  const settings = data.items?.[0];
  if (!settings || !settings.settings.publishable || !settings.settings.secret) return null;
  return settings;
}

async function getCredentials() {
  // Return cached credentials if still valid
  if (credentialsCache && credentialsCache.expiresAt > Date.now()) {
    return { publishableKey: credentialsCache.publishableKey, secretKey: credentialsCache.secretKey };
  }

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
      const creds = {
        publishableKey: connectionSettings.settings.publishable as string,
        secretKey: connectionSettings.settings.secret as string,
      };
      credentialsCache = { ...creds, expiresAt: Date.now() + CREDENTIALS_TTL_MS };
      return creds;
    }
    // Log once per cache cycle, not on every request
    if (!credentialsCache) {
      console.warn('[stripe] production connection not found — falling back to development connection');
    }
  }

  // development (or fallback)
  const dev = await fetchConnection(hostname!, xReplitToken, 'development');
  if (!dev) throw new Error('Stripe connection not found (tried production + development)');
  connectionSettings = dev;

  const creds = {
    publishableKey: connectionSettings.settings.publishable as string,
    secretKey: connectionSettings.settings.secret as string,
  };
  credentialsCache = { ...creds, expiresAt: Date.now() + CREDENTIALS_TTL_MS };
  return creds;
}

// WARNING: Never cache the Stripe *client* itself. Call fresh on every request.
// (Credentials are cached separately above; the client is always re-instantiated.)
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
