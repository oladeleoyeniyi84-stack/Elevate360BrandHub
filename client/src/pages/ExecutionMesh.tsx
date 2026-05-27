import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, Bot, Brain, CheckCircle2, Cpu, Eye, EyeOff,
  GitBranch, Layers, MessageSquare, Network, Pause, Play, Plus, RefreshCw,
  Send, Shield, Workflow, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Agent = {
  id: number; agentKey: string; displayName: string; specialization: string;
  provider: string; status: string; maxConcurrency: number; cooldownSeconds: number;
  capabilities: string[]; totalRuns: number; successfulRuns: number; failedRuns: number;
  averageLatencyMs: number; lastHeartbeatAt: string | null;
};
type Mission = {
  id: number; missionKey: string; title: string; objective: string; priority: number;
  status: string; workflowOrigin: string | null; resultSummary: string;
  confidence: number; createdAt: string; completedAt: string | null;
};
type Task = { id: number; missionId: number; taskKey: string; capability: string; status: string; executionOrder: number; executionOutput: any };
type Comm = { id: number; communicationType: string; payload: any; createdAt: string };
type Topology = { meshHealthScore: number; activeAgents: number; queuedMissions: number; runningMissions: number; topology: any; createdAt: string };
type Overview = {
  stats: { idleAgents: number; busyAgents: number; queuedMissions: number; runningMissions: number; failedMissions24h: number; completedMissions24h: number };
  agents: Agent[]; missions: Mission[]; communications: Comm[]; topology: Topology | null;
  queue: any[]; providers: { openai: boolean; deepseek: boolean }; generatedAt: string;
};

const statusColor = (s: string) => ({
  idle: "#22c55e", busy: "#eab308", offline: "#94a3b8",
  queued: "#94a3b8", assigned: "#60a5fa", running: "#eab308",
  completed: "#22c55e", completed_with_failures: "#eab308",
  failed: "#ef4444", blocked: "#ef4444", pending_approval: "#f97316",
  cancelled: "#94a3b8", succeeded: "#22c55e", requires_approval: "#f97316",
}[s] || "#94a3b8");

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState(""); const [show, setShow] = useState(false); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/dashboard/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    if (r.ok) { sessionStorage.setItem("e360_dashboard_auth", "true"); onAuth(); } else { setErr("Invalid PIN."); setPin(""); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}><Network className="h-7 w-7 text-black" /></div>
          <h1 className="text-2xl font-bold text-white">Execution Mesh</h1>
          <p className="text-white/50 text-sm mt-1">Phase 62 · Distributed AI workforce</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input data-testid="input-mesh-pin" type={show ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN" autoFocus required className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 pr-12 focus:outline-none focus:border-[#F4A62A]/50" />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
          {err && <p className="text-red-400 text-sm text-center">{err}</p>}
          <button type="submit" data-testid="button-mesh-login" className="btn-primary w-full py-3">Enter Mesh</button>
        </form>
      </div>
    </div>
  );
}

function NewMissionForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [capsRaw, setCapsRaw] = useState("analyze.health, summarize.workflow");
  const create = useMutation({
    mutationFn: async () => {
      const caps = capsRaw.split(",").map(s => s.trim()).filter(Boolean);
      const r = await fetch("/api/admin/mesh/missions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, objective, workflowOrigin: "manual", capabilities: caps }) });
      const j = await r.json(); if (!r.ok) throw new Error(j?.message || "Create failed"); return j;
    },
    onSuccess: () => { setTitle(""); setObjective(""); qc.invalidateQueries({ queryKey: ["/api/admin/mesh/overview"] }); onDone(); },
  });
  return (
    <form onSubmit={e => { e.preventDefault(); create.mutate(); }} className="lux-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" style={{ color: GOLD }} /> New mission</h3>
      <input data-testid="input-mission-title" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Mission title" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-xs" />
      <textarea data-testid="input-mission-objective" value={objective} onChange={e => setObjective(e.target.value)} placeholder="Objective" rows={2} className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-xs" />
      <input data-testid="input-mission-caps" value={capsRaw} onChange={e => setCapsRaw(e.target.value)} placeholder="capability1, capability2…" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono" />
      {create.isError && <p className="text-xs text-red-400">{(create.error as Error).message}</p>}
      <button type="submit" data-testid="button-create-mission" disabled={create.isPending} className="text-xs px-3 py-2 rounded-lg font-semibold disabled:opacity-50" style={{ background: GOLD, color: "#000" }}>{create.isPending ? "Creating…" : "Queue mission"}</button>
    </form>
  );
}

