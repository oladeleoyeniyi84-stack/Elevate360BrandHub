import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, CheckCircle2, Cpu, Database, DollarSign, Eye, EyeOff,
  Gauge, Lock, Mail, Radio, RefreshCw, Server, ShieldAlert, Sparkles, Zap,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";
const POLL_MS = 15_000;

type OpsOverview = {
  generatedAt: string;
  health: {
    overall: "healthy" | "degraded" | "critical";
    database: { ok: boolean; latencyMs: number | null };
    aiRouter: { ok: boolean; premium: string; automation: string };
    openai: { ok: boolean };
    deepseek: { ok: boolean };
    stripe: { ok: boolean };
    resend: { ok: boolean };
    memory: { activeSessions: number };
  };
  qaSentinel: {
    latestId: number | null; status: string | null; issuesCount: number;
    confidence: number; ageMinutes: number | null; recentIssues: string[];
  };
  recoveryEngine: {
    latestId: number | null; status: string | null; actionsCount: number;
    recommendationsCount: number; skippedCount: number; confidence: number;
    ageMinutes: number | null;
    topRecommendations: Array<{ severity: string; message: string; jobKey?: string }>;
  };
  automation: {
    total: number; succeeded: number; failed: number; running: number; stale: number;
    byGroup: Record<string, { total: number; failed: number }>;
    failingJobs: Array<{ jobKey: string; jobGroup: string; failureCount: number }>;
    upcoming: Array<{ jobKey: string; nextRunInMinutes: number }>;
  };
  activity: { contactsLast24h: number; subscribersLast24h: number; visitsLast24h: number };
};

type Timeseries = { hours: number; series: Array<{ bucket: string; succeeded: number; failed: number }> };

function statusColor(s: string | null | undefined) {
  if (s === "healthy" || s === "succeeded") return "#22c55e";
  if (s === "degraded" || s === "warning") return "#eab308";
  if (s === "critical" || s === "failed") return "#ef4444";
  return "#94a3b8";
}

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
          <h1 className="text-2xl font-bold text-white">Founder Ops Center</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-ops-pin"
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              autoComplete="current-password"
              autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-ops-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-ops-login" className="btn-primary w-full py-3">Access Ops Center</button>
        </form>
      </div>
    </div>
  );
}

function HealthDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2" data-testid={`health-${label.toLowerCase()}`}>
      <span className="w-2 h-2 rounded-full" style={{ background: ok ? "#22c55e" : "#ef4444" }} />
      <span className="text-white/80 text-sm">{label}</span>
      <span className="text-white/40 text-xs ml-auto">{ok ? "OK" : "DOWN"}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color = GOLD, testId }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string; testId: string;
}) {
  return (
    <div className="lux-card" data-testid={testId}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white/50 text-xs uppercase tracking-wider font-semibold">{label}</div>
          <div className="text-3xl font-bold text-white mt-1" data-testid={`${testId}-value`}>{value}</div>
          {sub && <div className="text-white/40 text-xs mt-1">{sub}</div>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function severityBadge(sev: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return map[sev] ?? map.info;
}

function OpsDashboard({ onLogout }: { onLogout: () => void }) {
  const overview = useQuery<OpsOverview>({
    queryKey: ["/api/admin/ops/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/ops/overview", { credentials: "include" });
      if (r.status === 401) { onLogout(); throw new Error("unauth"); }
      if (!r.ok) throw new Error("overview failed");
      return r.json();
    },
    refetchInterval: POLL_MS,
  });

  const series = useQuery<Timeseries>({
    queryKey: ["/api/admin/ops/timeseries"],
    queryFn: async () => {
      const r = await fetch("/api/admin/ops/timeseries?hours=24", { credentials: "include" });
      if (!r.ok) throw new Error("series failed");
      return r.json();
    },
    refetchInterval: POLL_MS * 4,
  });

  const briefing = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/ops/briefing", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("briefing failed");
      return r.json() as Promise<{ briefing: string; provider: string; latencyMs: number }>;
    },
  });

  const recovery = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/recovery/run", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("recovery failed");
      return r.json();
    },
    onSuccess: () => overview.refetch(),
  });

  const sentinel = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/qa-sentinel/run", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("sentinel failed");
      return r.json();
    },
    onSuccess: () => overview.refetch(),
  });

  const o = overview.data;
  const overallColor = statusColor(o?.health.overall);

  const chartData = (series.data?.series ?? []).map(p => ({
    label: new Date(p.bucket).toLocaleTimeString([], { hour: "2-digit" }),
    succeeded: p.succeeded,
    failed: p.failed,
  }));

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      {/* Header */}
      <header className="border-b border-white/10 px-4 sm:px-8 py-4 sticky top-0 z-30 backdrop-blur" style={{ background: "hsla(220, 50%, 8%, 0.85)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: GOLD }}>
              <Gauge className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Founder Ops Center</h1>
              <p className="text-xs text-white/50 truncate">Elevate360Official · Phase 55</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ borderColor: `${overallColor}40`, background: `${overallColor}15` }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: overallColor }} />
              <span className="text-xs font-semibold uppercase" data-testid="status-overall" style={{ color: overallColor }}>
                {o?.health.overall ?? "loading"}
              </span>
            </div>
            <button onClick={() => overview.refetch()} className="p-2 rounded-lg hover:bg-white/10 transition" data-testid="button-refresh" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${overview.isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Top metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Cpu} label="Automation Jobs" value={`${o?.automation.succeeded ?? 0}/${o?.automation.total ?? 0}`}
            sub={`${o?.automation.failed ?? 0} failing · ${o?.automation.stale ?? 0} stale`}
            color={o?.automation.failed ? "#ef4444" : "#22c55e"} testId="metric-automation" />
          <MetricCard icon={ShieldAlert} label="QA Sentinel" value={o?.qaSentinel.issuesCount ?? 0}
            sub={`${o?.qaSentinel.status ?? "—"} · ${o?.qaSentinel.confidence ?? 0}% conf`}
            color={statusColor(o?.qaSentinel.status)} testId="metric-sentinel" />
          <MetricCard icon={Activity} label="Recovery Engine" value={o?.recoveryEngine.actionsCount ?? 0}
            sub={`${o?.recoveryEngine.recommendationsCount ?? 0} recs · ${o?.recoveryEngine.skippedCount ?? 0} skipped`}
            color={statusColor(o?.recoveryEngine.status)} testId="metric-recovery" />
          <MetricCard icon={Radio} label="Activity 24h" value={o?.activity.visitsLast24h ?? 0}
            sub={`${o?.activity.contactsLast24h ?? 0} contacts · ${o?.activity.subscribersLast24h ?? 0} subs`}
            testId="metric-activity" />
        </section>

        {/* Founder briefing */}
        <section className="lux-card">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: GOLD }} />
                <h2 className="text-base font-bold">Founder Briefing</h2>
              </div>
              <p className="text-xs text-white/50 mt-1">DeepSeek-generated executive summary of current production state.</p>
            </div>
            <button onClick={() => briefing.mutate()} disabled={briefing.isPending}
              className="btn-primary px-4 py-2 text-sm whitespace-nowrap" data-testid="button-generate-briefing">
              {briefing.isPending ? "Generating…" : "Generate"}
            </button>
          </div>
          {briefing.data ? (
            <div className="bg-black/30 border border-white/10 rounded-xl p-4">
              <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans" data-testid="text-briefing">{briefing.data.briefing}</pre>
              <div className="text-xs text-white/40 mt-3 pt-3 border-t border-white/10">
                via {briefing.data.provider} · {briefing.data.latencyMs}ms
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/40 italic">No briefing generated yet — click Generate.</div>
          )}
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job throughput chart */}
          <section className="lux-card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2"><Zap className="h-4 w-4" style={{ color: GOLD }} /> Job Throughput · 24h</h2>
                <p className="text-xs text-white/50 mt-1">Hourly success / failure log buckets across all automation jobs.</p>
              </div>
            </div>
            <div className="h-64" data-testid="chart-throughput">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSucc" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gFail" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="succeeded" stroke="#22c55e" fill="url(#gSucc)" />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#gFail)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Infrastructure health */}
          <section className="lux-card">
            <h2 className="text-base font-bold flex items-center gap-2 mb-4"><Server className="h-4 w-4" style={{ color: GOLD }} /> Infrastructure</h2>
            <div className="space-y-3">
              <HealthDot ok={!!o?.health.database.ok} label="Database" />
              <HealthDot ok={!!o?.health.aiRouter.ok} label="AI Router" />
              <HealthDot ok={!!o?.health.openai.ok} label="OpenAI" />
              <HealthDot ok={!!o?.health.deepseek.ok} label="DeepSeek" />
              <HealthDot ok={!!o?.health.stripe.ok} label="Stripe" />
              <HealthDot ok={!!o?.health.resend.ok} label="Resend" />
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/50 space-y-1">
              <div>DB latency: <span className="text-white/80">{o?.health.database.latencyMs ?? "—"}ms</span></div>
              <div>Premium: <span className="text-white/80">{o?.health.aiRouter.premium ?? "—"}</span></div>
              <div>Automation: <span className="text-white/80">{o?.health.aiRouter.automation ?? "—"}</span></div>
              <div>Memory sessions: <span className="text-white/80">{o?.health.memory.activeSessions ?? 0}</span></div>
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recovery recommendations */}
          <section className="lux-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2"><Activity className="h-4 w-4" style={{ color: GOLD }} /> Recovery Engine</h2>
              <button onClick={() => recovery.mutate()} disabled={recovery.isPending}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 transition" data-testid="button-run-recovery">
                {recovery.isPending ? "Running…" : "Run now"}
              </button>
            </div>
            {o?.recoveryEngine.topRecommendations.length ? (
              <ul className="space-y-2">
                {o.recoveryEngine.topRecommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" data-testid={`rec-${i}`}>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${severityBadge(r.severity)}`}>{r.severity}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/85">{r.message}</div>
                      {r.jobKey && <div className="text-white/40 text-xs mt-0.5">{r.jobKey}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-white/40 italic">No active recommendations.</div>
            )}
            <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/50">
              Last run {o?.recoveryEngine.ageMinutes ?? "—"} min ago · status <span style={{ color: statusColor(o?.recoveryEngine.status) }}>{o?.recoveryEngine.status ?? "—"}</span>
            </div>
          </section>

          {/* QA sentinel issues */}
          <section className="lux-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2"><ShieldAlert className="h-4 w-4" style={{ color: GOLD }} /> QA Sentinel</h2>
              <button onClick={() => sentinel.mutate()} disabled={sentinel.isPending}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 transition" data-testid="button-run-sentinel">
                {sentinel.isPending ? "Running…" : "Run now"}
              </button>
            </div>
            {o?.qaSentinel.recentIssues.length ? (
              <ul className="space-y-2">
                {o.qaSentinel.recentIssues.map((iss, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" data-testid={`issue-${i}`}>
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: statusColor(o.qaSentinel.status) }} />
                    <span className="text-white/85">{iss}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-white/40 italic flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> No active issues detected.
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/50">
              Last run {o?.qaSentinel.ageMinutes ?? "—"} min ago · confidence {o?.qaSentinel.confidence ?? 0}%
            </div>
          </section>
        </div>

        {/* Failing + upcoming jobs */}
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="lux-card">
            <h2 className="text-base font-bold flex items-center gap-2 mb-4"><AlertTriangle className="h-4 w-4 text-red-400" /> Failing Jobs</h2>
            {o?.automation.failingJobs.length ? (
              <ul className="space-y-2 text-sm">
                {o.automation.failingJobs.map(j => (
                  <li key={j.jobKey} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0" data-testid={`failing-${j.jobKey}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="flex-1 truncate text-white/85">{j.jobKey}</span>
                    <span className="text-xs text-white/40">{j.jobGroup}</span>
                    <span className="text-xs text-red-400 font-mono">×{j.failureCount}</span>
                  </li>
                ))}
              </ul>
            ) : <div className="text-sm text-white/40 italic flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> All jobs healthy.</div>}
          </section>
          <section className="lux-card">
            <h2 className="text-base font-bold flex items-center gap-2 mb-4"><RefreshCw className="h-4 w-4" style={{ color: GOLD }} /> Upcoming Runs</h2>
            {o?.automation.upcoming.length ? (
              <ul className="space-y-2 text-sm">
                {o.automation.upcoming.map(u => (
                  <li key={u.jobKey} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0" data-testid={`upcoming-${u.jobKey}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                    <span className="flex-1 truncate text-white/85">{u.jobKey}</span>
                    <span className="text-xs text-white/50">in {u.nextRunInMinutes}m</span>
                  </li>
                ))}
              </ul>
            ) : <div className="text-sm text-white/40 italic">No upcoming runs scheduled.</div>}
          </section>
        </div>

        <footer className="text-center text-xs text-white/30 pt-4 pb-8">
          {o?.generatedAt && <>Generated {new Date(o.generatedAt).toLocaleTimeString()} · auto-refresh {POLL_MS / 1000}s</>}
        </footer>
      </main>
    </div>
  );
}

export default function OpsCenter() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");

  useEffect(() => {
    if (!authed) return;
    // Verify session by hitting overview once — if 401, gate re-shows.
    fetch("/api/admin/ops/overview", { credentials: "include" }).then(r => {
      if (r.status === 401) {
        sessionStorage.removeItem("e360_dashboard_auth");
        setAuthed(false);
      }
    });
  }, [authed]);

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <OpsDashboard onLogout={() => { sessionStorage.removeItem("e360_dashboard_auth"); setAuthed(false); }} />;
}
