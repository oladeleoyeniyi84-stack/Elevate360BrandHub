// Phase 68A — Customer auth + billing + premium router.
// Shared monetization backend. Mounted at the app root so it owns the full
// /api/auth, /api/billing and /api/premium paths. Customer identity only —
// never touches founder PIN auth (requireDashboardAuth).
import { Router } from "express";
import { storage } from "../storage";
import {
  customerSignupSchema,
  customerLoginSchema,
} from "@shared/schema";
import {
  hashPassword,
  verifyPassword,
  requireCustomerAuth,
  getCustomerId,
} from "../auth/customerAuth";
import {
  getStripeClient,
  getUncachableStripeClient,
  isStripeConfigured,
} from "../stripeClient";
import {
  PLANS,
  publicPlans,
  getStripePriceId,
  tierFromPriceId,
  isValidTier,
  type TierKey,
} from "../billing/plans";
import {
  getPremiumStatus,
  applyTier,
  featureCatalog,
} from "../billing/premiumService";

export const customerBillingRouter = Router();

function originFor(): string {
  const rawHost =
    process.env.PUBLIC_BASE_URL ??
    process.env.CANONICAL_HOST ??
    process.env.RENDER_EXTERNAL_HOSTNAME ??
    (process.env.REPLIT_DOMAINS ?? "").split(",")[0] ??
    "localhost:5000";
  const cleanHost = rawHost.replace(/^https?:\/\//, "").replace(/\/$/, "") || "localhost:5000";
  return cleanHost.startsWith("localhost") ? `http://${cleanHost}` : `https://${cleanHost}`;
}

function publicUser(u: { id: string; email: string | null; premiumTier: string }) {
  return { id: u.id, email: u.email, premiumTier: u.premiumTier };
}

// ─── Auth ───────────────────────────────────────────────────────────────────
customerBillingRouter.post("/api/auth/signup", async (req, res) => {
  const parsed = customerSignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const email = parsed.data.email.toLowerCase();
  const existing = await storage.getUserByEmail(email);
  if (existing) return res.status(409).json({ message: "An account with this email already exists" });

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await storage.createCustomer(email, passwordHash);
  await storage.ensureAiCredits(user.id, PLANS.free.monthlyCredits);

  // Direct session save (no regenerate) — mirrors founder auth, which persists
  // reliably in production. A regenerate() DELETE on the session store was the
  // prod-only failure that returned "Session error".
  (req.session as any).customerId = user.id;
  req.session.save((err: any) => {
    if (err) {
      console.error("[customer-auth] session save failed (signup)", err?.message || err);
      return res.status(500).json({ message: "Session error" });
    }
    return res.status(201).json({ user: publicUser(user) });
  });
});

customerBillingRouter.post("/api/auth/login", async (req, res) => {
  const parsed = customerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const user = await storage.getUserByEmail(parsed.data.email.toLowerCase());
  const ok = user && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!user || !ok) return res.status(401).json({ message: "Invalid email or password" });

  // Direct session save (no regenerate) — see signup for rationale.
  (req.session as any).customerId = user.id;
  req.session.save((err: any) => {
    if (err) {
      console.error("[customer-auth] session save failed (login)", err?.message || err);
      return res.status(500).json({ message: "Session error" });
    }
    return res.status(200).json({ user: publicUser(user) });
  });
});

customerBillingRouter.post("/api/auth/logout", (req, res) => {
  // Only clear the customer identity; preserve any founder dashboard auth.
  if (req.session) (req.session as any).customerId = undefined;
  req.session?.save(() => res.json({ ok: true }));
});

customerBillingRouter.get("/api/auth/me", async (req, res) => {
  const id = getCustomerId(req);
  if (!id) return res.json({ user: null });
  const user = await storage.getUser(id);
  if (!user) return res.json({ user: null });
  res.json({ user: publicUser(user) });
});

// ─── Premium status / features ────────────────────────────────────────────────
customerBillingRouter.get("/api/premium/status", requireCustomerAuth, async (req, res) => {
  const id = getCustomerId(req)!;
  res.json(await getPremiumStatus(id));
});

// Public: feature catalog + plans. Includes the caller's entitlements if signed in.
customerBillingRouter.get("/api/premium/features", async (req, res) => {
  const id = getCustomerId(req);
  const owned = id ? (await storage.getPremiumFeatures(id)).map((f) => f.featureKey) : [];
  res.json({
    catalog: featureCatalog(),
    plans: publicPlans(),
    owned,
  });
});