function Console({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "agents" | "missions" | "tasks" | "communications" | "topology" | "memory">("overview");
  const [selected, setSelected] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["/api/admin/mesh/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/mesh/overview", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); throw new Error("401"); }
      if (!r.ok) throw new Error("Failed"); return r.json();
    },
    refetchInterval: 10_000,
  });

  const runTick = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/mesh/run", { method: "POST", credentials: "include" });
      const j = await r.json(); if (!r.ok) throw new Error(j?.message || "Tick failed"); return j;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/mesh/overview"] }),
  });

  const cancel = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/mesh/missions/${id}/cancel`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Cancel failed"); return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/mesh/overview"] }),
  });

  const { data: detail } = useQuery<{ mission: Mission; tasks: Task[]; audit: any[] }>({
    queryKey: ["/api/admin/mesh/missions", selected],
    enabled: !!selected,
    queryFn: async () => { const r = await fetch(`/api/admin/mesh/missions/${selected}`, { credentials: "include" }); if (!r.ok) throw new Error(""); return r.json(); },
  });

  const tasks = (data?.missions || []).slice(0, 8);
  const agentLoad = (data?.agents || []).map(a => ({ name: a.agentKey.replace("_worker", ""), total: a.totalRuns, success: a.successfulRuns, failed: a.failedRuns }));

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(220_50%_8%)]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}><Network className="h-5 w-5 text-black" /></div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Execution Mesh</h1>
              <p className="text-[11px] sm:text-xs text-white/40 truncate">Phase 62 · Distributed AI workforce · Recommendation-only</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="button-run-tick" onClick={() => runTick.mutate()} disabled={runTick.isPending} className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold disabled:opacity-50" style={{ background: GOLD, color: "#000" }}>
              <RefreshCw className={`h-3.5 w-3.5 ${runTick.isPending ? "animate-spin" : ""}`} />
              {runTick.isPending ? "Ticking…" : "Run tick"}
            </button>
            <button data-testid="button-mesh-logout" onClick={() => { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); }} className="text-xs px-3 py-2 rounded-lg border border-white/10">Sign out</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#F4A62A]/5 border border-[#F4A62A]/20 rounded-lg px-3 py-2">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>Workers operate under Phase 60 governance — they may analyse, recommend and synthesise. Risky capabilities (pricing, outbound, infra) still pause for founder approval.</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto">
          {(["overview", "agents", "missions", "tasks", "communications", "topology", "memory"] as const).map(t => (
            <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${tab === t ? "bg-[#F4A62A] text-black font-semibold" : "border border-white/10 text-white/60 hover:border-white/30"}`}>{t}</button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading && <p className="text-white/50 text-sm">Loading…</p>}
        {runTick.isError && <p className="text-xs text-red-400">{(runTick.error as Error).message}</p>}

        {tab === "overview" && data && (
          <>
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l: "Mesh health", v: data.topology?.meshHealthScore ?? "—", c: GOLD, icon: <Activity className="h-3.5 w-3.5" /> },
                { l: "Active agents", v: `${data.stats.idleAgents + data.stats.busyAgents}`, c: "#22c55e", icon: <Bot className="h-3.5 w-3.5" /> },
                { l: "Running missions", v: data.stats.runningMissions, c: "#eab308", icon: <Workflow className="h-3.5 w-3.5" /> },
                { l: "Queued missions", v: data.stats.queuedMissions, c: "#60a5fa", icon: <Layers className="h-3.5 w-3.5" /> },
              ].map((s, i) => (
                <div key={i} className="lux-card p-3" data-testid={`stat-${i}`}>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">{s.icon}{s.l}</div>
                  <div className="text-2xl font-bold mt-1" style={{ color: s.c }}>{s.v}</div>
                </div>
              ))}
            </section>

            <section className="lux-card p-4" data-testid="agent-load">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Cpu className="h-4 w-4" style={{ color: GOLD }} /> Workload distribution</h2>
              {agentLoad.some(a => a.total > 0) ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentLoad}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" stroke="#ffffff60" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis stroke="#ffffff60" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #ffffff20", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                      <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-white/50">No runs yet. Create a mission or run a tick.</p>}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2"><Workflow className="h-4 w-4" style={{ color: GOLD }} /> Recent missions</h2>
                <button data-testid="button-toggle-new" onClick={() => setShowNew(v => !v)} className="text-xs px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1"><Plus className="h-3 w-3" /> {showNew ? "Hide" : "New mission"}</button>
              </div>
              {showNew && <div className="mb-3"><NewMissionForm onDone={() => setShowNew(false)} /></div>}
              {tasks.length === 0 && <p className="text-xs text-white/50">No missions yet.</p>}
              <div className="space-y-2">
                {tasks.map(m => (
                  <div key={m.id} className="lux-card p-3 flex items-center gap-3 cursor-pointer" data-testid={`mission-${m.id}`} onClick={() => { setSelected(m.id); setTab("missions"); }}>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: `${statusColor(m.status)}22`, color: statusColor(m.status) }}>{m.status}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{m.title}</div>
                      <div className="text-[11px] text-white/40 truncate">{m.workflowOrigin || "manual"} · priority {m.priority} · {new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "agents" && (
          <section className="grid sm:grid-cols-2 gap-3">
            {(data?.agents || []).map(a => (
              <div key={a.id} className="lux-card p-4" data-testid={`agent-${a.agentKey}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold">{a.displayName}</div>
                    <div className="text-[11px] text-white/40">{a.specialization}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor(a.status)}22`, color: statusColor(a.status) }}>{a.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                  <div><div className="text-white/40">Provider</div><div>{a.provider}</div></div>
                  <div><div className="text-white/40">Runs</div><div>{a.totalRuns} ({a.successfulRuns}✓ / {a.failedRuns}✗)</div></div>
                  <div><div className="text-white/40">Avg latency</div><div>{a.averageLatencyMs}ms</div></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.capabilities.map(c => (<span key={c} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${GOLD}15`, color: GOLD }}>{c}</span>))}
                </div>
              </div>
            ))}
            {(data?.agents || []).length === 0 && <p className="text-xs text-white/50">No agents seeded yet — run a tick.</p>}
          </section>
        )}

        {tab === "missions" && (
          <section className="space-y-3">
            {!selected && (data?.missions || []).map(m => (
              <div key={m.id} className="lux-card p-3 cursor-pointer" data-testid={`mission-row-${m.id}`} onClick={() => setSelected(m.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 font-semibold" style={{ background: `${statusColor(m.status)}22`, color: statusColor(m.status) }}>{m.status}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{m.title}</div>
                      <div className="text-[11px] text-white/40 truncate">{m.missionKey}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-white/40 shrink-0">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                {m.resultSummary && <p className="text-xs text-white/60 mt-1 truncate">{m.resultSummary}</p>}
              </div>
            ))}
            {selected && detail && (
              <div className="lux-card p-4 space-y-3" data-testid="mission-detail">
                <div className="flex items-center justify-between">
                  <button data-testid="button-back-missions" onClick={() => setSelected(null)} className="text-xs px-2 py-1 rounded-lg border border-white/10">← Back</button>
                  {(detail.mission.status === "queued" || detail.mission.status === "running" || detail.mission.status === "assigned") && (
                    <button data-testid="button-cancel-mission" onClick={() => cancel.mutate(detail.mission.id)} disabled={cancel.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 flex items-center gap-1.5 disabled:opacity-50"><Pause className="h-3 w-3" /> Cancel mission</button>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor(detail.mission.status)}22`, color: statusColor(detail.mission.status) }}>{detail.mission.status}</span>
                    <h3 className="text-base font-semibold">{detail.mission.title}</h3>
                  </div>
                  {detail.mission.objective && <p className="text-xs text-white/60 mt-2">{detail.mission.objective}</p>}
                  {detail.mission.resultSummary && <p className="text-xs text-white/80 mt-2"><strong>Result:</strong> {detail.mission.resultSummary}</p>}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white/70 mb-1">Tasks</h4>
                  <div className="space-y-1.5">
                    {detail.tasks.map(t => (
                      <div key={t.id} className="border border-white/5 rounded-lg p-2.5" data-testid={`task-${t.id}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono">{t.executionOrder}. {t.capability}</span>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor(t.status)}22`, color: statusColor(t.status) }}>{t.status}</span>
                        </div>
                        {t.executionOutput?.content && (<pre className="text-[11px] text-white/70 whitespace-pre-wrap font-sans mt-1">{t.executionOutput.content}</pre>)}
                        {t.executionOutput?.reason && (<p className="text-[11px] text-yellow-400 mt-1">⚠ {t.executionOutput.reason}</p>)}
                        {t.executionOutput?.error && (<p className="text-[11px] text-red-400 mt-1">{t.executionOutput.error}</p>)}
                      </div>
                    ))}
                  </div>
                </div>
                {detail.audit.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-white/70 mb-1">Audit trail</h4>
                    <div className="space-y-1">
                      {detail.audit.map((a: any) => (
                        <div key={a.id} className="text-[11px] text-white/60 flex items-center gap-2">
                          <span className="text-white/40">{new Date(a.createdAt).toLocaleTimeString()}</span>
                          <span className="text-white/40 font-mono">{a.eventType}</span>
                          <span className="truncate">{a.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {tab === "tasks" && (
          <section className="space-y-1.5">
            {(data?.missions || []).flatMap((m: any) => m.tasks ?? []).length === 0 && <p className="text-xs text-white/50">Open a mission for per-task details.</p>}
            {(data?.missions || []).map(m => (
              <div key={m.id} className="lux-card p-3 cursor-pointer" onClick={() => { setSelected(m.id); setTab("missions"); }}>
                <div className="text-xs"><span className="font-semibold">{m.title}</span> <span className="text-white/40">— click to view tasks</span></div>
              </div>
            ))}
          </section>
        )}

        {tab === "communications" && (
          <section className="space-y-2">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4" style={{ color: GOLD }} /> Inter-agent communications</h2>
            {(data?.communications || []).length === 0 && <p className="text-xs text-white/50">No communications yet.</p>}
            {(data?.communications || []).map(c => (
              <div key={c.id} className="lux-card p-3" data-testid={`comm-${c.id}`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono px-2 py-0.5 rounded-full" style={{ background: `${GOLD}15`, color: GOLD }}>{c.communicationType}</span>
                  <span className="text-white/40">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                {c.payload && Object.keys(c.payload).length > 0 && (<pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono mt-1.5">{JSON.stringify(c.payload, null, 2).slice(0, 400)}</pre>)}
              </div>
            ))}
          </section>
        )}

        {tab === "topology" && data?.topology && (
          <section className="space-y-4">
            <div className="lux-card p-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><GitBranch className="h-4 w-4" style={{ color: GOLD }} /> Topology snapshot</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div><div className="text-white/40">Health</div><div className="text-lg font-bold" style={{ color: data.topology.meshHealthScore >= 80 ? "#22c55e" : data.topology.meshHealthScore >= 55 ? "#eab308" : "#ef4444" }}>{data.topology.meshHealthScore}</div></div>
                <div><div className="text-white/40">Active agents</div><div className="text-lg font-bold">{data.topology.activeAgents}</div></div>
                <div><div className="text-white/40">Running</div><div className="text-lg font-bold">{data.topology.runningMissions}</div></div>
                <div><div className="text-white/40">Queued</div><div className="text-lg font-bold">{data.topology.queuedMissions}</div></div>
              </div>
              <p className="text-[10px] text-white/40 mt-3">Captured {new Date(data.topology.createdAt).toLocaleString()}</p>
            </div>
            {data.topology.topology?.nodes && (
              <div className="lux-card p-4">
                <h3 className="text-sm font-semibold mb-2">Agent graph</h3>
                <div className="grid sm:grid-cols-3 gap-2">
                  {data.topology.topology.nodes.map((n: any) => (
                    <div key={n.id} className="border border-white/10 rounded-lg p-2.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{n.label}</span>
                        <span style={{ color: statusColor(n.status) }}>{n.status}</span>
                      </div>
                      <div className="text-white/40">{n.specialization}</div>
                      <div className="text-white/60 mt-1">{n.totalRuns} runs · {n.successRate ?? "—"}% success · {n.averageLatencyMs}ms</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.topology.topology?.edges?.length > 0 && (
              <div className="lux-card p-4">
                <h3 className="text-sm font-semibold mb-2">Communication graph</h3>
                <div className="space-y-1">
                  {data.topology.topology.edges.slice(0, 12).map((e: any, i: number) => (
                    <div key={i} className="text-[11px] font-mono text-white/70">{e.from} → {e.to} <span className="text-white/40">({e.type})</span></div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "memory" && (
          <section className="lux-card p-4">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-2"><Brain className="h-4 w-4" style={{ color: GOLD }} /> Worker memory</h2>
            <p className="text-xs text-white/50">Per-agent scoped memory updates as missions complete. View agent details to see capability footprints.</p>
            <div className="grid sm:grid-cols-3 gap-2 mt-3">
              {(data?.agents || []).map(a => (
                <div key={a.id} className="border border-white/10 rounded-lg p-2.5 text-[11px]">
                  <div className="font-semibold">{a.displayName}</div>
                  <div className="text-white/40">{a.specialization}</div>
                  <div className="text-white/60 mt-1">{a.totalRuns} memory writes</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function ExecutionMesh() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(sessionStorage.getItem("e360_dashboard_auth") === "true"); }, []);
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console onLogout={() => setAuthed(false)} />;
}
