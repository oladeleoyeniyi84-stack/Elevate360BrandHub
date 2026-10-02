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
  PAID_TIERS,
  publicPlans,
  getStripePriceId,
  tierFromPriceId,
  isValidTier,
  type TierKey,
} from "../billing/plans";
import {
  getPremiumStatus,
  applyTier,
  applyTierWithGrant,
  featureCatalog,
} from "../billing/premiumService";
import { rateLimit } from "../routes";

export const customerBillingRouter = Router();

// Phase 72.7 — hardened canonical origin for billing return URLs.
// Deterministic, environment-driven only: NEVER derived from the request
// (no Host header, no Origin reflection → no open-redirect surface).
// Priority: PUBLIC_BASE_URL > CANONICAL_HOST > RENDER_EXTERNAL_HOSTNAME >
// REPLIT_DOMAINS (dev) > localhost. Blank/whitespace values are skipped
// (`"" ?? x` would previously short-circuit and yield "https://").
// HTTPS is forced for every non-localhost host. Exported for tests.
export function originFor(): string {
  const candidates = [
    process.env.PUBLIC_BASE_URL,
    process.env.CANONICAL_HOST,
    process.env.RENDER_EXTERNAL_HOSTNAME,
    (process.env.REPLIT_DOMAINS ?? "").split(",")[0],
  ];
  let rawHost = "localhost:5000";
  for (const c of candidates) {
    const trimmed = (c ?? "").trim();
    if (trimmed) { rawHost = trimmed; break; }
  }
  // Strict host extraction: strip protocol, drop credentials (userinfo),
  // drop any path/query/fragment. Only EXACT loopback hostnames get http —
  // `localhost.evil.example` is NOT local and is forced to https.
  let cleanHost = rawHost.replace(/^https?:\/\//i, "");
  const atIdx = cleanHost.lastIndexOf("@");
  if (atIdx !== -1) cleanHost = cleanHost.slice(atIdx + 1);
  cleanHost = cleanHost.split(/[/?#]/)[0].replace(/\/+$/, "") || "localhost:5000";
  const hostname = cleanHost.split(":")[0].toLowerCase();
  const isLoopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1" || hostname === "0.0.0.0";
  return isLoopback ? `http://${cleanHost}` : `https://${cleanHost}`;
}

function publicUser(u: { id: string; email: string | null; premiumTier: string }) {
  return { id: u.id, email: u.email, premiumTier: u.premiumTier };
}

function establishCustomerSession(req: any, res: any, user: { id: string; email: string | null; premiumTier: string }, status: number) {
  const dashboardAuthed = (req.session as any)?.dashboardAuthed === true;
  const dashboardRole = (req.session as any)?.dashboardRole;
  const deliveryOwner = (req.session as any)?.deliveryOwner;
  req.session.regenerate((regenerateError: unknown) => {
    if (regenerateError) {
      console.error("[customer-auth] session regeneration failed");
      return res.status(500).json({ message: "Session error" });
    }
    req.session.customerId = user.id;
    if (deliveryOwner) (req.session as any).deliveryOwner = deliveryOwner;
    if (dashboardAuthed) {
      (req.session as any).dashboardAuthed = true;
      (req.session as any).dashboardRole = dashboardRole;
    }
    req.session.save((saveError: unknown) => {
      if (saveError) {
        console.error("[customer-auth] session save failed");
        return res.status(500).json({ message: "Session error" });
      }
      return res.status(status).json({ user: publicUser(user) });
    });
  });
}

// ─── Auth ───────────────────────────────────────────────────────────────────
customerBillingRouter.post("/api/auth/signup", rateLimit(5, 60 * 60), async (req, res) => {
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

  return establishCustomerSession(req, res, user, 201);
});

customerBillingRouter.post("/api/auth/login", rateLimit(10, 15 * 60), async (req, res) => {
  const parsed = customerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const user = await storage.getUserByEmail(parsed.data.email.toLowerCase());
  const ok = user && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!user || !ok) return res.status(401).json({ message: "Invalid email or password" });

  return establishCustomerSession(req, res, user, 200);
});

customerBillingRouter.post("/api/auth/logout", (req, res) => {
  // Rotate the identifier while clearing only the customer principal.
  const dashboardAuthed = (req.session as any)?.dashboardAuthed === true;
  const dashboardRole = (req.session as any)?.dashboardRole;
  req.session.regenerate((error) => {
    if (error) return res.status(500).json({ message: "Could not end customer session." });
    if (dashboardAuthed) {
      (req.session as any).dashboardAuthed = true;
      (req.session as any).dashboardRole = dashboardRole;
    }
    req.session.save((saveError) => {
      if (saveError) return res.status(500).json({ message: "Could not end customer session." });
      res.json({ ok: true });
    });
  });
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
  if (!PAID_TIERS.includes(tier)) {
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
  if (!metadataUserId || !stripeCustomerId) return null;
  const u = await storage.getUser(metadataUserId);
  // Stripe metadata is routing context, not ownership authority. A lifecycle
  // event may affect a user only when its customer matches the durable binding
  // created by our authenticated checkout.
  if (u?.stripeCustomerId === stripeCustomerId) return u.id;
  return null;
}

export async function handleBillingEvent(event: any): Promise<void> {
  const stripe = getStripeClient();
  // Trusted per-event ordering value (Stripe sets `created` server-side).
  const eventCreated: Date | null = event.created ? new Date(event.created * 1000) : null;

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    if (session?.mode !== "subscription") return; // ignore one-time order checkouts
    const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined;
    const subId = session.subscription;
    if (!userId || !subId || !stripe) return;
    const ownedUserId = await resolveUserId(
      userId,
      typeof session.customer === "string" ? session.customer : session.customer?.id,
    );
    if (!ownedUserId) {
      console.warn(`[billing] checkout ownership mismatch session=${session.id}; skipping`);
      return;
    }
    const sub = await stripe.subscriptions.retrieve(subId);
    const subCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (subCustomerId !== (typeof session.customer === "string" ? session.customer : session.customer?.id)) {
      console.warn(`[billing] subscription ownership mismatch sub=${subId}; skipping`);
      return;
    }
    await syncSubscription(ownedUserId, sub, eventCreated);
    return;
  }

  if (event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated") {
    const sub = event.data?.object;
    const customerId = typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id;
    const userId = await resolveUserId(sub?.metadata?.userId, customerId);
    if (!userId) return;
    await syncSubscription(userId, sub, eventCreated);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data?.object;
    const customerId = typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id;
    const userId = await resolveUserId(sub?.metadata?.userId, customerId);
    if (!userId) return;
    const canceledTier: TierKey = isValidTier(sub.metadata?.tier) ? sub.metadata.tier : "free";
    // Atomic ordering-enforced write: the staleness decision and the state
    // transition are one SQL statement (see upsertSubscriptionIfNewer). Only
    // the winner may touch user-level entitlements.
    const won = await storage.upsertSubscriptionIfNewer({
      userId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
      status: "canceled",
      tier: canceledTier,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
      cancelAtPeriodEnd: false,
      lastEventAt: eventCreated ?? undefined,
    });
    if (!won) {
      console.log(`[billing] billing_subscription_stale_event_skipped user=${userId} sub=${sub.id} (stale deletion event lost ordering race)`);
      return;
    }
    await applyEntitlementAfterLoss(userId, sub.id, "billing_subscription_cancelled");
  }
}

// Phase 72.7 — shared entitlement re-derivation for EVERY lifecycle transition
// that removes a subscription's eligibility (deleted, canceled, unpaid,
// incomplete_expired). A late event for an OLD subscription must not revoke a
// newer replacement subscription (different Stripe id) the customer has since
// started: re-derive the user's entitlement from the newest remaining
// active/trialing subscription instead of unconditionally downgrading to free.
async function applyEntitlementAfterLoss(userId: string, lostSubId: string | undefined, logEvent: string): Promise<void> {
  // Active/trialing-only + excluded-id filtering happens IN SQL — a
  // later-ending past_due row must never shadow a valid active replacement.
  const replacement = await storage.getEligibleReplacementSubscriptionForUser(userId, lostSubId);
  if (replacement && isValidTier(replacement.tier)) {
    await applyTier(userId, replacement.tier as TierKey, false);
    console.log(
      `[billing] ${logEvent} user=${userId} sub=${lostSubId} — entitlement kept on newer active sub ${replacement.stripeSubscriptionId} (${replacement.tier})`,
    );
  } else {
    await applyTier(userId, "free", false);
    console.log(`[billing] ${logEvent} user=${userId} sub=${lostSubId} tier=free`);
  }
}

async function syncSubscription(userId: string, sub: any, eventCreated: Date | null = null, isReconcile = false): Promise<void> {
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  // Price configuration is the commercial allowlist. Stripe metadata can help
  // route an event but can never grant a tier for an unknown/arbitrary price.
  const resolvedTier = tierFromPriceId(priceId);

  // Validate the resolved tier BEFORE any database write. An unknown tier (e.g. an
  // out-of-band Stripe subscription with metadata.tier="elite") is logged and
  // skipped — we never throw (which would 500 the webhook and trigger infinite
  // Stripe retries) and never write a partial subscription row that would leave
  // the user on a tier with no plan/credits/features.
  if (!resolvedTier || !isValidTier(resolvedTier)) {
    console.warn(
      `[billing] Unknown subscription tier "${resolvedTier}" for user ${userId} (sub ${sub?.id}); skipping sync (no DB write).`,
    );
    return;
  }
  const tier: TierKey = resolvedTier;
  const active = sub.status === "active" || sub.status === "trialing";

  // Phase 72.7 — credit-grant idempotency boundary. Commercial policy
  // (documented, unchanged): the monthly credit balance is reset to the plan
  // allotment exactly once per (subscription, tier, billing period) — first
  // activation, tier change (up/downgrade), or period advance (renewal).
  // One lifecycle emits several legitimate events (checkout.session.completed
  // + subscription.created + subscription.updated) and Stripe may redeliver
  // ANY of them, concurrently and out of order; none of those repeats may
  // restore spent credits. The grant decision therefore does NOT rely on
  // comparing the stored row (only valid for serial in-order delivery) — it is
  // recorded durably as a claim in the idempotency ledger keyed by
  // (subscription id, tier, period end), which is atomic under concurrency and
  // immune to redelivery/ordering.
  const existing = sub.id ? await storage.getSubscriptionByStripeId(sub.id) : undefined;
  const incomingPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

  // Ordering enforcement is ATOMIC with the write (single conditional SQL
  // statement — see storage.upsertSubscriptionIfNewer). The row lock
  // serializes concurrent lifecycle events for this subscription and the
  // conditions re-evaluate against the committed row, so an older event can
  // never overwrite newer state even when two deliveries interleave. Guards:
  // event-time monotonic (Stripe event.created), billing-period monotonic,
  // and terminal cancellation (an active event can't resurrect a canceled
  // row unless it describes a strictly newer period). Losers apply NOTHING —
  // no subscription write, no entitlement, no credits.
  const won = await storage.upsertSubscriptionIfNewer({
    userId,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
    status: sub.status,
    tier,
    currentPeriodEnd: incomingPeriodEnd ?? undefined,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    lastEventAt: eventCreated ?? undefined,
  });
  if (!won) {
    console.log(
      `[billing] billing_subscription_stale_event_skipped user=${userId} sub=${sub.id} (lost atomic ordering guard: older/tied event-time, older period, or post-cancellation)`,
    );
    // Same-second ties (event.created is second-resolution, not a total
    // order) and unknowable orderings are resolved from the AUTHORITATIVE
    // source: retrieve the live subscription from Stripe and apply that
    // current object, stamped with retrieval time (the snapshot subsumes
    // every event created before it). One level only — a reconcile that
    // loses simply defers to the even newer committed state.
    if (!isReconcile && eventCreated && sub.id) {
      const stripe = getStripeClient();
      if (stripe) {
        try {
          const live = await stripe.subscriptions.retrieve(sub.id);
          await syncSubscription(userId, live, new Date(), true);
        } catch (e: any) {
          console.log(
            `[billing] billing_subscription_reconcile_unavailable sub=${sub.id} — keeping committed state (retry/next event converges).`,
          );
        }
      }
    }
    return;
  }

  if (active) {
    // Exactly-once credit grant per (subscription, tier, billing period): the
    // grant marker commits in the SAME transaction as the balance reset (see
    // storage.applyPlanCreditsWithGrant), so no crash timing can double-credit
    // or silently lose an activation's credits — the webhook retry self-heals.
    const grantKey = `credit_grant:${sub.id}:${tier}:${incomingPeriodEnd?.getTime() ?? 0}`;
    const granted = await applyTierWithGrant(userId, tier, grantKey, Boolean(sub.livemode));
    console.log(
      `[billing] billing_subscription_${existing ? "updated" : "activated"} user=${userId} tier=${tier} creditReset=${granted}`,
    );
  } else if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
    // Ineligible transition: re-derive entitlement (a replacement active
    // subscription under a different Stripe id keeps its plan; otherwise free).
    await applyEntitlementAfterLoss(userId, sub.id, `billing_subscription_updated status=${sub.status}`);
  }
}
