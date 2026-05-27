import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, Brain, Check, CheckCircle2, Eye, EyeOff, Heart,
  Lightbulb, Lock, Play, RadioTower, RefreshCw, Shield, TrendingDown,
  TrendingUp, Workflow, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Snap = {
  id: number; globalStatus: string; healthScore: number;
  infrastructureScore: number; aiScore: number; revenueScore: number;
  growthScore: number; orchestrationScore: number;
  personalizationScore: number; experimentScore: number;
  summary: string; createdAt: string;
};
type Signal = { id: number; signalType: string; source: string; severity: string; confidence: number; summary: string; status: string; createdAt: string };
type Escalation = { id: number; severity: string; title: string; description: string; recommendation: string; status: string; createdAt: string; resolvedAt: string | null };
type Health = { id: number; category: string; score: number; trend: string; explanation: string; createdAt: string };
type Insight = { id: number; insightType: string; title: string; body: string; source: string; confidence: number; createdAt: string };
type Overview = {
  cognitiveState: Snap | null;
  signals: Signal[];
  escalations: Escalation[];
  health: Health[];
  insights: Insight[];
  orchestrator: { stats: any; recentWorkflows: any[] };
  workflowMatrix: any[];
  providers: { openai: boolean; deepseek: boolean };
  generatedAt: string;
};

const sevColor = (s: string) => s === "critical" ? "#ef4444" : s === "high" ? "#f97316" : s === "medium" ? "#eab308" : s === "low" ? "#60a5fa" : "#94a3b8";
const statusColor = (s: string) => s === "healthy" ? "#22c55e" : s === "degraded" ? "#eab308" : s === "critical" ? "#ef4444" : "#94a3b8";
const trendIcon = (t: string) => t === "up" ? <TrendingUp className="h-3 w-3 text-green-400" /> : t === "down" ? <TrendingDown className="h-3 w-3 text-red-400" /> : <span className="text-white/40 text-[10px]">—</span>;

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState(""); const [showPin, setShowPin] = useState(false); const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const res = await fetch("/api/dashboard/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    if (res.ok) { sessionStorage.setItem("e360_dashboard_auth", "true"); onAuth(); }
    else { setError("Invalid PIN."); setPin(""); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}><Brain className="h-7 w-7 text-black" /></div>
          <h1 className="text-2xl font-bold text-white">Neural Command Grid</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Central Nervous System</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input data-testid="input-grid-pin" type={showPin ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter your PIN" autoFocus required className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12" />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">{showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-grid-login" className="btn-primary w-full py-3">Access Command Grid</button>
        </form>
      </div>
    </div>
  );
}

