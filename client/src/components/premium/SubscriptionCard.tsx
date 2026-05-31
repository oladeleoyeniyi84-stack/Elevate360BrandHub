// Phase 68A — shows the customer's current subscription + credits.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { customerApi, type PremiumStatus } from "@/api/customer";
import { CreditMeter } from "./CreditMeter";

const GOLD = "#F4A62A";

export function SubscriptionCard({ status }: { status: PremiumStatus }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await customerApi.openPortal();
      window.location.assign(url);
    } catch (e: any) {
      setError(e.message || "Could not open billing portal.");
      setLoading(false);
    }
  };

  const periodEnd = status.subscription?.currentPeriodEnd
    ? new Date(status.subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6" data-testid="card-subscription">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider">Current plan</p>
          <p className="text-2xl font-bold capitalize" style={{ color: GOLD }} data-testid="text-current-tier">
            {status.tier}
          </p>
        </div>
        {status.subscription && (
          <span className="text-xs rounded-full px-3 py-1 bg-white/10 text-white/70 capitalize" data-testid="text-sub-status">
            {status.subscription.status.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <CreditMeter balance={status.credits.balance} allotment={status.credits.monthlyAllotment} />

      {periodEnd && (
        <p className="text-white/50 text-xs mt-3" data-testid="text-period-end">
          {status.subscription?.cancelAtPeriodEnd ? "Cancels on " : "Renews on "}
          {periodEnd}
        </p>
      )}

      {status.isPremium && (
        <button
          onClick={openPortal}
          disabled={loading}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: GOLD, color: "#0a1124" }}
          data-testid="button-manage-billing"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Manage billing
        </button>
      )}

      {error && <p className="text-red-400 text-xs mt-2" data-testid="text-portal-error">{error}</p>}
    </div>
  );
}
