// Phase 72.3 — Founder-only Revenue Intelligence dashboard.
// Mirrors the FunnelAnalytics PIN-gate pattern (sessionStorage e360_dashboard_auth).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, Eye, EyeOff, Loader2, RefreshCw, TrendingDown, TrendingUp, Users,
  ArrowDown, Megaphone, Globe, Layers, Package, Monitor, Compass, Bot, AlertTriangle,
  FileText, CreditCard,
} from "lucide-react";
import type { RevenueIntelSummary, RevenueBreakdownItem, RevenueTrendBucket } from "@shared/types/revenue";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const res = await fetch("/api/dashboard/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) { sessionStorage.setItem("e360_dashboard_auth", "true"); onAuth(); }
    else { setError("Invalid PIN."); setPin(""); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}>
            <DollarSign className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Revenue Analytics</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-revenue-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-revenue-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-revenue-login" className="btn-primary w-full py-3">Access Revenue Analytics</button>
        </form>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, testId }: {
  icon: any; label: string; value: string; sub?: string; testId: string;
}) {
  return (
    <div className="lux-card">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><Icon className="h-4 w-4 text-[#F4A62A]" /> {label}</div>
      <p className="text-2xl font-black text-white mt-2" data-testid={testId}>{value}</p>
      {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function MoneyList({ title, icon: Icon, items, emptyText }: {
  title: string; icon: any; items: RevenueBreakdownItem[]; emptyText: string;
}) {
  return (
    <div className="lux-card">
      <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3"><Icon className="h-4 w-4 text-[#F4A62A]" /> {title}</div>
      {items.length === 0 ? (
        <p className="text-white/35 text-sm">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-sm" data-testid={`row-${title.toLowerCase().replace(/\s+/g, "-")}-${i}`}>
              <span className="text-white/75 truncate mr-3">{item.name}</span>
              <span className="text-white font-bold whitespace-nowrap">{money(item.totalCents)} <span className="text-white/35 font-normal">· {item.count}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type PeriodTab = "daily" | "weekly" | "monthly";

function TrendTable({ buckets }: { buckets: RevenueTrendBucket[] }) {
  if (buckets.length === 0) return <p className="text-white/35 text-sm mt-3">No revenue activity in this period yet.</p>;
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Period</th>
            <th className="text-right py-2 px-2">Gross</th>
            <th className="text-right py-2 px-2">Refunds</th>
            <th className="text-right py-2 px-2">Net</th>
            <th className="text-right py-2 pl-2">Payments</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.bucket} className="border-t border-white/5 text-white/80" data-testid={`row-revenue-period-${b.bucket}`}>
              <td className="py-2 pr-4 text-white/60">{b.bucket}</td>
              <td className="text-right py-2 px-2">{money(b.grossCents)}</td>
              <td className="text-right py-2 px-2 text-red-400/80">{b.refundCents > 0 ? `−${money(b.refundCents)}` : "—"}</td>
              <td className="text-right py-2 px-2 font-bold text-white">{money(b.netCents)}</td>
              <td className="text-right py-2 pl-2">{b.payments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Console() {
  const [periodTab, setPeriodTab] = useState<PeriodTab>("daily");
  const query = useQuery<RevenueIntelSummary>({
    queryKey: ["/api/dashboard/analytics/revenue"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/analytics/revenue");
      if (!res.ok) throw new Error(`Failed to load revenue analytics (${res.status})`);
      return res.json();
    },
  });

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
        <p className="text-white/60">Could not load revenue analytics.</p>
        <button onClick={() => query.refetch()} className="btn-primary px-6 py-2">Retry</button>
      </div>
    );
  }

  const data = query.data;
  const k = data.kpis;
  const maxFunnel = Math.max(...data.revenueFunnel.map((s) => s.count), 1);
  const d = data.diagnostics;
  const integrityIssues = d.duplicatePaymentGroups + d.unmatchedPaidOrders;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <DollarSign className="h-7 w-7" style={{ color: GOLD }} /> Revenue Analytics
            </h1>
            <p className="text-white/50 text-sm mt-1">Revenue Intelligence System · Phase 72.3</p>
          </div>
          <button onClick={() => query.refetch()} data-testid="button-revenue-refresh" className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Stat icon={DollarSign} label="Total Revenue" value={money(k.totalRevenueCents)} sub={`Net ${money(k.netRevenueCents)} after refunds`} testId="stat-revenue-total" />
          <Stat icon={TrendingUp} label="Last 30 Days" value={money(k.revenueLast30dCents)} sub={`7d ${money(k.revenueLast7dCents)} · today ${money(k.revenueTodayCents)}`} testId="stat-revenue-30d" />
          <Stat icon={CreditCard} label="Paid Orders" value={k.paidOrderCount.toLocaleString()} sub={k.averageOrderValueCents !== null ? `Avg order ${money(k.averageOrderValueCents)}` : undefined} testId="stat-revenue-orders" />
          <Stat icon={Bot} label="AI-Assisted Revenue" value={money(k.aiAssistedRevenueCents)} sub={`${k.aiAssistedConversionCount} conversions via Concierge`} testId="stat-revenue-ai" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat icon={Users} label="Revenue / Visitor" value={k.revenuePerVisitorCents !== null ? money(k.revenuePerVisitorCents) : "—"} testId="stat-revenue-per-visitor" />
          <Stat icon={Compass} label="Revenue / Lead" value={k.revenuePerLeadCents !== null ? money(k.revenuePerLeadCents) : "—"} sub={k.leadToRevenuePct !== null ? `${k.leadToRevenuePct}% of leads pay` : undefined} testId="stat-revenue-per-lead" />
          <Stat icon={TrendingDown} label="Refunds" value={money(k.refundTotalCents)} sub={`${d.refundCount} refunds · ${d.failedPaymentCount} failed payments`} testId="stat-revenue-refunds" />
          <Stat icon={Layers} label="Pipeline" value={money(k.pendingPipelineCents)} sub={`Won ${money(k.wonOpportunityCents)} · lost ${money(k.lostOpportunityCents)}`} testId="stat-revenue-pipeline" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-3">Economic Funnel</h2>
              <div className="space-y-0.5">
                {data.revenueFunnel.map((stage, i) => (
                  <div key={stage.key}>
                    {i > 0 && (
                      <div className="flex items-center gap-3 py-1.5 pl-2 text-xs">
                        <ArrowDown className="h-4 w-4 text-white/30" />
                        {stage.conversionPct !== null ? (
                          <>
                            <span className="text-emerald-400 font-semibold">{stage.conversionPct}% continue</span>
                            <span className="text-red-400/80 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {stage.dropOffPct}% drop off</span>
                          </>
                        ) : (
                          <span className="text-white/30">no data yet</span>
                        )}
                      </div>
                    )}
                    <div className="lux-card !py-3" data-testid={`stage-revenue-${stage.key}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/80 text-sm font-semibold">{stage.label}</span>
                        <span className="text-white font-black">{stage.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max((stage.count / maxFunnel) * 100, 2)}%`, background: GOLD }} />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-white/40 text-xs pt-2 pl-1" data-testid="text-revenue-funnel-net">
                  Net revenue through this funnel: <span className="text-white font-bold">{money(data.revenueFunnelNetCents)}</span>
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <MoneyList title="Revenue by Source" icon={Globe} items={data.bySource} emptyText="No revenue recorded yet." />
              <MoneyList title="Top Products" icon={Package} items={data.byProduct} emptyText="No product revenue yet." />
              <MoneyList title="Top Offers" icon={FileText} items={data.byOffer} emptyText="No offer revenue yet." />
              <MoneyList title="Top Plans" icon={Layers} items={data.byPlan} emptyText="No plan revenue yet." />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-3">Attribution</h2>
            <MoneyList title="Top UTM Sources" icon={Globe} items={data.byUtmSource} emptyText="No UTM-attributed revenue yet." />
            <MoneyList title="Top Campaigns" icon={Megaphone} items={data.byCampaign} emptyText="No campaign revenue yet." />
            <MoneyList title="Top Pages" icon={FileText} items={data.byPage} emptyText="No page-attributed revenue yet." />
            <MoneyList title="By Device" icon={Monitor} items={data.byDevice} emptyText="No device data yet." />

            <div className="lux-card" data-testid="card-revenue-diagnostics">
              <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3">
                <AlertTriangle className={`h-4 w-4 ${integrityIssues > 0 ? "text-red-400" : "text-[#F4A62A]"}`} /> Data Integrity
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/75">Duplicate payments</span>
                  <span className={`font-bold ${d.duplicatePaymentGroups > 0 ? "text-red-400" : "text-white"}`} data-testid="text-revenue-dup-payments">{d.duplicatePaymentGroups}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/75">Unmatched paid orders</span>
                  <span className={`font-bold ${d.unmatchedPaidOrders > 0 ? "text-red-400" : "text-white"}`} data-testid="text-revenue-unmatched-orders">{d.unmatchedPaidOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/75">Out-of-order funnel sessions</span>
                  <span className="text-white font-bold" data-testid="text-revenue-out-of-order">{d.outOfOrderFunnelSessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/75">Missing attribution</span>
                  <span className="text-white font-bold" data-testid="text-revenue-missing-attr">{d.missingAttributionCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lux-card mt-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide">Revenue Over Time</h2>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as PeriodTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPeriodTab(tab)}
                  data-testid={`tab-revenue-${tab}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    periodTab === tab ? "text-black" : "text-white/60 bg-white/5 hover:bg-white/10"
                  }`}
                  style={periodTab === tab ? { background: GOLD } : undefined}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <TrendTable buckets={data[periodTab]} />
        </div>

        <div className="lux-card mt-6" data-testid="card-revenue-attribution-note">
          <p className="text-white/40 text-xs leading-relaxed">{data.attributionNote}</p>
        </div>

        <p className="text-white/30 text-xs mt-6">Generated {new Date(data.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function RevenueAnalytics() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
