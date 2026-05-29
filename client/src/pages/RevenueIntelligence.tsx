import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign, Eye, EyeOff, Loader2, Sparkles, TrendingUp, TrendingDown, Minus,
  Lightbulb, AlertTriangle, CheckCircle2, MessageSquare, FileText, RefreshCw,
  Users, Send, ShoppingBag, Filter, CalendarCheck, LineChart, Repeat,
} from "lucide-react";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);

type Insight = {
  id: number;
  kind: "opportunity" | "risk" | "action";
  area: string;
  title: string;
  detail: string;
  priority: number;
  confidence: number;
  status: string;
  source: string;
  createdAt: string;
};

type HorizonForecast = {
  horizonDays: number;
  label: string;
  current: number;
  projected: number;
  low: number;
  high: number;
  changePct: number;
  trend: "up" | "down" | "flat";
  confidence: number;
};

type Overview = {
  generatedAt: string;
  snapshot: {
    totals: { combinedRevenueCents: number; stripeRevenueCents: number; wonRevenueCents: number; paidOrders: number; wonDeals: number; avgOrderValueCents: number };
    attribution: {
      monthlySeries: { month: string; total: number; stripeRevenue: number; wonRevenue: number }[];
      byOffer: { name: string; revenue: number; count: number; avgValue: number }[];
      byIntent: { intent: string; revenue: number; count: number }[];
      bySource: { source: string; revenue: number; count: number }[];
      topPaths: { intent: string; offer: string; revenue: number; count: number }[];
    };
    bookings: { total: number; pending: number; confirmed: number; last30Days: number; bookedLeads: number; wonLeads: number; bookingToWonRate: number; byStatus: { status: string; count: number }[] };
    aiOps: { openai: string; deepseek: string; premiumModel: string; automationModel: string };
  };
  clv: {
    totalCustomers: number; repeatCustomers: number; repeatRate: number;
    avgLtvCents: number; medianLtvCents: number; avgOrdersPerCustomer: number;
    top20RevenueSharePct: number;
    segments: { tier: string; customers: number; revenueCents: number; sharePct: number }[];
    topCustomers: { label: string; orders: number; totalCents: number; firstOrder: string; lastOrder: string }[];
    cohorts: { month: string; customers: number; revenueCents: number }[];
  };
  offers: {
    offers: { name: string; revenueCents: number; units: number; avgValueCents: number; revenueSharePct: number; recommended: number; accepted: number; acceptanceRate: number }[];
    bestSeller: { name: string } | null;
    highestAvgValue: { name: string } | null;
    bestAcceptance: { name: string; acceptanceRate: number } | null;
  };
  funnel: {
    stages: { name: string; count: number; rate: number }[];
    steps: { from: string; to: string; fromCount: number; toCount: number; conversionPct: number; dropOffPct: number }[];
    biggestLeak: { from: string; to: string; dropOffPct: number; conversionPct: number } | null;
    overallConversionPct: number;
  };
  forecast: { horizons: HorizonForecast[]; dailyRunRateCents: number };
  insights: { opportunities: Insight[]; risks: Insight[]; actions: Insight[] };
  latestReports: { id: number; periodType: string; title: string; createdAt: string }[];
};

type Report = { id: number; periodType: string; title: string; summary: string; sections: any; createdAt: string };

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
          <h1 className="text-2xl font-bold text-white">Revenue Intelligence</h1>
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
          <button type="submit" data-testid="button-revenue-login" className="btn-primary w-full py-3">Access Revenue Intelligence</button>
        </form>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="lux-card">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><Icon className="h-4 w-4 text-[#F4A62A]" /> {label}</div>
      <p className="text-2xl font-black text-white mt-2">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/55">{label}</span><span className="text-white font-medium">{value}</span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-white/40" />;
}

