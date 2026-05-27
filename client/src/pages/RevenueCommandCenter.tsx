import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, BarChart3, Check, DollarSign, Eye, EyeOff,
  Flame, Lock, RefreshCw, Shield, Sparkles, TrendingUp, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Recommendation = { kind: string; title: string; rationale: string; confidence: number };
type RevenueSnapshot = {
  stripeConfigured: boolean; windowDays: number;
  grossRevenueCents: number; netRevenueCents: number; refundedCents: number;
  successfulPayments: number; failedPayments: number; refundCount: number;
  avgOrderValueCents: number; activeSubscriptions: number;
  daily: Array<{ date: string; gross: number; orders: number }>;
  trailingAverages: { day7: number; day30: number };
  growthSlopePerDay: number; forecastNext7Cents: number;
  forecastConfidence: number; volatility: number; anomalyScore: number; asOf: string;
};
type GrowthSnapshot = {
  topRecommendations: Array<{ id: number; title: string; expectedImpact: string; status: string }>;
  totalOpenRecommendations: number;
};
type ExperimentSnapshot = {
  running: number; completed: number;
  winners: Array<{ experimentKey: string; name: string; winnerVariantKey: string; confidence: number }>;
  topUnderperformers: Array<{ experimentKey: string; name: string; reason: string }>;
};
type PersonalizationSnapshot = {
  activeRules: number; pendingRules: number;
  topSegments: Array<{ surface: string; segmentKey: string; cvr: number; ctr: number; views: number }>;
  underperformingSegments: Array<{ surface: string; segmentKey: string; cvr: number; views: number }>;
};
type Report = {
  id: number; status: string;
  revenueSnapshot: RevenueSnapshot;
  growthSnapshot: GrowthSnapshot;
  experimentSnapshot: ExperimentSnapshot;
  personalizationSnapshot: PersonalizationSnapshot;
  recommendations: Recommendation[];
  executiveSummary: string; diagnosticsSummary: string;
  providerMetadata: { recommendations?: string; executive?: string; diagnostics?: string };
  confidence: number; createdAt: string;
};
type Alert = {
  id: number; severity: "info" | "warning" | "critical"; alertType: string;
  title: string; description: string; recommendation: string;
  status: string; createdAt: string;
};
type Overview = { report: Report | null; alerts: Alert[] };

const fmtUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format((cents || 0) / 100);

const severityColor = (s: string) =>
  s === "critical" ? "#ef4444" : s === "warning" ? "#eab308" : "#60a5fa";

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
          <h1 className="text-2xl font-bold text-white">Revenue Command Center</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
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
          <button type="submit" data-testid="button-revenue-login" className="btn-primary w-full py-3">Access Command Center</button>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="lux-card p-4" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-white/40">{label}</span>
        {icon && <span style={{ color: GOLD }}>{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );
}