function Console({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "signals" | "escalations" | "health" | "insights" | "matrix">("overview");

  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["/api/admin/command-grid/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/command-grid/overview", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); throw new Error("401"); }
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const runScan = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/command-grid/run", { method: "POST", credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || "Scan failed");
      return j;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/command-grid/overview"] }),
  });

  const resolve = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/command-grid/escalations/${id}/resolve`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Resolve failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/command-grid/overview"] }),
  });

  const snap = data?.cognitiveState;
  const openEsc = (data?.escalations ?? []).filter(e => e.status === "open");
  const healthChart = (data?.health ?? []).map(h => ({ name: h.category, score: h.score }));
  const radialData = snap ? [{ name: "global", value: snap.healthScore, fill: statusColor(snap.globalStatus) }] : [];

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(220_50%_8%)]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}><Brain className="h-5 w-5 text-black" /></div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Neural Command Grid</h1>
              <p className="text-[11px] sm:text-xs text-white/40 truncate">Phase 61 · Central nervous system · Recommendation-only</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="button-run-scan" onClick={() => runScan.mutate()} disabled={runScan.isPending} className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold disabled:opacity-50" style={{ background: GOLD, color: "#000" }}>
              <RadioTower className={`h-3.5 w-3.5 ${runScan.isPending ? "animate-pulse" : ""}`} />
              {runScan.isPending ? "Scanning…" : "Run scan"}
            </button>
            <button data-testid="button-grid-logout" onClick={() => { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); }} className="text-xs px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 transition">Sign out</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#F4A62A]/5 border border-[#F4A62A]/20 rounded-lg px-3 py-2">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>The Command Grid monitors, prioritises and synthesises. It cannot change money, infrastructure, or send communications — all action requires explicit founder approval.</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto">
          {(["overview", "signals", "escalations", "health", "insights", "matrix"] as const).map(t => (
            <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${tab === t ? "bg-[#F4A62A] text-black font-semibold" : "border border-white/10 text-white/60 hover:border-white/30"}`}>
              {t === "matrix" ? "Workflow Matrix" : t}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading && <div className="text-white/50 text-sm">Loading…</div>}
        {runScan.isError && <p className="text-xs text-red-400">{(runScan.error as Error)?.message}</p>}

        {tab === "overview" && data && (
          <>
            <section className="grid md:grid-cols-3 gap-4">
              <div className="lux-card p-4 md:col-span-1" data-testid="card-cognitive">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4" style={{ color: GOLD }} />
                  <span className="text-sm font-semibold">Cognitive State</span>
                </div>
                {snap ? (
                  <>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart innerRadius="60%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                          <RadialBar background={{ fill: "#ffffff10" }} dataKey="value" cornerRadius={10} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-center -mt-28 mb-12 pointer-events-none">
                      <div className="text-3xl font-bold" style={{ color: statusColor(snap.globalStatus) }}>{snap.healthScore}</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/50">{snap.globalStatus}</div>
                    </div>
                    <p className="text-xs text-white/70 mt-1">{snap.summary}</p>
                  </>
                ) : (
                  <p className="text-xs text-white/50">No snapshot yet. Run a scan.</p>
                )}
              </div>

              <div className="lux-card p-4 md:col-span-2" data-testid="card-health-chart">
                <div className="flex items-center gap-2 mb-3"><Activity className="h-4 w-4" style={{ color: GOLD }} /><span className="text-sm font-semibold">Category health</span></div>
                {healthChart.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={healthChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="name" stroke="#ffffff60" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#ffffff60" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #ffffff20", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                          {healthChart.map((h, i) => (<Cell key={i} fill={h.score >= 80 ? "#22c55e" : h.score >= 55 ? "#eab308" : "#ef4444"} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-xs text-white/50">No health data yet. Run a scan.</p>}
              </div>
            </section>

            <section className="grid md:grid-cols-3 gap-3">
              <div className="lux-card p-3"><div className="text-[10px] uppercase tracking-wider text-white/40">Open signals</div><div className="text-xl font-bold mt-1">{data.signals.filter(s => s.status === "open").length}</div></div>
              <div className="lux-card p-3"><div className="text-[10px] uppercase tracking-wider text-white/40">Open escalations</div><div className="text-xl font-bold mt-1" style={{ color: openEsc.length ? "#eab308" : "white" }}>{openEsc.length}</div></div>
              <div className="lux-card p-3"><div className="text-[10px] uppercase tracking-wider text-white/40">Orchestrator workflows (24h)</div><div className="text-xl font-bold mt-1">{(data.orchestrator.stats.succeeded24h || 0) + (data.orchestrator.stats.failed24h || 0) + (data.orchestrator.stats.blocked24h || 0)}</div></div>
            </section>

            {openEsc.length > 0 && (
              <section>
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-yellow-400" /> Open escalations ({openEsc.length})</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {openEsc.slice(0, 4).map(e => (
                    <div key={e.id} className="lux-card p-4 border border-yellow-500/20" data-testid={`escalation-${e.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold truncate">{e.title}</span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0" style={{ background: `${sevColor(e.severity)}22`, color: sevColor(e.severity) }}>{e.severity}</span>
                      </div>
                      {e.description && <p className="text-xs text-white/60 mb-2 line-clamp-2">{e.description}</p>}
                      {e.recommendation && <p className="text-xs text-white/80 mb-2"><strong>Suggested:</strong> {e.recommendation}</p>}
                      <button data-testid={`button-resolve-${e.id}`} onClick={() => resolve.mutate(e.id)} disabled={resolve.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 hover:bg-green-500/25 transition flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 className="h-3 w-3" /> Mark resolved</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.insights.length > 0 && (
              <section>
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Lightbulb className="h-4 w-4" style={{ color: GOLD }} /> Latest insights</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {data.insights.slice(0, 4).map(i => (
                    <div key={i.id} className="lux-card p-4" data-testid={`insight-${i.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{i.insightType}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${GOLD}22`, color: GOLD }}>{i.source}</span>
                      </div>
                      <pre className="text-xs text-white/80 whitespace-pre-wrap font-sans">{i.body}</pre>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="lux-card p-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Zap className="h-4 w-4" style={{ color: GOLD }} /> Provider status</h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between"><span>OpenAI (executive)</span><span style={{ color: data.providers.openai ? "#22c55e" : "#ef4444" }}>{data.providers.openai ? "configured" : "missing"}</span></div>
                <div className="flex items-center justify-between"><span>DeepSeek (diagnostics)</span><span style={{ color: data.providers.deepseek ? "#22c55e" : "#ef4444" }}>{data.providers.deepseek ? "configured" : "missing"}</span></div>
              </div>
            </section>
          </>
        )}

        {tab === "signals" && (
          <section className="space-y-2">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-2"><RadioTower className="h-4 w-4" style={{ color: GOLD }} /> Live signal stream ({data?.signals.length ?? 0})</h2>
            {(data?.signals ?? []).length === 0 && <p className="text-xs text-white/50">No signals yet. Run a scan to populate.</p>}
            {(data?.signals ?? []).map(s => (
              <div key={s.id} className="lux-card p-3 flex items-center gap-3" data-testid={`signal-${s.id}`}>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 font-semibold" style={{ background: `${sevColor(s.severity)}22`, color: sevColor(s.severity) }}>{s.severity}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs"><span className="text-white/40">{s.source}</span> · <span className="font-mono">{s.signalType}</span></div>
                  {s.summary && <div className="text-xs text-white/60 truncate">{s.summary}</div>}
                </div>
                <span className="text-[10px] text-white/40 shrink-0">{s.status} · {s.confidence}% · {new Date(s.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </section>
        )}

        {tab === "escalations" && (
          <section className="space-y-2">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-yellow-400" /> Escalations ({data?.escalations.length ?? 0})</h2>
            {(data?.escalations ?? []).length === 0 && <p className="text-xs text-white/50">No escalations yet.</p>}
            {(data?.escalations ?? []).map(e => (
              <div key={e.id} className="lux-card p-4" data-testid={`escalation-row-${e.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{e.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${sevColor(e.severity)}22`, color: sevColor(e.severity) }}>{e.severity}</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: e.status === "open" ? "#eab30822" : "#22c55e22", color: e.status === "open" ? "#eab308" : "#22c55e" }}>{e.status}</span>
                  </div>
                </div>
                {e.description && <p className="text-xs text-white/60 mt-1 mb-1">{e.description}</p>}
                {e.recommendation && <p className="text-xs text-white/80 mt-1"><strong>Suggested:</strong> {e.recommendation}</p>}
                {e.status === "open" && (
                  <button data-testid={`button-resolve-list-${e.id}`} onClick={() => resolve.mutate(e.id)} disabled={resolve.isPending} className="text-xs mt-2 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 hover:bg-green-500/25 transition flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 className="h-3 w-3" /> Resolve</button>
                )}
              </div>
            ))}
          </section>
        )}

        {tab === "health" && (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(data?.health ?? []).map(h => (
              <div key={h.id} className="lux-card p-4" data-testid={`health-${h.category}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold capitalize">{h.category}</span>
                  <div className="flex items-center gap-1">{trendIcon(h.trend)}<span className="text-lg font-bold" style={{ color: h.score >= 80 ? "#22c55e" : h.score >= 55 ? "#eab308" : "#ef4444" }}>{h.score}</span></div>
                </div>
                <p className="text-xs text-white/60">{h.explanation}</p>
              </div>
            ))}
            {(data?.health ?? []).length === 0 && <p className="text-xs text-white/50">No health data yet.</p>}
          </section>
        )}

        {tab === "insights" && (
          <section className="space-y-3">
            {(data?.insights ?? []).map(i => (
              <div key={i.id} className="lux-card p-4" data-testid={`insight-row-${i.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{i.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${GOLD}22`, color: GOLD }}>{i.source} · {i.insightType}</span>
                </div>
                <pre className="text-xs text-white/80 whitespace-pre-wrap font-sans">{i.body}</pre>
              </div>
            ))}
            {(data?.insights ?? []).length === 0 && <p className="text-xs text-white/50">No insights yet. Run a scan.</p>}
          </section>
        )}

        {tab === "matrix" && (
          <section>
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Workflow className="h-4 w-4" style={{ color: GOLD }} /> Recent orchestrator workflows</h2>
            <div className="space-y-1.5">
              {(data?.orchestrator.recentWorkflows ?? []).slice(0, 15).map((w: any) => (
                <div key={w.id} className="lux-card p-3 flex items-center justify-between text-xs" data-testid={`matrix-wf-${w.id}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0" style={{ background: `${statusColor(w.status === "succeeded" ? "healthy" : w.status === "failed" ? "critical" : "degraded")}22`, color: statusColor(w.status === "succeeded" ? "healthy" : w.status === "failed" ? "critical" : "degraded") }}>{w.status}</span>
                    <span className="truncate">{w.workflowKey}</span>
                  </div>
                  <span className="text-[10px] text-white/40 shrink-0">{new Date(w.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {(data?.orchestrator.recentWorkflows ?? []).length === 0 && <p className="text-xs text-white/50">No workflows yet.</p>}
            </div>
            {(data?.workflowMatrix ?? []).length > 0 && (
              <>
                <h3 className="font-semibold text-xs mt-5 mb-2 text-white/70">Declared workflow dependencies</h3>
                <div className="space-y-1">
                  {(data?.workflowMatrix ?? []).map((d: any) => (
                    <div key={d.id} className="text-[11px] font-mono text-white/70 px-2">{d.parentWorkflowKey} → {d.childWorkflowKey} <span className="text-white/40">({d.dependencyType})</span></div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default function CommandGrid() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(sessionStorage.getItem("e360_dashboard_auth") === "true"); }, []);
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console onLogout={() => setAuthed(false)} />;
}