function InsightCard({ item, onStatus }: { item: Insight; onStatus: (id: number, status: string) => void }) {
  const tone =
    item.kind === "opportunity" ? { icon: Lightbulb, color: "text-emerald-400", border: "border-emerald-400/20" }
    : item.kind === "risk" ? { icon: AlertTriangle, color: "text-red-400", border: "border-red-400/20" }
    : { icon: CheckCircle2, color: "text-[#F4A62A]", border: "border-[#F4A62A]/20" };
  const Icon = tone.icon;
  return (
    <div className={`lux-card border ${tone.border}`} data-testid={`card-insight-${item.id}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${tone.color}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5">{item.area}</span>
            <span className="text-[10px] text-[#F4A62A]">priority {item.priority}</span>
            <span className="text-[10px] text-white/40">confidence {item.confidence}%</span>
          </div>
          <h3 className="font-semibold text-white mt-1.5" data-testid={`text-insight-title-${item.id}`}>{item.title}</h3>
          <p className="text-sm text-white/60 mt-1 whitespace-pre-line">{item.detail}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => onStatus(item.id, "acknowledged")} data-testid={`button-ack-${item.id}`}
              className="text-[11px] text-white/60 hover:text-white border border-white/15 rounded-lg px-2.5 py-1">Acknowledge</button>
            <button onClick={() => onStatus(item.id, "dismissed")} data-testid={`button-dismiss-${item.id}`}
              className="text-[11px] text-white/40 hover:text-white/70 px-2.5 py-1">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/70 truncate pr-2">{label}</span>
        <span className="text-white/50 shrink-0">{sub}</span>
      </div>
      <div className="h-2 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD }} />
      </div>
    </div>
  );
}

function Console() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<
    "briefing" | "revenue" | "clv" | "offers" | "funnel" | "bookings" | "forecasts" | "insights" | "copilot" | "reports"
  >("briefing");

  const overview = useQuery<Overview>({
    queryKey: ["/api/admin/revenue-intel/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/revenue-intel/overview", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); window.location.reload(); }
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const regen = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/revenue-intel/insights/generate", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/revenue-intel/overview"] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`/api/admin/revenue-intel/insights/${id}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/revenue-intel/overview"] }),
  });

  const onStatus = (id: number, status: string) => setStatus.mutate({ id, status });

  const tabs = [
    { id: "briefing", label: "Briefing" },
    { id: "revenue", label: "Revenue" },
    { id: "clv", label: "CLV" },
    { id: "offers", label: "Offers" },
    { id: "funnel", label: "Funnel" },
    { id: "bookings", label: "Bookings" },
    { id: "forecasts", label: "Forecasts" },
    { id: "insights", label: "Insights" },
    { id: "copilot", label: "Copilot" },
    { id: "reports", label: "Reports" },
  ] as const;

  const snap = overview.data?.snapshot;
  const ins = overview.data?.insights;
  const clv = overview.data?.clv;
  const offers = overview.data?.offers;
  const funnel = overview.data?.funnel;
  const forecast = overview.data?.forecast;
  const maxOfferRev = Math.max(1, ...(snap?.attribution.byOffer ?? []).map((o) => o.revenue));

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
              <DollarSign className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Revenue Intelligence</h1>
              <p className="text-white/40 text-xs">Phase 65 · executive revenue intelligence engine</p>
            </div>
          </div>
          <button onClick={() => regen.mutate()} disabled={regen.isPending} data-testid="button-regen-insights"
            className="text-xs text-white/50 hover:text-white border border-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
            {regen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/8 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-revenue-${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === t.id ? "border-[#F4A62A] text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {overview.isLoading && <p className="text-white/40">Loading revenue intelligence…</p>}

        {/* ── Briefing ── */}
        {tab === "briefing" && snap && (
          <div className="space-y-5" data-testid="panel-revenue-briefing">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={DollarSign} label="Combined revenue" value={usd(snap.totals.combinedRevenueCents)} />
              <Stat icon={ShoppingBag} label="Paid orders" value={snap.totals.paidOrders} />
              <Stat icon={Users} label="Customers" value={clv?.totalCustomers ?? 0} />
              <Stat icon={LineChart} label="Avg order value" value={usd(snap.totals.avgOrderValueCents)} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-emerald-400" /> Top opportunity</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-opportunity">{ins?.opportunities[0]?.title ?? "No opportunities yet — regenerate."}</p>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" /> Top risk</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-risk">{ins?.risks[0]?.title ?? "No risks detected."}</p>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#F4A62A]" /> Next action</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-action">{ins?.actions[0]?.title ?? "Review your revenue dashboard."}</p>
              </div>
            </div>
            <div className="lux-card">
              <h3 className="text-sm font-semibold text-white mb-3">Forecast snapshot</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {forecast?.horizons.map((f) => (
                  <div key={f.horizonDays} className="bg-white/5 rounded-lg p-3" data-testid={`forecast-mini-${f.horizonDays}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">{f.label}</span><TrendIcon trend={f.trend} />
                    </div>
                    <p className="text-lg font-bold text-white mt-1">{usd(f.projected)}</p>
                    <p className="text-[10px] text-white/35">{f.changePct > 0 ? "+" : ""}{f.changePct}% · confidence {f.confidence}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Revenue / Attribution ── */}
        {tab === "revenue" && snap && (
          <div className="space-y-4" data-testid="panel-revenue-attribution">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Stat icon={DollarSign} label="Stripe revenue" value={usd(snap.totals.stripeRevenueCents)} />
              <Stat icon={DollarSign} label="Won deal revenue" value={usd(snap.totals.wonRevenueCents)} />
              <Stat icon={ShoppingBag} label="Won deals" value={snap.totals.wonDeals} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Revenue by offer</h3>
                <div className="space-y-3">
                  {snap.attribution.byOffer.length === 0 ? <p className="text-white/40 text-sm">No attributed revenue yet.</p> :
                    snap.attribution.byOffer.map((o) => (
                      <Bar key={o.name} label={o.name} value={o.revenue} max={maxOfferRev} sub={`${usd(o.revenue)} · ${o.count}`} />
                    ))}
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Revenue by source</h3>
                <div className="space-y-1.5 text-sm">
                  {snap.attribution.bySource.length === 0 ? <p className="text-white/40">No source data yet.</p> :
                    snap.attribution.bySource.map((s) => <Row key={s.source} label={s.source} value={`${usd(s.revenue)} · ${s.count}`} />)}
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Revenue by intent</h3>
                <div className="space-y-1.5 text-sm">
                  {snap.attribution.byIntent.length === 0 ? <p className="text-white/40">No intent data yet.</p> :
                    snap.attribution.byIntent.map((s) => <Row key={s.intent} label={s.intent} value={`${usd(s.revenue)} · ${s.count}`} />)}
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Top converting paths</h3>
                <div className="space-y-1.5 text-sm">
                  {snap.attribution.topPaths.length === 0 ? <p className="text-white/40">No path data yet.</p> :
                    snap.attribution.topPaths.map((p, i) => <Row key={i} label={`${p.intent} → ${p.offer}`} value={`${usd(p.revenue)} · ${p.count}`} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CLV ── */}
        {tab === "clv" && clv && (
          <div className="space-y-4" data-testid="panel-revenue-clv">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={Users} label="Customers" value={clv.totalCustomers} />
              <Stat icon={Repeat} label="Repeat rate" value={`${clv.repeatRate}%`} />
              <Stat icon={DollarSign} label="Avg LTV" value={usd(clv.avgLtvCents)} />
              <Stat icon={DollarSign} label="Median LTV" value={usd(clv.medianLtvCents)} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Value segments</h3>
                <div className="space-y-1.5 text-sm">
                  {clv.segments.map((s) => <Row key={s.tier} label={`${s.tier} · ${s.customers}`} value={`${usd(s.revenueCents)} · ${s.sharePct}%`} />)}
                  <div className="pt-2 mt-2 border-t border-white/8">
                    <Row label="Top 20% revenue share" value={`${clv.top20RevenueSharePct}%`} />
                    <Row label="Avg orders / customer" value={clv.avgOrdersPerCustomer} />
                  </div>
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Top customers</h3>
                <div className="space-y-1.5 text-sm">
                  {clv.topCustomers.length === 0 ? <p className="text-white/40">No customers yet.</p> :
                    clv.topCustomers.slice(0, 8).map((c, i) => <Row key={i} label={`${c.label} · ${c.orders}×`} value={usd(c.totalCents)} />)}
                </div>
              </div>
              <div className="lux-card md:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-3">Monthly cohorts</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {clv.cohorts.length === 0 ? <p className="text-white/40">No cohort data yet.</p> :
                    clv.cohorts.map((c) => (
                      <div key={c.month} className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-white/50">{c.month}</p>
                        <p className="text-white font-bold mt-1">{usd(c.revenueCents)}</p>
                        <p className="text-[10px] text-white/40">{c.customers} customers</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Offers ── */}
        {tab === "offers" && offers && (
          <div className="space-y-4" data-testid="panel-revenue-offers">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="lux-card">
                <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><ShoppingBag className="h-4 w-4 text-[#F4A62A]" /> Best seller</div>
                <p className="text-lg font-bold text-white mt-2">{offers.bestSeller?.name ?? "—"}</p>
              </div>
              <div className="lux-card">
                <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><DollarSign className="h-4 w-4 text-[#F4A62A]" /> Highest avg value</div>
                <p className="text-lg font-bold text-white mt-2">{offers.highestAvgValue?.name ?? "—"}</p>
              </div>
              <div className="lux-card">
                <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><Sparkles className="h-4 w-4 text-[#F4A62A]" /> Best acceptance</div>
                <p className="text-lg font-bold text-white mt-2">{offers.bestAcceptance ? `${offers.bestAcceptance.name} (${offers.bestAcceptance.acceptanceRate}%)` : "—"}</p>
              </div>
            </div>
            <div className="lux-card">
              <h3 className="text-sm font-semibold text-white mb-3">Offer performance</h3>
              {offers.offers.length === 0 ? <p className="text-white/40 text-sm">No offers tracked yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 text-xs uppercase">
                        <th className="text-left font-medium py-2">Offer</th>
                        <th className="text-right font-medium py-2">Revenue</th>
                        <th className="text-right font-medium py-2">Units</th>
                        <th className="text-right font-medium py-2">Avg</th>
                        <th className="text-right font-medium py-2">Accept</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.offers.map((o) => (
                        <tr key={o.name} className="border-t border-white/8" data-testid={`row-offer-${o.name}`}>
                          <td className="py-2 text-white">{o.name}</td>
                          <td className="py-2 text-right text-white/80">{usd(o.revenueCents)}</td>
                          <td className="py-2 text-right text-white/60">{o.units}</td>
                          <td className="py-2 text-right text-white/60">{usd(o.avgValueCents)}</td>
                          <td className="py-2 text-right text-white/60">{o.recommended > 0 ? `${o.acceptanceRate}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Funnel ── */}
        {tab === "funnel" && funnel && (
          <div className="space-y-4" data-testid="panel-revenue-funnel">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Stat icon={Filter} label="Overall conversion" value={`${funnel.overallConversionPct}%`} />
              <div className="lux-card md:col-span-2">
                <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><AlertTriangle className="h-4 w-4 text-red-400" /> Biggest leak</div>
                <p className="text-sm font-bold text-white mt-2" data-testid="text-funnel-leak">
                  {funnel.biggestLeak ? `${funnel.biggestLeak.from} → ${funnel.biggestLeak.to} (${funnel.biggestLeak.dropOffPct}% drop-off)` : "No significant leak detected."}
                </p>
              </div>
            </div>
            <div className="lux-card">
              <h3 className="text-sm font-semibold text-white mb-3">Funnel stages</h3>
              <div className="space-y-3">
                {funnel.stages.map((s) => (
                  <Bar key={s.name} label={s.name} value={s.rate} max={100} sub={`${s.count} · ${s.rate}%`} />
                ))}
              </div>
            </div>
            <div className="lux-card">
              <h3 className="text-sm font-semibold text-white mb-3">Stage-to-stage conversion</h3>
              <div className="space-y-1.5 text-sm">
                {funnel.steps.map((st, i) => (
                  <Row key={i} label={`${st.from} → ${st.to}`} value={`${st.conversionPct}% (${st.dropOffPct}% drop)`} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Bookings ── */}
        {tab === "bookings" && snap && (
          <div className="space-y-4" data-testid="panel-revenue-bookings">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={CalendarCheck} label="Total bookings" value={snap.bookings.total} />
              <Stat icon={CalendarCheck} label="Pending" value={snap.bookings.pending} />
              <Stat icon={CalendarCheck} label="Last 30 days" value={snap.bookings.last30Days} />
              <Stat icon={TrendingUp} label="Booking → won" value={`${snap.bookings.bookingToWonRate}%`} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Booking status</h3>
                <div className="space-y-1.5 text-sm">
                  {snap.bookings.byStatus.length === 0 ? <p className="text-white/40">No bookings yet.</p> :
                    snap.bookings.byStatus.map((s) => <Row key={s.status} label={s.status} value={s.count} />)}
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Lead conversion</h3>
                <div className="space-y-1.5 text-sm">
                  <Row label="Leads at booked stage" value={snap.bookings.bookedLeads} />
                  <Row label="Leads reached won" value={snap.bookings.wonLeads} />
                  <Row label="Booking → won rate" value={`${snap.bookings.bookingToWonRate}%`} />
                  <Row label="Confirmed bookings" value={snap.bookings.confirmed} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Forecasts ── */}
        {tab === "forecasts" && forecast && (
          <div className="space-y-4" data-testid="panel-revenue-forecasts">
            <div className="lux-card">
              <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><LineChart className="h-4 w-4 text-[#F4A62A]" /> Daily revenue run-rate</div>
              <p className="text-2xl font-black text-white mt-2">{usd(forecast.dailyRunRateCents)}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {forecast.horizons.map((f) => (
                <div key={f.horizonDays} className="lux-card" data-testid={`forecast-${f.horizonDays}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{f.label}</h3><TrendIcon trend={f.trend} />
                  </div>
                  <p className="text-2xl font-black text-[#F4A62A] mt-2">{usd(f.projected)}</p>
                  <p className="text-xs text-white/40 mt-1">range {usd(f.low)} – {usd(f.high)}</p>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className={f.changePct > 0 ? "text-emerald-400" : f.changePct < 0 ? "text-red-400" : "text-white/40"}>
                      {f.changePct > 0 ? "+" : ""}{f.changePct}% vs current
                    </span>
                    <span className="text-white/40">confidence {f.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Insights ── */}
        {tab === "insights" && ins && (
          <div className="space-y-6" data-testid="panel-revenue-insights">
            <div>
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-3">Opportunities</h2>
              <div className="space-y-3">
                {ins.opportunities.length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                  ins.opportunities.map((i) => <InsightCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide mb-3">Risks</h2>
              <div className="space-y-3">
                {ins.risks.length === 0 ? <p className="text-white/40 text-sm">None detected.</p> :
                  ins.risks.map((i) => <InsightCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4A62A] uppercase tracking-wide mb-3">Recommended actions</h2>
              <div className="space-y-3">
                {ins.actions.length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                  ins.actions.map((i) => <InsightCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
          </div>
        )}

        {tab === "copilot" && <Copilot />}
        {tab === "reports" && <Reports latest={overview.data?.latestReports ?? []} />}
      </div>
    </div>
  );
}

function Copilot() {
  const SUGGESTIONS = [
    "Where is my revenue coming from?",
    "Which offer should I push?",
    "Why is conversion dropping?",
    "How do I grow customer lifetime value?",
  ];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; grounding: { opportunities: string[]; risks: string[]; actions: string[] } } | null>(null);

  const ask = useMutation({
    mutationFn: async (q: string) => {
      const r = await fetch("/api/admin/revenue-intel/copilot", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data) => setAnswer(data),
  });

  const submit = (q: string) => { if (q.trim()) ask.mutate(q.trim()); };

  return (
    <div className="space-y-4" data-testid="panel-revenue-copilot">
      <form onSubmit={(e) => { e.preventDefault(); submit(question); }} className="flex gap-2">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask your revenue copilot anything…"
          data-testid="input-copilot-question" className="flex-1 bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30" />
        <button type="submit" disabled={ask.isPending || !question.trim()} data-testid="button-copilot-ask" className="btn-primary px-4 flex items-center gap-2">
          {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => { setQuestion(s); submit(s); }} data-testid={`button-suggestion-${s.slice(0, 10)}`}
            className="text-xs text-white/60 hover:text-white border border-white/15 rounded-full px-3 py-1.5">{s}</button>
        ))}
      </div>
      {ask.isPending && <p className="text-white/40">Thinking…</p>}
      {answer && (
        <div className="lux-card" data-testid="text-copilot-answer">
          <div className="flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4 text-[#F4A62A]" /><span className="text-sm font-semibold text-white">Revenue Copilot</span></div>
          <p className="text-sm text-white/80 whitespace-pre-line">{answer.answer}</p>
          {(answer.grounding.opportunities.length > 0 || answer.grounding.risks.length > 0) && (
            <div className="mt-3 pt-3 border-t border-white/8 text-[11px] text-white/40">
              Grounded in {answer.grounding.opportunities.length} opportunities · {answer.grounding.risks.length} risks · {answer.grounding.actions.length} actions
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Reports({ latest }: { latest: { id: number; periodType: string; title: string; createdAt: string }[] }) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState("daily");
  const [openId, setOpenId] = useState<number | null>(null);

  const gen = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/revenue-intel/reports", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data: Report) => { setOpenId(data.id); qc.invalidateQueries({ queryKey: ["/api/admin/revenue-intel/overview"] }); },
  });

  const detail = useQuery<Report>({
    queryKey: ["/api/admin/revenue-intel/reports", openId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/revenue-intel/reports/${openId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: openId != null,
  });

  return (
    <div className="space-y-4" data-testid="panel-revenue-reports">
      <div className="flex gap-2">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} data-testid="select-report-period"
          className="bg-white/6 border border-white/10 rounded-lg px-3 text-white">
          {["daily", "weekly", "monthly", "quarterly"].map((p) => <option key={p} value={p} className="bg-[#0d1a2e]">{p}</option>)}
        </select>
        <button onClick={() => gen.mutate()} disabled={gen.isPending} data-testid="button-generate-report" className="btn-primary px-4 flex items-center gap-2">
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Generate executive report
        </button>
      </div>

      {openId != null && (
        <div className="lux-card" data-testid="card-report-detail">
          {detail.isLoading ? <p className="text-white/40">Loading report…</p> : detail.data && (
            <>
              <h3 className="font-bold text-white">{detail.data.title}</h3>
              <p className="text-sm text-white/80 mt-2 whitespace-pre-line" data-testid="text-report-summary">{detail.data.summary}</p>
            </>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Recent reports</h3>
        {latest.length === 0 ? <p className="text-white/40 text-sm">No reports yet. Generate one above.</p> :
          <div className="space-y-2">
            {latest.map((r) => (
              <button key={r.id} onClick={() => setOpenId(r.id)} data-testid={`row-report-${r.id}`}
                className="w-full text-left lux-card flex items-center justify-between hover:border-[#F4A62A]/30">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A]">{r.periodType}</span>
                  <p className="text-sm text-white mt-0.5">{r.title}</p>
                </div>
                <FileText className="h-4 w-4 text-white/40" />
              </button>
            ))}
          </div>}
      </div>
    </div>
  );
}

export default function RevenueIntelligence() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
