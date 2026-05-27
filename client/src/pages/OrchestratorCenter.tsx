import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, Bot, Check, Eye, EyeOff, GitBranch, Layers,
  Lock, Play, RefreshCw, Shield, Sparkles, Workflow, X, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Stats = { queued: number; running: number; pendingApproval: number; succeeded24h: number; failed24h: number; blocked24h: number };
type Wf = {
  id: number; workflowKey: string; status: string; priority: number; triggeredBy: string;
  context: any; result: any; governanceDecision: any; agentTrace: any[];
  executiveSummary: string; founderDecision: string | null;
  startedAt: string | null; completedAt: string | null; createdAt: string;
  attemptCount: number;
};
type Agent = {
  key: string; description: string; allowedCapabilities: string[]; restrictedCapabilities: string[];
  providerPreference: string; cooldownMinutes: number; executionTimeoutMs: number; retryLimit: number;
};
type WorkflowDef = {
  workflowKey: string; description: string; defaultPriority: number;
  cooldownMinutes: number; steps: Array<{ agentKey: string; capability: string }>;
};
type Memory = { id: number; memoryType: string; scope: string; key: string; value: any; confidence: number; updatedAt: string };
type Status = {
  stats: Stats; recentWorkflows: Wf[]; agents: Agent[]; workflowDefinitions: WorkflowDef[];
  governance: { hardBlocks: string[]; approvalGates: string[] };
};

const statusColor = (s: string) =>
  s === "succeeded" ? "#22c55e"
  : s === "running" ? "#60a5fa"
  : s === "queued" ? "#94a3b8"
  : s === "pending_founder_approval" ? "#eab308"
  : s === "failed" ? "#ef4444"
  : s === "blocked" ? "#f97316"
  : s === "rejected" ? "#ef4444"
  : s === "approved" ? "#22c55e"
  : "#94a3b8";

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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}><Lock className="h-7 w-7 text-black" /></div>
          <h1 className="text-2xl font-bold text-white">Orchestrator Center</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input data-testid="input-orchestrator-pin" type={showPin ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter your PIN" autoComplete="current-password" autoFocus required className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12" />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">{showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
          {error && <p data-testid="text-orchestrator-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-orchestrator-login" className="btn-primary w-full py-3">Access Orchestrator</button>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="lux-card p-3" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-xl font-bold mt-1" style={{ color: color ?? "white" }}>{value}</div>
    </div>
  );
}

