/**
 * A Checkout URL must never be returned unless the matching local order is
 * durable. If persistence fails, expire the unexposed Stripe session before
 * propagating the original database error.
 */
export async function persistInitiatedOrderOrExpire<T>(
  persistOrder: () => Promise<T>,
  expireCheckout: () => Promise<unknown>,
): Promise<T> {
  try {
    return await persistOrder();
  } catch (persistenceError) {
    try {
      await expireCheckout();
    } catch {
      // The Checkout URL has not been returned to the caller, so it remains
      // inaccessible even if best-effort Stripe cleanup is unavailable.
    }
    throw persistenceError;
  }
}