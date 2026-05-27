import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, CheckCircle2, Eye, EyeOff, Lock, RefreshCw,
  Sparkles, TrendingUp, TrendingDown, Minus, Target, BarChart3, DollarSign,
  ThumbsUp, ThumbsDown, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Funnel = {
  visits: number; chatStarted: number; leadsCaptured: number;
  leadsQualified: number; ordersInitiated: number; ordersPaid: number;
  rates: {
    visitToChat: number; chatToLead: number; leadToQualified: number;
    qualifiedToInitiated: number; initiatedToPaid: number; visitToPaid: number;
  };
};
type Trends = {
  visits: {
    total: number;
    daily: Array<{ date: string; count: number }>;
    topPages: Array<{ page: string; count: number }>;
    trend: { direction: "up" | "down" | "flat"; pctChange: number };
  };
  engagement: {
    newSubscribers: number; newContacts: number; chatSessions: number;
    avgLeadScore: number; hotLeads: number;
  };
  revenue: {
    totalCents: number; paidOrders: number; avgOrderCents: number;
    dailyCents: Array<{ date: string; cents: number }>;
  };
};
type Forecast = {
  horizonDays: number;
  history: Array<{ date: string; cents: number }>;
  projection: Array<{ date: string; cents: number }>;
  slopeCentsPerDay: number;
  projectedTotalCents: number;
  confidence: number;
};
type GrowthReport = {
  id: number;
  status: "healthy" | "warning" | "critical";
  funnel: Funnel;
  trends: Trends;
  forecast: Forecast;
  diagnosticsSummary: string;
  executiveSummary: string;
  diagnosticsProvider: string | null;
  executiveProvider: string | null;
  confidence: number;
  createdAt: string;
};
type GrowthRec = {
  id: number;
  reportId: number | null;
  category: string;
  severity: "info" | "warning" | "critical";
  title: string;
  rationale: string;
  proposedExperiment: string | null;
  expectedImpact: string | null;
  status: "pending" | "approved" | "rejected";
  decidedBy: string | null;
  decidedAt: string | null;
  notes: string | null;
  createdAt: string;
};
type Overview = { latest: GrowthReport | null; history: GrowthReport[] };

const dollars = (cents: number) =>
  "$" + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

