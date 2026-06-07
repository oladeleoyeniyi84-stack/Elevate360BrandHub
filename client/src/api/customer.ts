// Phase 68A — Customer / billing / premium API client.
export interface CustomerUser {
  id: string;
  email: string | null;
  premiumTier: string;
}

export interface PremiumStatus {
  tier: "free" | "starter" | "pro" | "elite";
  isPremium: boolean;
  subscription: {
    status: string;
    tier: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  credits: { balance: number; monthlyAllotment: number; lastResetAt: string | null };
  features: string[];
}

export interface PublicPlan {
  tier: "free" | "starter" | "pro" | "elite";
  name: string;
  description: string;
  priceMonthlyCents: number;
  monthlyCredits: number;
  features: string[];
  featureKeys: string[];
  available: boolean;
}

export interface FeaturesResponse {
  catalog: { key: string; label: string }[];
  plans: PublicPlan[];
  owned: string[];
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || `Request failed (${res.status})`);
  return data;
}

const POST = (url: string, body?: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

export const customerApi = {
  async me(): Promise<CustomerUser | null> {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const data = await jsonOrThrow(res);
    return data.user ?? null;
  },
  async signup(email: string, password: string): Promise<CustomerUser> {
    const data = await jsonOrThrow(await POST("/api/auth/signup", { email, password }));
    return data.user;
  },
  async login(email: string, password: string): Promise<CustomerUser> {
    const data = await jsonOrThrow(await POST("/api/auth/login", { email, password }));
    return data.user;
  },
  async logout(): Promise<void> {
    await POST("/api/auth/logout");
  },
  async premiumStatus(): Promise<PremiumStatus> {
    return jsonOrThrow(await fetch("/api/premium/status", { credentials: "include" }));
  },
  async features(): Promise<FeaturesResponse> {
    return jsonOrThrow(await fetch("/api/premium/features", { credentials: "include" }));
  },
  async createCheckout(tier: "starter" | "pro" | "elite"): Promise<{ url: string }> {
    return jsonOrThrow(await POST("/api/billing/create-checkout", { tier }));
  },
  async openPortal(): Promise<{ url: string }> {
    return jsonOrThrow(await POST("/api/billing/portal"));
  },
};
