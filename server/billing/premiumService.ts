// Phase 68A — Premium service: the single source of truth for resolving a
// customer's entitlements from their subscription tier. Recommendation-only
// billing backend — never charges autonomously; Stripe is the money authority.
import { storage } from "../storage";
import { PLANS, getPlan, FEATURE_CATALOG, type TierKey } from "./plans";

export interface PremiumStatus {
  tier: TierKey;
  isPremium: boolean;
  subscription: {
    status: string;
    tier: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  credits: {
    balance: number;
    monthlyAllotment: number;
    lastResetAt: string | null;
  };
  features: string[];
}

// Apply a tier to a customer: sets premium tier, (re)grants feature entitlements,
// and ensures their AI credit allotment matches the plan. Used by the webhook on
// subscription create/update. `resetBalance` tops the customer up on a new/renewed
// subscription (caller decides).
export async function applyTier(userId: string, tier: TierKey, resetBalance: boolean): Promise<void> {
  const plan = PLANS[tier];
  await storage.setUserPremiumTier(userId, tier);
  await storage.setAiCreditAllotment(userId, plan.monthlyCredits, resetBalance);
  await storage.setPremiumFeatures(userId, plan.features, "subscription");
}

// Resolve a customer's live entitlement snapshot.
export async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
  const user = await storage.getUser(userId);
  const tier = (user?.premiumTier as TierKey) || "free";
  const plan = getPlan(tier);

  const credits = await storage.ensureAiCredits(userId, plan.monthlyCredits);
  const sub = await storage.getActiveSubscriptionForUser(userId);
  const featureRows = await storage.getPremiumFeatures(userId);

  return {
    tier,
    isPremium: tier !== "free",
    subscription: sub
      ? {
          status: sub.status,
          tier: sub.tier,
          currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    credits: {
      balance: credits.balance,
      monthlyAllotment: credits.monthlyAllotment,
      lastResetAt: credits.lastResetAt ? credits.lastResetAt.toISOString() : null,
    },
    features: featureRows.map((f) => f.featureKey),
  };
}

// Feature catalog for the pricing / premium UI.
export function featureCatalog() {
  return FEATURE_CATALOG;
}

// Try to consume AI credits for a signed-in customer. Ensures the balance row
// exists (seeded to the customer's plan allotment) before the atomic decrement.
// Returns the remaining balance, or null when the customer is out of credits.
export async function consumeCredits(userId: string, cost: number): Promise<number | null> {
  const user = await storage.getUser(userId);
  const plan = getPlan((user?.premiumTier as TierKey) || "free");
  await storage.ensureAiCredits(userId, plan.monthlyCredits);
  const row = await storage.consumeAiCredit(userId, cost);
  return row ? row.balance : null;
}