const sevColor = (s: string) => s === "critical" ? "#ef4444" : s === "warning" ? "#eab308" : "#22c55e";
const statusColor = (s: string | null | undefined) =>
  s === "critical" ? "#ef4444" : s === "warning" ? "#eab308" : s === "healthy" ? "#22c55e" : "#94a3b8";

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/dashboard/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      sessionStorage.setItem("e360_dashboard_auth", "true");
      onAuth();
    } else {
      setError("Invalid PIN. Please try again.");
      setPin("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}>
            <Lock className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Growth Engine</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-growth-pin"
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              autoComplete="current-password"
              autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-growth-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-growth-login" className="btn-primary w-full py-3">Access Growth Engine</button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, testId }: any) {
  return (
    <div className="lux-card" data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/60 text-xs uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4" style={{ color: GOLD }} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-white/50 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function TrendIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (direction === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-white/50" />;
}

function GrowthDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "funnel" | "forecast" | "recs">("overview");
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "">("pending");

  const overviewQ = useQuery<Overview>({
    queryKey: ["/api/admin/growth/overview"],
    refetchInterval: 60_000,
  });
  const recsQ = useQuery<GrowthRec[]>({
    queryKey: ["/api/admin/growth/recommendations", filterStatus],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/growth/recommendations${filterStatus ? `?status=${filterStatus}` : ""}`,
      );
      if (!r.ok) throw new Error("Failed to load recommendations");
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/growth/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowDays: 14, forecastDays: 14 }),
      });
      if (!r.ok) throw new Error("Run failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/growth/overview"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/growth/recommendations", filterStatus] });
    },
  });

  const decideMutation = useMutation({
    mutationFn: async (vars: { id: number; decision: "approved" | "rejected" }) => {
      const r = await fetch(`/api/admin/growth/recommendations/${vars.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: vars.decision }),
      });
      if (!r.ok) throw new Error("Decision failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/growth/recommendations", filterStatus] });
    },
  });

  const latest = overviewQ.data?.latest ?? null;
  const recs = recsQ.data ?? [];

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8" style={{ background: BG }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6" style={{ color: GOLD }} />
              Autonomous Growth Engine
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Phase 56 · Diagnostics on DeepSeek · Executive reasoning on OpenAI · Recommendation-only
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="button-growth-run"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="btn-primary px-4 py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              {runMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Zap className="h-4 w-4" /> Run Growth Analysis</>
              )}
            </button>
          </div>
        </header>

        {/* Status banner */}
        {latest && (
          <div className="lux-card mb-6" data-testid="status-banner">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: statusColor(latest.status) }} />
                <div>
                  <div className="text-white font-semibold capitalize" data-testid="text-growth-status">
                    System Status: {latest.status}
                  </div>
                  <div className="text-white/50 text-xs">
                    Last analysis: {new Date(latest.createdAt).toLocaleString()} ·
                    Confidence {latest.confidence}% ·
                    Diagnostics: {latest.diagnosticsProvider ?? "—"} ·
                    Exec: {latest.executiveProvider ?? "—"}
                  </div>
                </div>
              </div>
              <div className="text-xs text-white/60 italic max-w-md">
                Recommendation-only mode. No pricing, ad, or email changes are automated.
              </div>
            </div>
          </div>
        )}

        {!latest && !overviewQ.isLoading && (
          <div className="lux-card mb-6 text-center py-8" data-testid="empty-state">
            <Sparkles className="h-10 w-10 mx-auto mb-3" style={{ color: GOLD }} />
            <p className="text-white/70">No growth report yet. Click <strong>Run Growth Analysis</strong> to generate one.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {([
            ["overview", "Overview", Activity],
            ["funnel", "Funnel", Target],
            ["forecast", "Forecast", BarChart3],
            ["recs", "Recommendations", Sparkles],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              data-testid={`tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition ${
                tab === key
                  ? "bg-[#F4A62A] text-black font-semibold"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && latest && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Activity} label="Visits (14d)" value={latest.trends.visits.total}
                sub={<span className="flex items-center gap-1"><TrendIcon direction={latest.trends.visits.trend.direction} />{latest.trends.visits.trend.pctChange}% vs prior</span>}
                testId="stat-visits" />
              <StatCard icon={Target} label="Visit → Paid" value={`${latest.funnel.rates.visitToPaid}%`}
                sub={`${latest.funnel.ordersPaid} of ${latest.funnel.visits} visits`} testId="stat-conv" />
              <StatCard icon={DollarSign} label="Revenue (14d)" value={dollars(latest.trends.revenue.totalCents)}
                sub={`${latest.trends.revenue.paidOrders} paid · avg ${dollars(latest.trends.revenue.avgOrderCents)}`} testId="stat-revenue" />
              <StatCard icon={Sparkles} label="Hot Leads" value={latest.trends.engagement.hotLeads}
                sub={`${latest.trends.engagement.chatSessions} sessions · avg score ${latest.trends.engagement.avgLeadScore}`} testId="stat-leads" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lux-card">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" style={{ color: GOLD }} /> Daily Visits
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={latest.trends.visits.daily}>
                    <defs>
                      <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="count" stroke={GOLD} fill="url(#vGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="lux-card">
                <h3 className="text-white font-semibold mb-3">Top Pages</h3>
                <div className="space-y-2" data-testid="list-top-pages">
                  {latest.trends.visits.topPages.length === 0 && (
                    <div className="text-white/40 text-sm">No traffic in window.</div>
                  )}
                  {latest.trends.visits.topPages.map(p => (
                    <div key={p.page} className="flex items-center justify-between text-sm">
                      <span className="text-white/80 truncate mr-3">{p.page}</span>
                      <span className="text-white/50 tabular-nums">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Executive summary */}
            <div className="lux-card">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: GOLD }} />
                Executive Summary
                <span className="text-xs text-white/40 ml-auto">OpenAI · premium reasoning</span>
              </h3>
              <pre data-testid="text-exec-summary" className="text-white/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {latest.executiveSummary || "No executive summary yet."}
              </pre>
            </div>

            {/* Diagnostics */}
            <div className="lux-card">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" style={{ color: GOLD }} />
                Diagnostics
                <span className="text-xs text-white/40 ml-auto">DeepSeek · automation tier</span>
              </h3>
              <p data-testid="text-diagnostics" className="text-white/70 text-sm leading-relaxed">
                {latest.diagnosticsSummary || "No diagnostics summary yet."}
              </p>
            </div>
          </div>
        )}

        {/* Funnel */}
        {tab === "funnel" && latest && (
          <div className="space-y-6">
            <div className="lux-card">
              <h3 className="text-white font-semibold mb-3">Conversion Funnel (14d)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { stage: "Visits", count: latest.funnel.visits },
                    { stage: "Chat", count: latest.funnel.chatStarted },
                    { stage: "Leads", count: latest.funnel.leadsCaptured },
                    { stage: "Qualified", count: latest.funnel.leadsQualified },
                    { stage: "Initiated", count: latest.funnel.ordersInitiated },
                    { stage: "Paid", count: latest.funnel.ordersPaid },
                  ]}
                  layout="vertical"
                  margin={{ left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="stage" type="category" stroke="rgba(255,255,255,0.4)" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  <Bar dataKey="count" fill={GOLD} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ["Visit → Chat", latest.funnel.rates.visitToChat],
                ["Chat → Lead", latest.funnel.rates.chatToLead],
                ["Lead → Qualified", latest.funnel.rates.leadToQualified],
                ["Qualified → Initiated", latest.funnel.rates.qualifiedToInitiated],
                ["Initiated → Paid", latest.funnel.rates.initiatedToPaid],
                ["Visit → Paid", latest.funnel.rates.visitToPaid],
              ].map(([label, rate]) => (
                <div key={String(label)} className="lux-card" data-testid={`rate-${String(label).toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="text-white/60 text-xs uppercase tracking-wider">{label}</div>
                  <div className="text-2xl font-bold text-white mt-1">{rate}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forecast */}
        {tab === "forecast" && latest && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Projected (next 14d)" value={dollars(latest.forecast.projectedTotalCents)}
                sub={`Slope ${dollars(latest.forecast.slopeCentsPerDay)}/day`} testId="stat-forecast" />
              <StatCard icon={Activity} label="Forecast Confidence" value={`${Math.round(latest.forecast.confidence * 100)}%`}
                sub="R² on daily revenue" testId="stat-confidence" />
              <StatCard icon={DollarSign} label="Revenue (last 14d)" value={dollars(latest.trends.revenue.totalCents)}
                sub={`${latest.trends.revenue.paidOrders} paid orders`} testId="stat-rev-actual" />
              <StatCard icon={Target} label="Avg Order" value={dollars(latest.trends.revenue.avgOrderCents)}
                sub="among paid orders" testId="stat-avg-order" />
            </div>

            <div className="lux-card">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" style={{ color: GOLD }} /> Revenue: History + Projection
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={[
                    ...latest.forecast.history.map(d => ({ date: d.date, history: d.cents / 100, projection: null as number | null })),
                    ...latest.forecast.projection.map(d => ({ date: d.date, history: null as number | null, projection: d.cents / 100 })),
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#0b1224", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v: any) => v == null ? "—" : `$${Number(v).toFixed(2)}`}
                  />
                  <ReferenceLine x={latest.forecast.history.at(-1)?.date} stroke="rgba(244,166,42,0.4)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="history" stroke={GOLD} strokeWidth={2} dot={false} name="History" connectNulls={false} />
                  <Line type="monotone" dataKey="projection" stroke="#60a5fa" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Projection" connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-white/40 text-xs mt-2">
                Linear regression on daily paid revenue. Low confidence = high variance — treat projection as directional, not prescriptive.
              </p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {tab === "recs" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["pending", "approved", "rejected", ""] as const).map(s => (
                <button
                  key={s || "all"}
                  data-testid={`filter-${s || "all"}`}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    filterStatus === s
                      ? "bg-[#F4A62A] text-black font-semibold"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {s ? s[0].toUpperCase() + s.slice(1) : "All"}
                </button>
              ))}
              <span className="text-white/40 text-xs ml-auto">{recs.length} item(s)</span>
            </div>

            {recsQ.isLoading && <div className="text-white/50 text-sm">Loading…</div>}
            {!recsQ.isLoading && recs.length === 0 && (
              <div className="lux-card text-center py-8 text-white/50" data-testid="empty-recs">
                No recommendations match this filter.
              </div>
            )}

            <div className="space-y-3">
              {recs.map(r => (
                <div key={r.id} className="lux-card" data-testid={`rec-card-${r.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {r.severity === "critical" ? <AlertTriangle className="h-5 w-5 text-red-400" />
                        : r.severity === "warning" ? <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold" data-testid={`rec-title-${r.id}`}>{r.title}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 capitalize">{r.category}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{ background: sevColor(r.severity) + "33", color: sevColor(r.severity) }}>
                          {r.severity}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 capitalize ml-auto"
                          data-testid={`rec-status-${r.id}`}>
                          {r.status}
                        </span>
                      </div>
                      {r.rationale && <p className="text-white/70 text-sm mt-1">{r.rationale}</p>}
                      {r.proposedExperiment && (
                        <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Proposed Experiment</div>
                          <p className="text-white/80 text-sm">{r.proposedExperiment}</p>
                        </div>
                      )}
                      {r.expectedImpact && (
                        <div className="mt-2 text-xs text-emerald-300">Expected impact: {r.expectedImpact}</div>
                      )}
                      {r.status === "pending" && (
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <button
                            data-testid={`button-approve-${r.id}`}
                            onClick={() => decideMutation.mutate({ id: r.id, decision: "approved" })}
                            disabled={decideMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm flex items-center gap-1 disabled:opacity-50"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            data-testid={`button-reject-${r.id}`}
                            onClick={() => decideMutation.mutate({ id: r.id, decision: "rejected" })}
                            disabled={decideMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm flex items-center gap-1 disabled:opacity-50"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      )}
                      {r.decidedAt && (
                        <div className="text-xs text-white/40 mt-2">
                          Decided by {r.decidedBy} · {new Date(r.decidedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GrowthEnginePage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("e360_dashboard_auth") === "true") setAuthed(true);
  }, []);

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <GrowthDashboard />;
}