function Console({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"workflows" | "agents" | "memory" | "governance">("workflows");
  const { data, isLoading } = useQuery<Status>({
    queryKey: ["/api/admin/orchestrator/status"],
    queryFn: async () => {
      const r = await fetch("/api/admin/orchestrator/status", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); throw new Error("401"); }
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const { data: memory } = useQuery<Memory[]>({
    queryKey: ["/api/admin/orchestrator/memory"],
    queryFn: async () => (await fetch("/api/admin/orchestrator/memory", { credentials: "include" })).json(),
    refetchInterval: 30_000, enabled: tab === "memory",
  });

  const runWorkflow = useMutation({
    mutationFn: async (workflowKey: string) => {
      const r = await fetch("/api/admin/orchestrator/run", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ workflowKey }) });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message || "Run failed");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/orchestrator/status"] }),
  });

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "approve" | "reject" }) => {
      const r = await fetch(`/api/admin/orchestrator/workflows/${id}/${action}`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Decision failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/orchestrator/status"] }),
  });

  const stats = data?.stats;
  const wfs = data?.recentWorkflows ?? [];
  const pendingApproval = wfs.filter(w => w.status === "pending_founder_approval");
  const agentChart = data?.agents.map(a => ({
    name: a.key.replace("_agent", ""),
    runs24h: wfs.flatMap(w => (w.agentTrace ?? []) as any[]).filter(t => t.agent === a.key).length,
  })) ?? [];

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(220_50%_8%)]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}><Workflow className="h-5 w-5 text-black" /></div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Orchestrator Center</h1>
              <p className="text-[11px] sm:text-xs text-white/40 truncate">Phase 60 · Multi-agent coordination · Founder-supervised</p>
            </div>
          </div>
          <button data-testid="button-orchestrator-logout" onClick={() => { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); }} className="text-xs px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 transition">Sign out</button>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#F4A62A]/5 border border-[#F4A62A]/20 rounded-lg px-3 py-2">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>Recommendation & coordination only. The orchestrator can analyse, recommend, and surface — it cannot change money, infrastructure, or send mass communications without explicit founder action.</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto">
          {(["workflows", "agents", "memory", "governance"] as const).map(t => (
            <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${tab === t ? "bg-[#F4A62A] text-black font-semibold" : "border border-white/10 text-white/60 hover:border-white/30"}`}>{t}</button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading && <div className="text-white/50 text-sm">Loading…</div>}

        {stats && (
          <section className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            <Stat label="Queued" value={stats.queued} />
            <Stat label="Running" value={stats.running} color="#60a5fa" />
            <Stat label="Awaiting" value={stats.pendingApproval} color="#eab308" />
            <Stat label="Succeeded 24h" value={stats.succeeded24h} color="#22c55e" />
            <Stat label="Failed 24h" value={stats.failed24h} color="#ef4444" />
            <Stat label="Blocked 24h" value={stats.blocked24h} color="#f97316" />
          </section>
        )}

        {pendingApproval.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4" style={{ color: GOLD }} /> Founder approval queue ({pendingApproval.length})</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {pendingApproval.map(w => (
                <div key={w.id} className="lux-card p-4 border border-yellow-500/20" data-testid={`approval-card-${w.id}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold">{w.workflowKey}</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "#eab30822", color: "#eab308" }}>awaiting</span>
                  </div>
                  <p className="text-xs text-white/60 mb-2">{w.governanceDecision?.reason || "Awaiting decision."}</p>
                  <div className="flex gap-2">
                    <button data-testid={`button-approve-${w.id}`} onClick={() => decide.mutate({ id: w.id, action: "approve" })} disabled={decide.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 hover:bg-green-500/25 transition flex items-center gap-1.5 disabled:opacity-50"><Check className="h-3 w-3" /> Approve</button>
                    <button data-testid={`button-reject-${w.id}`} onClick={() => decide.mutate({ id: w.id, action: "reject" })} disabled={decide.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 transition flex items-center gap-1.5 disabled:opacity-50"><X className="h-3 w-3" /> Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "workflows" && (
          <>
            <section>
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Play className="h-4 w-4" style={{ color: GOLD }} /> Run a workflow</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data?.workflowDefinitions.map(d => (
                  <div key={d.workflowKey} className="lux-card p-4" data-testid={`workflow-def-${d.workflowKey}`}>
                    <h3 className="font-semibold text-sm mb-1">{d.workflowKey}</h3>
                    <p className="text-xs text-white/60 mb-2">{d.description}</p>
                    <p className="text-[10px] text-white/40 mb-3">{d.steps.length} steps · cooldown {d.cooldownMinutes}m · priority {d.defaultPriority}</p>
                    <button data-testid={`button-run-${d.workflowKey}`} onClick={() => runWorkflow.mutate(d.workflowKey)} disabled={runWorkflow.isPending} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#F4A62A]/40 hover:bg-white/5 transition flex items-center gap-1.5 disabled:opacity-50">
                      <RefreshCw className={`h-3 w-3 ${runWorkflow.isPending ? "animate-spin" : ""}`} style={{ color: GOLD }} />
                      {runWorkflow.isPending ? "Running…" : "Run now"}
                    </button>
                  </div>
                ))}
              </div>
              {runWorkflow.isError && <p className="text-xs text-red-400 mt-2">{(runWorkflow.error as Error)?.message}</p>}
            </section>

            <section>
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Activity className="h-4 w-4" style={{ color: GOLD }} /> Recent workflows</h2>
              <div className="space-y-2">
                {wfs.length === 0 && <p className="text-xs text-white/50">No workflows yet. Run one above.</p>}
                {wfs.map(w => (
                  <details key={w.id} className="lux-card" data-testid={`workflow-${w.id}`}>
                    <summary className="cursor-pointer p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: `${statusColor(w.status)}22`, color: statusColor(w.status) }}>{w.status}</span>
                        <span className="text-sm font-medium truncate">{w.workflowKey}</span>
                      </div>
                      <span className="text-[10px] text-white/40 shrink-0">{new Date(w.createdAt).toLocaleString()}</span>
                    </summary>
                    <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-3">
                      {w.executiveSummary && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Executive summary</p>
                          <pre className="text-xs text-white/80 whitespace-pre-wrap font-sans">{w.executiveSummary}</pre>
                        </div>
                      )}
                      {Array.isArray(w.agentTrace) && w.agentTrace.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Agent trace</p>
                          <div className="space-y-1">
                            {w.agentTrace.map((t: any, i: number) => (
                              <div key={i} className="text-xs flex items-center justify-between border-b border-white/5 pb-1">
                                <span className="truncate"><span className="text-white/40">{t.agent}</span> · {t.capability}</span>
                                <span className="text-[10px]" style={{ color: statusColor(t.status) }}>{t.status} · {t.governance ?? "—"} · {t.durationMs}ms</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {w.governanceDecision?.reason && (
                        <p className="text-xs text-white/60 italic">⚖ {w.governanceDecision.reason}</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {agentChart.length > 0 && (
              <section className="lux-card p-4">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Bot className="h-4 w-4" style={{ color: GOLD }} /> Agent activity (recent workflows)</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" stroke="#ffffff60" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#ffffff60" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #ffffff20", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                      <Bar dataKey="runs24h" fill={GOLD} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </>
        )}

        {tab === "agents" && data && (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.agents.map(a => (
              <div key={a.key} className="lux-card p-4" data-testid={`agent-card-${a.key}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{a.key}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${GOLD}22`, color: GOLD }}>{a.providerPreference}</span>
                </div>
                <p className="text-xs text-white/60 mb-3">{a.description}</p>
                <div className="space-y-1.5 text-[11px]">
                  <div><span className="text-white/40">Allowed:</span> <span className="text-green-400">{a.allowedCapabilities.join(", ")}</span></div>
                  <div><span className="text-white/40">Restricted:</span> <span className="text-red-400">{a.restrictedCapabilities.join(", ") || "—"}</span></div>
                  <div className="text-white/40">Cooldown {a.cooldownMinutes}m · timeout {a.executionTimeoutMs / 1000}s · retries {a.retryLimit}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "memory" && (
          <section>
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Layers className="h-4 w-4" style={{ color: GOLD }} /> Shared operational memory ({memory?.length ?? 0})</h2>
            <div className="space-y-2">
              {(memory ?? []).length === 0 && <p className="text-xs text-white/50">No memory entries yet. Run workflows to populate.</p>}
              {(memory ?? []).map(m => (
                <div key={m.id} className="lux-card p-3" data-testid={`memory-${m.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-white/80">{m.scope}/{m.key}</span>
                    <span className="text-[10px] text-white/40">{m.memoryType} · conf {m.confidence}% · {new Date(m.updatedAt).toLocaleString()}</span>
                  </div>
                  <pre className="text-[11px] text-white/60 whitespace-pre-wrap font-mono">{JSON.stringify(m.value, null, 2)}</pre>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "governance" && data && (
          <section className="grid lg:grid-cols-2 gap-4">
            <div className="lux-card p-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-red-400" /> Hard blocks ({data.governance.hardBlocks.length})</h2>
              <p className="text-[11px] text-white/50 mb-3">These capabilities are <strong>always rejected</strong>, regardless of agent or context.</p>
              <div className="flex flex-wrap gap-1.5">
                {data.governance.hardBlocks.map(b => (<span key={b} className="text-[10px] px-2 py-1 rounded-md bg-red-500/10 text-red-300 border border-red-500/20 font-mono">{b}</span>))}
              </div>
            </div>
            <div className="lux-card p-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><GitBranch className="h-4 w-4 text-yellow-400" /> Approval gates ({data.governance.approvalGates.length})</h2>
              <p className="text-[11px] text-white/50 mb-3">These capabilities pause the workflow for <strong>explicit founder approval</strong>.</p>
              <div className="flex flex-wrap gap-1.5">
                {data.governance.approvalGates.map(b => (<span key={b} className="text-[10px] px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 font-mono">{b}</span>))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function OrchestratorCenter() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(sessionStorage.getItem("e360_dashboard_auth") === "true"); }, []);
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console onLogout={() => setAuthed(false)} />;
}