// ─── Billing ──────────────────────────────────────────────────────────────────
customerBillingRouter.post("/api/billing/create-checkout", requireCustomerAuth, async (req, res) => {
  const id = getCustomerId(req)!;
  const tier = (req.body?.tier as TierKey) ?? "starter";
  if (tier !== "starter" && tier !== "pro") {
    return res.status(400).json({ message: "Invalid plan tier" });
  }
  if (!isStripeConfigured()) {
    return res.status(503).json({ message: "Billing is not configured yet. Please try again later." });
  }
  const priceId = getStripePriceId(tier);
  if (!priceId) {
    return res.status(503).json({ message: `Plan "${tier}" is not available for purchase yet.` });
  }

  try {
    const user = await storage.getUser(id);
    if (!user) return res.status(401).json({ message: "Sign in required" });
    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await storage.setUserStripeCustomerId(user.id, customerId);
    }

    const origin = originFor();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/account?billing=success`,
      cancel_url: `${origin}/pricing?billing=cancelled`,
      subscription_data: { metadata: { userId: user.id, tier } },
      metadata: { userId: user.id, tier },
    } as any);

    res.json({ url: session.url });
  } catch (e: any) {
    console.error("[billing] create-checkout error:", e.message);
    if (e?.type === "StripeInvalidRequestError") {
      return res.status(400).json({ message: e.message ?? "Invalid checkout parameters." });
    }
    res.status(500).json({ message: "Could not start checkout." });
  }
});

customerBillingRouter.post("/api/billing/portal", requireCustomerAuth, async (req, res) => {
  const id = getCustomerId(req)!;
  if (!isStripeConfigured()) {
    return res.status(503).json({ message: "Billing is not configured yet." });
  }
  try {
    const user = await storage.getUser(id);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ message: "No billing account found. Subscribe to a plan first." });
    }
    const stripe = await getUncachableStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${originFor()}/account`,
    });
    res.json({ url: session.url });
  } catch (e: any) {
    console.error("[billing] portal error:", e.message);
    res.status(500).json({ message: "Could not open billing portal." });
  }
});

// NOTE: subscription webhook events are dispatched from the EXISTING
// /api/stripe/webhook endpoint (server/routes.ts) via handleBillingEvent below.
// We deliberately do NOT register a second webhook endpoint — each Stripe
// endpoint has its own signing secret, and we share one STRIPE_WEBHOOK_SECRET.

// Resolve the internal user id for a Stripe subscription/customer.
async function resolveUserId(metadataUserId: string | undefined, stripeCustomerId: string | undefined): Promise<string | null> {
  if (metadataUserId) {
    const u = await storage.getUser(metadataUserId);
    if (u) return u.id;
  }
  // Fallback: not indexed, but customer id is stable; scan is acceptable at this volume.
  return null;
}

export async function handleBillingEvent(event: any): Promise<void> {
  const stripe = getStripeClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    if (session?.mode !== "subscription") return; // ignore one-time order checkouts
    const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined;
    const subId = session.subscription;
    if (!userId || !subId || !stripe) return;
    const sub = await stripe.subscriptions.retrieve(subId);
    await syncSubscription(userId, sub);
    return;
  }

  if (event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated") {
    const sub = event.data?.object;
    const userId = await resolveUserId(sub?.metadata?.userId, sub?.customer);
    if (!userId) return;
    await syncSubscription(userId, sub);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data?.object;
    const userId = await resolveUserId(sub?.metadata?.userId, sub?.customer);
    if (!userId) return;
    const canceledTier: TierKey = isValidTier(sub.metadata?.tier) ? sub.metadata.tier : "free";
    await storage.upsertSubscription({
      userId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
      status: "canceled",
      tier: canceledTier,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
      cancelAtPeriodEnd: false,
    });
    await applyTier(userId, "free", false);
  }
}

async function syncSubscription(userId: string, sub: any): Promise<void> {
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const resolvedTier = tierFromPriceId(priceId) ?? sub.metadata?.tier ?? "starter";

  // Validate the resolved tier BEFORE any database write. An unknown tier (e.g. an
  // out-of-band Stripe subscription with metadata.tier="elite") is logged and
  // skipped — we never throw (which would 500 the webhook and trigger infinite
  // Stripe retries) and never write a partial subscription row that would leave
  // the user on a tier with no plan/credits/features.
  if (!isValidTier(resolvedTier)) {
    console.warn(
      `[billing] Unknown subscription tier "${resolvedTier}" for user ${userId} (sub ${sub?.id}); skipping sync (no DB write).`,
    );
    return;
  }
  const tier: TierKey = resolvedTier;
  const active = sub.status === "active" || sub.status === "trialing";

  await storage.upsertSubscription({
    userId,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
    status: sub.status,
    tier,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  });

  if (active) {
    // Top up credits on activation/renewal.
    await applyTier(userId, tier, true);
  } else if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
    await applyTier(userId, "free", false);
  }
}
