// Phase 68A — customer account: auth (signup/login) + subscription management.
// Phase 72.7 — billing=success return UX: the query string is treated ONLY as
// a hint to show a "confirming" state; entitlement truth always comes from the
// server via /api/premium/status, refetched on a tightly bounded schedule.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import SEO from "@/components/SEO";
import { useCustomer, usePremiumStatus } from "@/hooks/useCustomer";
import { customerApi, type FeaturesResponse } from "@/api/customer";
import { SubscriptionCard } from "@/components/premium/SubscriptionCard";
import { PlanComparison } from "@/components/premium/PlanComparison";
import { trackFunnelEvent } from "@/lib/funnelAnalytics";

const GOLD = "#F4A62A";

// Bounded confirmation poll: ~30s max (10 refetches, 3s apart). No infinite polling.
const BILLING_POLL_INTERVAL_MS = 3000;
const BILLING_POLL_MAX_ATTEMPTS = 10;

function useBillingReturn() {
  // Read once on mount; never re-parsed so navigation can't re-trigger it.
  const [returnedFromCheckout] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get("billing") === "success";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (returnedFromCheckout) {
      trackFunnelEvent("billing_checkout_returned");
    }
  }, [returnedFromCheckout]);
  return returnedFromCheckout;
}

function BillingConfirmationBanner({
  isPremium,
  refetch,
}: {
  isPremium: boolean;
  refetch: () => void;
}) {
  const [phase, setPhase] = useState<"confirming" | "confirmed" | "timeout">(
    isPremium ? "confirmed" : "confirming",
  );
  const attempts = useRef(0);

  useEffect(() => {
    if (isPremium) {
      setPhase("confirmed");
      return;
    }
    if (phase !== "confirming") return;
    const timer = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > BILLING_POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        setPhase("timeout");
        return;
      }
      refetch();
    }, BILLING_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPremium, phase, refetch]);

  if (phase === "confirmed") {
    return (
      <div
        className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-5 py-4 flex items-start gap-3"
        data-testid="banner-billing-confirmed"
        role="status"
      >
        <CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-400 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold text-emerald-300">Subscription active</p>
          <p className="text-white/60 text-sm mt-0.5">Your payment was received and your plan is now active.</p>
        </div>
      </div>
    );
  }
  if (phase === "timeout") {
    return (
      <div
        className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4 flex items-start gap-3"
        data-testid="banner-billing-timeout"
        role="status"
      >
        <Clock className="h-5 w-5 mt-0.5 text-amber-400 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold text-amber-300">Payment may still be processing</p>
          <p className="text-white/60 text-sm mt-0.5">
            Your payment may still be processing. Refresh shortly or contact support if access is not updated.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className="mb-6 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 flex items-start gap-3"
      data-testid="banner-billing-confirming"
      role="status"
    >
      <Loader2 className="h-5 w-5 mt-0.5 animate-spin shrink-0" style={{ color: GOLD }} aria-hidden="true" />
      <div>
        <p className="font-semibold" style={{ color: GOLD }}>Payment received. We&rsquo;re confirming your subscription.</p>
        <p className="text-white/60 text-sm mt-0.5">This usually takes just a few seconds.</p>
      </div>
    </div>
  );
}

function AuthForm() {
  const { login, signup } = useCustomer();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const active = mode === "login" ? login : signup;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    active.mutate(
      { email, password },
      { onError: (err: any) => setError(err.message || "Something went wrong") }
    );
  };

  return (
    <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-white/[0.04] p-8">
      <h1 className="text-2xl font-bold text-center" data-testid="text-auth-title">
        {mode === "login" ? "Sign in" : "Create your account"}
      </h1>
      <p className="text-white/50 text-sm text-center mt-1">
        Access premium AI Concierge features and manage your plan.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wider">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-white/30"
            data-testid="input-email"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wider">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-white/30"
            data-testid="input-password"
          />
        </div>
        {error && <p className="text-red-400 text-sm" data-testid="text-auth-error">{error}</p>}
        <button
          type="submit"
          disabled={active.isPending}
          className="w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: GOLD, color: "#0a1124" }}
          data-testid="button-auth-submit"
        >
          {active.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
        className="mt-4 w-full text-center text-sm text-white/50 hover:text-white"
        data-testid="button-toggle-mode"
      >
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

function AccountDashboard({ returnedFromCheckout }: { returnedFromCheckout: boolean }) {
  const { user, logout } = useCustomer();
  const { data: status, isLoading, refetch } = usePremiumStatus(true);
  const { data: features } = useQuery<FeaturesResponse>({
    queryKey: ["/api/premium/features"],
    queryFn: () => customerApi.features(),
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider">Signed in as</p>
          <p className="font-semibold" data-testid="text-account-email">{user?.email}</p>
        </div>
        <button
          onClick={() => logout.mutate()}
          className="text-sm text-white/50 hover:text-white"
          data-testid="button-logout"
        >
          Sign out
        </button>
      </div>

      {isLoading || !status ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : (
        <>
          {returnedFromCheckout && (
            <BillingConfirmationBanner isPremium={status.isPremium} refetch={refetch} />
          )}
          <SubscriptionCard status={status} />
          {!status.isPremium && features && (
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4" data-testid="text-upgrade-heading">Upgrade your plan</h2>
              <PlanComparison plans={features.plans} currentTier={status.tier} isAuthenticated />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Account() {
  const { isAuthenticated, isLoading } = useCustomer();
  const returnedFromCheckout = useBillingReturn();

  return (
    <div className="min-h-screen bg-[hsl(220,50%,10%)] text-white">
      <SEO title="Account | Elevate360Official" description="Manage your Elevate360Official account and subscription." path="/account" />
      <div className="max-w-5xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 text-sm hover:text-white" data-testid="link-home">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="mt-10">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
            </div>
          ) : isAuthenticated ? (
            <AccountDashboard returnedFromCheckout={returnedFromCheckout} />
          ) : (
            <AuthForm />
          )}
        </div>
      </div>
    </div>
  );
}