function Console({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery<Overview>({
    queryKey: ["/api/admin/revenue/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/revenue/overview", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); throw new Error("Unauthorized"); }
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/revenue/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ windowDays: 30 }),
      });
      if (!r.ok) throw new Error("Run failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/revenue/overview"] }); },
  });

  const ack = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/revenue/alerts/${id}/acknowledge`, {
        method: "POST", credentials: "include",
      });
      if (!r.ok) throw new Error("Ack failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/revenue/overview"] }); },
  });

  const report = data?.report ?? null;
  const alerts = data?.alerts ?? [];
  const rev = report?.revenueSnapshot;
  const exp = report?.experimentSnapshot;
  const pers = report?.personalizationSnapshot;
  const growth = report?.growthSnapshot;

  const chartData = (rev?.daily ?? []).map(d => ({
    date: d.date.slice(5), grossUsd: Math.round(d.gross / 100), orders: d.orders,
  }));
  const personalizationChart = (pers?.topSegments ?? []).map(s => ({
    name: `${s.surface}/${s.segmentKey}`, cvr: Math.round(s.cvr * 1000) / 10, ctr: Math.round(s.ctr * 1000) / 10,
  }));

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(220_50%_8%)]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}>
              <DollarSign className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Revenue Command Center</h1>
              <p className="text-[11px] sm:text-xs text-white/40 truncate">Phase 59 · Recommendation-only · No autonomous mutations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="button-revenue-run"
              onClick={() => runNow.mutate()}
              disabled={runNow.isPending}
              className="text-xs px-3 py-2 rounded-lg border border-white/10 hover:border-[#F4A62A]/40 hover:bg-white/5 transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${runNow.isPending ? "animate-spin" : ""}`} style={{ color: GOLD }} />
              {runNow.isPending ? "Synthesising…" : "Run now"}
            </button>
            <button
              data-testid="button-revenue-logout"
              onClick={() => { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); }}
              className="text-xs px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 transition"
            >Sign out</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#F4A62A]/5 border border-[#F4A62A]/20 rounded-lg px-3 py-2">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>This dashboard surfaces recommendations only. It cannot change prices, refund customers, or send marketing without explicit founder action.</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading && <div className="text-white/50 text-sm">Loading…</div>}

        {!isLoading && !report && (
          <div className="lux-card p-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-3" style={{ color: GOLD }} />
            <h2 className="text-lg font-semibold mb-2">No reports yet</h2>
            <p className="text-white/50 text-sm mb-5">Run the engine to generate the first revenue intelligence report.</p>
            <button
              data-testid="button-revenue-first-run"
              onClick={() => runNow.mutate()}
              disabled={runNow.isPending}
              className="btn-primary px-6 py-2.5 disabled:opacity-50"
            >{runNow.isPending ? "Running…" : "Generate first report"}</button>
          </div>
        )}

        {report && rev && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Gross (30d)" value={fmtUSD(rev.grossRevenueCents)} sub={`${rev.successfulPayments} payments`} icon={<DollarSign className="h-4 w-4" />} />
              <Stat label="Net (after refunds)" value={fmtUSD(rev.netRevenueCents)} sub={`${rev.refundCount} refunds · ${fmtUSD(rev.refundedCents)}`} icon={<TrendingUp className="h-4 w-4" />} />
              <Stat label="Forecast (next 7d)" value={fmtUSD(rev.forecastNext7Cents)} sub={`Confidence ${rev.forecastConfidence}%`} icon={<BarChart3 className="h-4 w-4" />} />
              <Stat label="Op confidence" value={`${report.confidence}%`} sub={rev.stripeConfigured ? "Stripe live" : "Stripe not configured"} icon={<Activity className="h-4 w-4" />} />
            </section>

            <section className="lux-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{ color: GOLD }} /> Revenue timeline ({rev.windowDays}d)</h2>
                <div className="text-[11px] text-white/40">
                  7d avg {fmtUSD(rev.trailingAverages.day7)} · 30d avg {fmtUSD(rev.trailingAverages.day30)} · slope {rev.growthSlopePerDay > 0 ? "+" : ""}{fmtUSD(rev.growthSlopePerDay)}/day
                </div>
              </div>
              <div className="h-64" data-testid="chart-revenue-timeline">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" stroke="#ffffff60" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#ffffff60" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #ffffff20", borderRadius: 8, color: "#fff" }} />
                    <Line type="monotone" dataKey="grossUsd" name="Revenue (USD)" stroke={GOLD} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="orders" name="Orders" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs text-white/60">
                <div><span className="text-white/40">Avg order:</span> {fmtUSD(rev.avgOrderValueCents)}</div>
                <div><span className="text-white/40">Failed payments:</span> {rev.failedPayments}</div>
                <div><span className="text-white/40">Active subs:</span> {rev.activeSubscriptions}</div>
                <div><span className="text-white/40">Volatility:</span> {(rev.volatility * 100).toFixed(0)}%</div>
              </div>
            </section>

            {alerts.length > 0 && (
              <section>
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4" style={{ color: GOLD }} /> Active alerts ({alerts.length})</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {alerts.map(a => (
                    <div key={a.id} className="lux-card p-4" data-testid={`alert-card-${a.id}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${severityColor(a.severity)}22`, color: severityColor(a.severity) }}>{a.severity}</span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full text-white/40 border border-white/10">{a.alertType}</span>
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{a.title}</h3>
                      {a.description && <p className="text-xs text-white/60 mb-2">{a.description}</p>}
                      {a.recommendation && <p className="text-xs text-white/70 mb-3 italic">→ {a.recommendation}</p>}
                      <button
                        data-testid={`button-alert-ack-${a.id}`}
                        onClick={() => ack.mutate(a.id)}
                        disabled={ack.isPending}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#F4A62A]/40 hover:bg-white/5 transition flex items-center gap-1.5 disabled:opacity-50"
                      ><Check className="h-3 w-3" /> Acknowledge</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4" style={{ color: GOLD }} /> AI Executive Summary</h2>
                <p className="text-[10px] text-white/40 mb-2">Provider: {report.providerMetadata.executive || "openai"} (hard-locked)</p>
                <pre className="text-xs text-white/80 whitespace-pre-wrap font-sans leading-relaxed" data-testid="text-revenue-exec">{report.executiveSummary || "(empty — run engine to populate)"}</pre>
              </section>
              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Zap className="h-4 w-4" style={{ color: GOLD }} /> DeepSeek Diagnostics</h2>
                <p className="text-[10px] text-white/40 mb-2">Provider: {report.providerMetadata.diagnostics || "deepseek"} (hard-locked)</p>
                <pre className="text-xs text-white/80 whitespace-pre-wrap font-sans leading-relaxed" data-testid="text-revenue-diag">{report.diagnosticsSummary || "(empty — run engine to populate)"}</pre>
              </section>
            </div>

            <section>
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Flame className="h-4 w-4" style={{ color: GOLD }} /> AI Recommendations ({report.recommendations.length})</h2>
              {report.recommendations.length === 0 ? (
                <div className="lux-card p-4 text-xs text-white/50">No recommendations yet. They appear after the engine has enough signal.</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {report.recommendations.map((r, i) => (
                    <div key={i} className="lux-card p-4" data-testid={`rec-card-${i}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${GOLD}22`, color: GOLD }}>{r.kind}</span>
                        <span className="text-[10px] text-white/40">{r.confidence}% confidence</span>
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{r.title}</h3>
                      <p className="text-xs text-white/60">{r.rationale}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Activity className="h-4 w-4" style={{ color: GOLD }} /> Experiments</h2>
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <Stat label="Running" value={String(exp?.running ?? 0)} />
                  <Stat label="Completed" value={String(exp?.completed ?? 0)} />
                </div>
                {(exp?.winners ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/40">Winners</p>
                    {exp!.winners.map(w => (
                      <div key={w.experimentKey} className="text-xs flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span className="truncate">{w.name} → <span className="text-white/60">{w.winnerVariantKey}</span></span>
                        <span className="text-white/40 shrink-0 ml-2">{w.confidence}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {(exp?.topUnderperformers ?? []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-white/40">Recently rolled back</p>
                    {exp!.topUnderperformers.map(u => (
                      <p key={u.experimentKey} className="text-xs text-white/60 truncate">• {u.name} — {u.reason}</p>
                    ))}
                  </div>
                )}
              </section>

              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4" style={{ color: GOLD }} /> Personalization performance</h2>
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <Stat label="Active rules" value={String(pers?.activeRules ?? 0)} />
                  <Stat label="Pending" value={String(pers?.pendingRules ?? 0)} />
                </div>
                {personalizationChart.length > 0 ? (
                  <div className="h-44" data-testid="chart-personalization">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={personalizationChart} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis type="number" stroke="#ffffff60" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" stroke="#ffffff60" tick={{ fontSize: 10 }} width={130} />
                        <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #ffffff20", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                        <Bar dataKey="ctr" name="CTR %" fill="#60a5fa" />
                        <Bar dataKey="cvr" name="CVR %" fill={GOLD} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-xs text-white/50">No segment data yet.</p>}
              </section>
            </div>

            {(growth?.topRecommendations ?? []).length > 0 && (
              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4" style={{ color: GOLD }} /> Growth engine highlights ({growth!.totalOpenRecommendations} open)</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {growth!.topRecommendations.map(r => (
                    <div key={r.id} className="text-xs border border-white/5 rounded-lg p-3">
                      <p className="font-medium truncate">{r.title}</p>
                      {r.expectedImpact && <p className="text-white/50 mt-1 truncate">{r.expectedImpact}</p>}
                      <p className="text-[10px] mt-1" style={{ color: GOLD }}>{r.status}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="text-[10px] text-white/30 text-center pt-2">
              Report #{report.id} · Generated {new Date(report.createdAt).toLocaleString()}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export default function RevenueCommandCenter() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(sessionStorage.getItem("e360_dashboard_auth") === "true"); }, []);
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console onLogout={() => setAuthed(false)} />;
}
