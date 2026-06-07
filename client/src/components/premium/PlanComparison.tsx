// Phase 68A — pricing plan comparison grid with checkout CTAs.
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { customerApi, type PublicPlan } from "@/api/customer";

const GOLD = "#F4A62A";

export function PlanComparison({
  plans,
  currentTier,
  isAuthenticated,
}: {
  plans: PublicPlan[];
  currentTier?: string;
  isAuthenticated: boolean;
}) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async (tier: "starter" | "pro" | "elite") => {
    setError(null);
    if (!isAuthenticated) {
      window.location.assign("/account?next=pricing");
      return;
    }
    setLoadingTier(tier);
    try {
      const { url } = await customerApi.createCheckout(tier);
      window.location.assign(url);
    } catch (e: any) {
      setError(e.message || "Could not start checkout.");
      setLoadingTier(null);
    }
  };

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          const price = (plan.priceMonthlyCents / 100).toFixed(plan.priceMonthlyCents % 100 === 0 ? 0 : 2);
          return (
            <div
              key={plan.tier}
              className="rounded-2xl border bg-white/[0.04] p-6 flex flex-col"
              style={{ borderColor: plan.tier === "pro" ? GOLD : "rgba(255,255,255,0.1)" }}
              data-testid={`card-plan-${plan.tier}`}
            >
              <p className="text-lg font-bold text-white">{plan.name}</p>
              <p className="text-white/50 text-sm mt-1 min-h-[40px]">{plan.description}</p>
              <p className="mt-4">
                <span className="text-3xl font-bold" style={{ color: GOLD }} data-testid={`text-price-${plan.tier}`}>
                  ${price}
                </span>
                <span className="text-white/40 text-sm">/mo</span>
              </p>
              <p className="text-white/60 text-sm mt-2" data-testid={`text-credits-${plan.tier}`}>
                {plan.monthlyCredits} AI credits / month
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: GOLD }} />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.tier === "free" ? (
                <div className="mt-6 text-center text-xs text-white/40" data-testid="text-free-note">
                  {isCurrent ? "Your current plan" : "Included by default"}
                </div>
              ) : isCurrent ? (
                <div
                  className="mt-6 rounded-xl py-2.5 text-sm font-semibold text-center bg-white/10 text-white/70"
                  data-testid={`text-current-${plan.tier}`}
                >
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => subscribe(plan.tier as "starter" | "pro" | "elite")}
                  disabled={loadingTier === plan.tier || !plan.available}
                  className="mt-6 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: GOLD, color: "#0a1124" }}
                  data-testid={`button-subscribe-${plan.tier}`}
                >
                  {loadingTier === plan.tier && <Loader2 className="h-4 w-4 animate-spin" />}
                  {plan.available ? `Choose ${plan.name}` : "Coming soon"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-red-400 text-sm mt-4 text-center" data-testid="text-checkout-error">{error}</p>}
    </div>
  );
}
