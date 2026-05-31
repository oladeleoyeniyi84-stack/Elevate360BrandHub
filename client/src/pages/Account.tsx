// Phase 68A — customer account: auth (signup/login) + subscription management.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import { useCustomer, usePremiumStatus } from "@/hooks/useCustomer";
import { customerApi, type FeaturesResponse } from "@/api/customer";
import { SubscriptionCard } from "@/components/premium/SubscriptionCard";
import { PlanComparison } from "@/components/premium/PlanComparison";

const GOLD = "#F4A62A";

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

function AccountDashboard() {
  const { user, logout } = useCustomer();
  const { data: status, isLoading } = usePremiumStatus(true);
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
            <AccountDashboard />
          ) : (
            <AuthForm />
          )}
        </div>
      </div>
    </div>
  );
}
