// Phase 68A — Plan / tier catalog for the shared monetization backend.
// Stripe price IDs come from env so the same code works across test/live mode
// and degrades gracefully when Stripe is not configured (dev).

export type TierKey = "free" | "starter" | "pro";

export interface PlanFeature {
  key: string;
  label: string;
}

export interface Plan {
  tier: TierKey;
  name: string;
  description: string;
  priceMonthlyCents: number;
  stripePriceEnv: string | null;
  monthlyCredits: number;
  features: string[];
}

// Premium feature catalog (feature_key -> human label).
export const FEATURE_CATALOG: PlanFeature[] = [
  { key: "concierge_premium", label: "Premium AI Concierge (priority model, deeper answers)" },
  { key: "concierge_unlimited_history", label: "Full conversation memory & recall" },
  { key: "priority_support", label: "Priority support" },
  { key: "early_access", label: "Early access to new apps & tools" },
];

export const PLANS: Record<TierKey, Plan> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Get started with the Elevate360 AI Concierge.",
    priceMonthlyCents: 0,
    stripePriceEnv: null,
    monthlyCredits: 15,
    features: [],
  },
  starter: {
    tier: "starter",
    name: "Starter",
    description: "More AI credits and premium concierge access.",
    priceMonthlyCents: 900,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    monthlyCredits: 200,
    features: ["concierge_premium", "concierge_unlimited_history"],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    description: "Maximum AI credits, priority support, and early access.",
    priceMonthlyCents: 2900,
    stripePriceEnv: "STRIPE_PRICE_PRO",
    monthlyCredits: 1000,
    features: ["concierge_premium", "concierge_unlimited_history", "priority_support", "early_access"],
  },
};

export const PAID_TIERS: TierKey[] = ["starter", "pro"];

export function getPlan(tier: string | null | undefined): Plan {
  if (tier && (tier === "starter" || tier === "pro")) return PLANS[tier];
  return PLANS.free;
}

// Resolve the configured Stripe price ID for a tier (null if not configured).
export function getStripePriceId(tier: TierKey): string | null {
  const plan = PLANS[tier];
  if (!plan.stripePriceEnv) return null;
  return process.env[plan.stripePriceEnv] ?? null;
}

// Map a Stripe price ID back to a tier key (for webhook handling).
export function tierFromPriceId(priceId: string | null | undefined): TierKey | null {
  if (!priceId) return null;
  for (const tier of PAID_TIERS) {
    if (getStripePriceId(tier) === priceId) return tier;
  }
  return null;
}

// Public-safe plan shape for the pricing page / API.
export function publicPlans() {
  return (Object.keys(PLANS) as TierKey[]).map((tier) => {
    const p = PLANS[tier];
    return {
      tier: p.tier,
      name: p.name,
      description: p.description,
      priceMonthlyCents: p.priceMonthlyCents,
      monthlyCredits: p.monthlyCredits,
      features: p.features.map((k) => FEATURE_CATALOG.find((f) => f.key === k)?.label ?? k),
      featureKeys: p.features,
      available: tier === "free" || getStripePriceId(tier) !== null,
    };
  });
}
