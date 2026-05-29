import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, BarChart3, Brain, Calendar, DollarSign, Eye, EyeOff, FileText,
  Flame, Lock, Mail, RefreshCw, Shield, Sparkles, TrendingUp, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type FunnelStage = { name: string; count: number; rate: number };
type Overview = {
  generatedAt: string;
  revenue: {
    totalPaidCents: number; paidOrders: number; avgOrderValueCents: number; abandoned: number;
    combinedRevenueCents: number; wonRevenueCents: number; wonDeals: number;
    monthlySeries: Array<{ month: string; total: number; stripeRevenue?: number; wonRevenue?: number }>;
    byOffer: Array<{ name: string; revenue: number; count: number }>;
  };
  pipeline: {
    totalLeads: number; emailCaptured: number; hot: number; qualified: number;
    bookedThisWeek: number; wonThisMonth: number;
    topIntent: string | null; topRecommendedOffer: string | null;
    funnel: FunnelStage[];
  };
  urgency: {
    overdueHotLeads: number; newQualifiedLeads: number; pendingBookings: number;
    paidOrdersToday: number; unrepliedContacts: number;
  };
  engagement: {
    newsletterSubscribers: number; contactForms: number; unrepliedContacts: number; pendingBookings: number;
  };
  content: { totalPosts: number; publishedPosts: number; draftPosts: number; liveOffers: number };
  ai: {
    openai: string; deepseek: string; router: string;
    premiumModel: string; automationModel: string; activeSessions: number;
  };
  system: {
    lastLeadAt: string | null; lastDigestAt: string | null;
    totalLeads: number; totalPaidOrders: number; totalAuditActions: number;
  };
};

const fmtUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format((cents || 0) / 100);

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

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
            <Lock className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Executive Command Center</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-executive-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-executive-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-executive-login" className="btn-primary w-full py-3">Access Command Center</button>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon, testid }: { label: string; value: string; sub?: string; icon?: React.ReactNode; testid?: string }) {
  return (
    <div className="lux-card p-4" data-testid={testid ?? `stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-white/40">{label}</span>
        {icon && <span style={{ color: GOLD }}>{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );
}

function statusDot(s: string) {
  const ok = s === "configured" || s === "active";
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />;
}

function Console({ onLogout }: { onLogout: () => void }) {
  const { data, isLoading, refetch, isFetching } = useQuery<Overview>({
    queryKey: ["/api/admin/executive/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/executive/overview", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); throw new Error("Unauthorized"); }
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const revChart = (data?.revenue.monthlySeries ?? []).map((m) => ({
    month: m.month ?? "", revenue: Math.round((m.total ?? 0) / 100),
  }));

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(220_50%_8%)]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}>
              <BarChart3 className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Executive Command Center</h1>
              <p className="text-[11px] sm:text-xs text-white/40 truncate">Unified cockpit · Read-only · Cross-system KPIs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="button-executive-refresh"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs px-3 py-2 rounded-lg border border-white/10 hover:border-[#F4A62A]/40 hover:bg-white/5 transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} style={{ color: GOLD }} />
              Refresh
            </button>
            <button
              data-testid="button-executive-logout"
              onClick={() => { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); }}
              className="text-xs px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 transition"
            >Sign out</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#F4A62A]/5 border border-[#F4A62A]/20 rounded-lg px-3 py-2">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>A read-only aggregation of revenue, pipeline, AI, and content signals from your existing systems. It changes nothing on its own.</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading && <div className="text-white/50 text-sm">Loading…</div>}

        {data && (
          <>
            {/* Top KPI row */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Combined Revenue" value={fmtUSD(data.revenue.combinedRevenueCents)} sub={`${data.revenue.paidOrders} paid orders`} icon={<DollarSign className="h-4 w-4" />} testid="stat-combined-revenue" />
              <Stat label="Avg Order Value" value={fmtUSD(data.revenue.avgOrderValueCents)} sub={`${data.revenue.abandoned} abandoned`} icon={<TrendingUp className="h-4 w-4" />} testid="stat-aov" />
              <Stat label="Total Leads" value={String(data.pipeline.totalLeads)} sub={`${data.pipeline.hot} hot · ${data.pipeline.qualified} qualified`} icon={<Users className="h-4 w-4" />} testid="stat-total-leads" />
              <Stat label="Won This Month" value={String(data.pipeline.wonThisMonth)} sub={`${data.pipeline.bookedThisWeek} booked this week`} icon={<Flame className="h-4 w-4" />} testid="stat-won-month" />
            </section>

            {/* Action-now strip */}
            <section className="lux-card p-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Activity className="h-4 w-4" style={{ color: GOLD }} /> Needs attention now</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Mini label="Overdue hot leads" value={data.urgency.overdueHotLeads} testid="urgency-overdue-hot" />
                <Mini label="New qualified" value={data.urgency.newQualifiedLeads} testid="urgency-new-qualified" />
                <Mini label="Pending bookings" value={data.urgency.pendingBookings} testid="urgency-pending-bookings" />
                <Mini label="Paid today" value={data.urgency.paidOrdersToday} testid="urgency-paid-today" />
                <Mini label="Unreplied contacts" value={data.urgency.unrepliedContacts} testid="urgency-unreplied" />
              </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue trend */}
              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><BarChart3 className="h-4 w-4" style={{ color: GOLD }} /> Monthly revenue</h2>
                {revChart.length > 0 ? (
                  <div className="h-56" data-testid="chart-revenue">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                        <Bar dataKey="revenue" name="Revenue ($)" fill={GOLD} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-xs text-white/50">No revenue history yet.</p>}
              </section>

              {/* Conversion funnel */}
              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4" style={{ color: GOLD }} /> Conversion funnel</h2>
                {data.pipeline.funnel.length > 0 ? (
                  <div className="space-y-2" data-testid="funnel-list">
                    {data.pipeline.funnel.map((s) => (
                      <div key={s.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/70 capitalize">{s.name}</span>
                          <span className="text-white/50">{s.count} · {Math.round(s.rate)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.rate)}%`, background: GOLD }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-white/50">No funnel data yet.</p>}
              </section>
            </div>

            {/* AI + content + system row */}
            <div className="grid lg:grid-cols-3 gap-6">
              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Brain className="h-4 w-4" style={{ color: GOLD }} /> AI status</h2>
                <ul className="space-y-2 text-xs" data-testid="ai-status">
                  <li className="flex items-center justify-between"><span className="text-white/60">OpenAI (premium)</span><span className="flex items-center gap-2">{statusDot(data.ai.openai)} {data.ai.premiumModel}</span></li>
                  <li className="flex items-center justify-between"><span className="text-white/60">DeepSeek (automation)</span><span className="flex items-center gap-2">{statusDot(data.ai.deepseek)} {data.ai.automationModel}</span></li>
                  <li className="flex items-center justify-between"><span className="text-white/60">Router</span><span className="flex items-center gap-2">{statusDot(data.ai.router)} {data.ai.router}</span></li>
                  <li className="flex items-center justify-between"><span className="text-white/60">Active chat sessions</span><span>{data.ai.activeSessions}</span></li>
                </ul>
              </section>

              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><FileText className="h-4 w-4" style={{ color: GOLD }} /> Content & offers</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Mini label="Published posts" value={data.content.publishedPosts} testid="content-published" />
                  <Mini label="Drafts" value={data.content.draftPosts} testid="content-drafts" />
                  <Mini label="Live offers" value={data.content.liveOffers} testid="content-offers" />
                  <Mini label="Subscribers" value={data.engagement.newsletterSubscribers} testid="content-subscribers" />
                </div>
              </section>

              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4" style={{ color: GOLD }} /> Pipeline signals</h2>
                <ul className="space-y-2 text-xs" data-testid="pipeline-signals">
                  <li className="flex items-center justify-between"><span className="text-white/60">Top intent</span><span className="capitalize">{data.pipeline.topIntent ?? "—"}</span></li>
                  <li className="flex items-center justify-between"><span className="text-white/60">Top recommended offer</span><span className="text-right">{data.pipeline.topRecommendedOffer ?? "—"}</span></li>
                  <li className="flex items-center justify-between"><span className="text-white/60">Emails captured</span><span>{data.pipeline.emailCaptured}</span></li>
                  <li className="flex items-center justify-between"><span className="text-white/60">Contact forms</span><span>{data.engagement.contactForms}</span></li>
                </ul>
              </section>
            </div>

            <section className="lux-card p-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Calendar className="h-4 w-4" style={{ color: GOLD }} /> System heartbeat</h2>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div><div className="text-white/40">Last lead</div><div className="text-white/80 mt-0.5">{fmtDate(data.system.lastLeadAt)}</div></div>
                <div><div className="text-white/40">Last digest</div><div className="text-white/80 mt-0.5">{fmtDate(data.system.lastDigestAt)}</div></div>
                <div><div className="text-white/40">Total leads</div><div className="text-white/80 mt-0.5">{data.system.totalLeads}</div></div>
                <div><div className="text-white/40">Total paid orders</div><div className="text-white/80 mt-0.5">{data.system.totalPaidOrders}</div></div>
                <div><div className="text-white/40">Audit actions</div><div className="text-white/80 mt-0.5">{data.system.totalAuditActions}</div></div>
              </div>
            </section>

            <p className="text-[10px] text-white/30 text-center pt-2">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Mini({ label, value, testid }: { label: string; value: number; testid?: string }) {
  const danger = value > 0 && /overdue|unreplied/i.test(label);
  return (
    <div className="rounded-xl border border-white/8 p-3" data-testid={testid}>
      <div className={`text-xl font-bold ${danger ? "text-red-400" : "text-white"}`}>{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
    </div>
  );
}

export default function ExecutiveCenter() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(sessionStorage.getItem("e360_dashboard_auth") === "true"); }, []);
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console onLogout={() => setAuthed(false)} />;
}
