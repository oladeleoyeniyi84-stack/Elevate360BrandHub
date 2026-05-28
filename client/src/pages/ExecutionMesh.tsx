import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, Bot, Brain, CheckCircle2, Cpu, Eye, EyeOff, GitBranch, Layers, Loader2, MessageSquare, Network, Pause, Plus, RefreshCw, Shield, Workflow, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";
const AUTH_FLAG = "e360_dashboard_auth";
const MESH_PIN = "e360_mesh_dashboard_pin";

type Agent = {
  id: number;
  agentKey: string;
  displayName: string;
  specialization: string;
  provider: string;
  status: string;
  maxConcurrency: number;
  cooldownSeconds: number;
  capabilities?: string[];
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageLatencyMs: number;
  lastHeartbeatAt: string | null;
};

type Mission = {
  id: number;
  missionKey: string;
  title: string;
  objective: string;
  priority: number;
  status: string;
  workflowOrigin: string | null;
  resultSummary: string | null;
  confidence: number | null;
  createdAt: string;
  completedAt: string | null;
};

type Comm = { id: number; communicationType: string; payload: any; createdAt: string };
type Topology = { meshHealthScore: number; activeAgents: number; queuedMissions: number; runningMissions: number; topology: any; createdAt: string };
type Overview = {
  stats: { idleAgents: number; busyAgents: number; queuedMissions: number; runningMissions: number; failedMissions24h: number; completedMissions24h: number };
  agents: Agent[];
  missions: Mission[];
  communications: Comm[];
  topology: Topology | null;
  queue: any[];
  providers: { openai: boolean; deepseek: boolean };
  generatedAt: string;
};

type MissionDetail = { mission: Mission; tasks: any[]; audit: any[] };

function getStoredPin() {
  try { return window.sessionStorage.getItem(MESH_PIN) || ""; } catch { return ""; }
}

function setStoredAuth(pin: string) {
  try {
    window.sessionStorage.setItem(AUTH_FLAG, "true");
    window.sessionStorage.setItem(MESH_PIN, pin);
  } catch {}
}

function clearStoredAuth() {
  try {
    window.sessionStorage.removeItem(AUTH_FLAG);
    window.sessionStorage.removeItem(MESH_PIN);
  } catch {}
}

function meshAuthHeaders(json = false): HeadersInit {
  const pin = getStoredPin();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(pin ? { "x-dashboard-pin": pin } : {}),
    Accept: "application/json",
  };
}

async function meshFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(meshAuthHeaders(false));
  new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  if (response.status === 401) {
    clearStoredAuth();
    throw new Error("Unauthorized. Please sign in again.");
  }
  return response;
}

const statusColor = (status: string) => ({
  idle: "#22c55e",
  busy: "#eab308",
  offline: "#94a3b8",
  queued: "#94a3b8",
  assigned: "#60a5fa",
  running: "#eab308",
  completed: "#22c55e",
  completed_with_failures: "#eab308",
  failed: "#ef4444",
  blocked: "#ef4444",
  pending_approval: "#f97316",
  pending_founder_approval: "#f97316",
  cancelled: "#94a3b8",
  succeeded: "#22c55e",
  requires_approval: "#f97316",
}[status] || "#94a3b8");

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const trimmed = pin.trim();
    if (!trimmed) {
      setErr("Enter your dashboard PIN.");
      return;
    }

    setErr("");
    setSubmitting(true);
    try {
      const auth = await fetch("/api/dashboard/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ pin: trimmed, dashboardPin: trimmed }),
      });

      if (!auth.ok) {
        let message = auth.status === 401 ? "Invalid PIN. Please double-check and try again." : `Sign-in failed (HTTP ${auth.status}).`;
        try {
          const body = await auth.json();
          if (body?.message) message = body.message;
        } catch {}
        setErr(message);
        setPin("");
        return;
      }

      // Store a per-tab fallback for admin-only mesh APIs. This fixes browsers or
      // embedded launches that accept the login response but fail to retain the
      // session cookie before the first protected fetch.
      setStoredAuth(trimmed);

      const verify = await fetch("/api/admin/mesh/overview", {
        credentials: "include",
        headers: { "x-dashboard-pin": trimmed, Accept: "application/json" },
      });

      if (!verify.ok) {
        clearStoredAuth();
        setErr(`Signed in, but Mesh verification failed (HTTP ${verify.status}).`);
        return;
      }

      onAuth();
    } catch (error) {
      console.error("[mesh] auth error", error);
      setErr("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}>
            <Network className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Execution Mesh</h1>
          <p className="text-white/50 text-sm mt-1">Phase 62 · Distributed AI workforce</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl space-y-4">
          <div className="relative">
            <input
              data-testid="input-mesh-pin"
              type={show ? "text" : "password"}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter PIN"
              autoFocus
              disabled={submitting}
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 pr-12 focus:outline-none focus:border-[#F4A62A]/50 disabled:opacity-60"
            />
            <button type="button" onClick={() => setShow((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" tabIndex={-1}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {err && (
            <div data-testid="text-mesh-auth-error" role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-center">
              {err}
            </div>
          )}

          <button
            type="submit"
            data-testid="button-mesh-login"
            disabled={submitting || pin.trim().length === 0}
            className="w-full rounded-xl py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            style={{ background: GOLD, color: "#000" }}
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Entering…</> : "Enter Mesh"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = GOLD }: { label: string; value: string | number; icon: JSX.Element; color?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">{icon}{label}</div>
      <div className="text-3xl font-bold mt-2" style={{ color }}>{value}</div>
    </div>
  );
}

function Console({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"overview" | "agents" | "missions" | "communications" | "topology" | "memory">("overview");
  const [data, setData] = useState<Overview | null>(null);
  const [detail, setDetail] = useState<MissionDetail | null>(null);
  const [selectedMission, setSelectedMission] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [newMissionOpen, setNewMissionOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [capabilities, setCapabilities] = useState("analyze.health, summarize.workflow");

  const loadOverview = async () => {
    setError("");
    try {
      const response = await meshFetch("/api/admin/mesh/overview");
      if (!response.ok) throw new Error(`Overview failed (HTTP ${response.status})`);
      setData(await response.json());
    } catch (error: any) {
      console.error("[mesh] overview error", error);
      setError(error?.message || "Could not load Mesh overview.");
      if (String(error?.message || "").includes("Unauthorized")) onLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    const timer = window.setInterval(loadOverview, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedMission) {
      setDetail(null);
      return;
    }
    meshFetch(`/api/admin/mesh/missions/${selectedMission}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Mission detail failed (HTTP ${response.status})`);
        setDetail(await response.json());
      })
      .catch((error) => setError(error?.message || "Could not load mission detail."));
  }, [selectedMission]);

  const runTick = async () => {
    setRunning(true);
    setError("");
    try {
      const response = await meshFetch("/api/admin/mesh/run", { method: "POST", headers: meshAuthHeaders(true), body: "{}" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message || `Mesh tick failed (HTTP ${response.status})`);
      }
      await loadOverview();
    } catch (error: any) {
      setError(error?.message || "Mesh tick failed.");
    } finally {
      setRunning(false);
    }
  };

  const createMission = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const response = await meshFetch("/api/admin/mesh/missions", {
        method: "POST",
        headers: meshAuthHeaders(true),
        body: JSON.stringify({
          title,
          objective,
          workflowOrigin: "manual",
          capabilities: capabilities.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.message || `Mission creation failed (HTTP ${response.status})`);
      setTitle("");
      setObjective("");
      setNewMissionOpen(false);
      await loadOverview();
    } catch (error: any) {
      setError(error?.message || "Could not create mission.");
    }
  };

  const cancelMission = async (id: number) => {
    setError("");
    try {
      const response = await meshFetch(`/api/admin/mesh/missions/${id}/cancel`, { method: "POST", headers: meshAuthHeaders(true), body: "{}" });
      if (!response.ok) throw new Error(`Cancel failed (HTTP ${response.status})`);
      setSelectedMission(null);
      await loadOverview();
    } catch (error: any) {
      setError(error?.message || "Could not cancel mission.");
    }
  };

  const agentLoad = useMemo(() => (data?.agents || []).map((agent) => ({
    name: agent.agentKey.replace("_worker", ""),
    success: agent.successfulRuns || 0,
    failed: agent.failedRuns || 0,
    total: agent.totalRuns || 0,
  })), [data]);

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(220_50%_8%)]/90 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}><Network className="h-5 w-5 text-black" /></div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Execution Mesh</h1>
              <p className="text-[11px] sm:text-xs text-white/40 truncate">Phase 62 · Distributed AI workforce · founder-supervised</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="button-run-tick" onClick={runTick} disabled={running} className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold disabled:opacity-50" style={{ background: GOLD, color: "#000" }}>
              <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} /> {running ? "Ticking…" : "Run tick"}
            </button>
            <button data-testid="button-mesh-logout" onClick={() => { clearStoredAuth(); onLogout(); }} className="text-xs px-3 py-2 rounded-lg border border-white/10">Sign out</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#F4A62A]/5 border border-[#F4A62A]/20 rounded-lg px-3 py-2">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>Workers operate under Phase 60 governance. They analyse, recommend, synthesize and queue safe work only. Money, pricing, emails, deployment and destructive actions remain blocked or founder-approved.</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto">
          {(["overview", "agents", "missions", "communications", "topology", "memory"] as const).map((item) => (
            <button key={item} data-testid={`tab-${item}`} onClick={() => setTab(item)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${tab === item ? "bg-[#F4A62A] text-black font-semibold" : "border border-white/10 text-white/60 hover:border-white/30"}`}>{item}</button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading && <div className="text-white/50 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading mesh…</div>}
        {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        {data && tab === "overview" && (
          <>
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Mesh health" value={data.topology?.meshHealthScore ?? "—"} icon={<Activity className="h-3.5 w-3.5" />} />
              <StatCard label="Active agents" value={(data.stats.idleAgents || 0) + (data.stats.busyAgents || 0) || data.agents.length} color="#22c55e" icon={<Bot className="h-3.5 w-3.5" />} />
              <StatCard label="Running missions" value={data.stats.runningMissions} color="#eab308" icon={<Workflow className="h-3.5 w-3.5" />} />
              <StatCard label="Queued missions" value={data.stats.queuedMissions} color="#60a5fa" icon={<Layers className="h-3.5 w-3.5" />} />
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Cpu className="h-4 w-4" style={{ color: GOLD }} /> Workload distribution</h2>
              {agentLoad.some((agent) => agent.total > 0) ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentLoad}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" stroke="#ffffff60" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis stroke="#ffffff60" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #ffffff20", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                      <Bar dataKey="success" stackId="a" fill="#22c55e" />
                      <Bar dataKey="failed" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-white/50">No worker runs yet. Create a mission or run a tick.</p>}
            </section>
          </>
        )}

        {data && tab === "agents" && (
          <section className="grid sm:grid-cols-2 gap-3">
            {data.agents.length === 0 && <p className="text-xs text-white/50">No agents loaded yet. Run a tick to seed the mesh registry.</p>}
            {data.agents.map((agent) => (
              <div key={agent.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="text-sm font-semibold">{agent.displayName}</div>
                    <div className="text-[11px] text-white/40">{agent.specialization}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor(agent.status)}22`, color: statusColor(agent.status) }}>{agent.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                  <div><div className="text-white/40">Provider</div><div>{agent.provider}</div></div>
                  <div><div className="text-white/40">Runs</div><div>{agent.totalRuns} ({agent.successfulRuns}✓ / {agent.failedRuns}✗)</div></div>
                  <div><div className="text-white/40">Avg latency</div><div>{agent.averageLatencyMs}ms</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(agent.capabilities || []).map((capability) => <span key={capability} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${GOLD}15`, color: GOLD }}>{capability}</span>)}
                </div>
              </div>
            ))}
          </section>
        )}

        {data && tab === "missions" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2"><Workflow className="h-4 w-4" style={{ color: GOLD }} /> Missions</h2>
              <button onClick={() => setNewMissionOpen((value) => !value)} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1"><Plus className="h-3 w-3" /> {newMissionOpen ? "Hide" : "New mission"}</button>
            </div>

            {newMissionOpen && (
              <form onSubmit={createMission} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Mission title" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-xs" />
                <textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Objective" rows={2} className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-xs" />
                <input value={capabilities} onChange={(event) => setCapabilities(event.target.value)} placeholder="capability1, capability2" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono" />
                <button type="submit" className="text-xs px-3 py-2 rounded-lg font-semibold" style={{ background: GOLD, color: "#000" }}>Queue mission</button>
              </form>
            )}

            {!selectedMission && data.missions.length === 0 && <p className="text-xs text-white/50">No missions yet.</p>}
            {!selectedMission && data.missions.map((mission) => (
              <div key={mission.id} onClick={() => setSelectedMission(mission.id)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 cursor-pointer hover:border-[#F4A62A]/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 font-semibold" style={{ background: `${statusColor(mission.status)}22`, color: statusColor(mission.status) }}>{mission.status}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{mission.title}</div>
                      <div className="text-[11px] text-white/40 truncate">{mission.missionKey}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-white/40 shrink-0">{new Date(mission.createdAt).toLocaleString()}</span>
                </div>
                {mission.resultSummary && <p className="text-xs text-white/60 mt-2 truncate">{mission.resultSummary}</p>}
              </div>
            ))}

            {selectedMission && detail && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedMission(null)} className="text-xs px-2 py-1 rounded-lg border border-white/10">← Back</button>
                  {["queued", "running", "assigned"].includes(detail.mission.status) && <button onClick={() => cancelMission(detail.mission.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center gap-1.5"><Pause className="h-3 w-3" /> Cancel</button>}
                </div>
                <div>
                  <div className="flex items-center gap-2"><span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor(detail.mission.status)}22`, color: statusColor(detail.mission.status) }}>{detail.mission.status}</span><h3 className="font-semibold">{detail.mission.title}</h3></div>
                  {detail.mission.objective && <p className="text-xs text-white/60 mt-2">{detail.mission.objective}</p>}
                  {detail.mission.resultSummary && <p className="text-xs text-white/80 mt-2"><strong>Result:</strong> {detail.mission.resultSummary}</p>}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white/70 mb-2">Tasks</h4>
                  <div className="space-y-2">
                    {(detail.tasks || []).map((task) => (
                      <div key={task.id} className="border border-white/5 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between"><span className="font-mono">{task.executionOrder}. {task.capability}</span><span style={{ color: statusColor(task.status) }}>{task.status}</span></div>
                        {task.executionOutput?.content && <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-sans mt-2">{task.executionOutput.content}</pre>}
                        {task.executionOutput?.error && <p className="text-[11px] text-red-400 mt-2">{task.executionOutput.error}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {data && tab === "communications" && (
          <section className="space-y-2">
            <h2 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" style={{ color: GOLD }} /> Inter-agent communications</h2>
            {data.communications.length === 0 && <p className="text-xs text-white/50">No communications yet.</p>}
            {data.communications.map((communication) => (
              <div key={communication.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between text-[11px]"><span className="font-mono px-2 py-0.5 rounded-full" style={{ background: `${GOLD}15`, color: GOLD }}>{communication.communicationType}</span><span className="text-white/40">{new Date(communication.createdAt).toLocaleString()}</span></div>
                {communication.payload && <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono mt-2">{JSON.stringify(communication.payload, null, 2).slice(0, 800)}</pre>}
              </div>
            ))}
          </section>
        )}

        {data && tab === "topology" && (
          <section className="space-y-4">
            {!data.topology && <p className="text-xs text-white/50">No topology snapshot yet. Run a tick to generate one.</p>}
            {data.topology && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><GitBranch className="h-4 w-4" style={{ color: GOLD }} /> Topology snapshot</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div><div className="text-white/40">Health</div><div className="text-lg font-bold" style={{ color: data.topology.meshHealthScore >= 80 ? "#22c55e" : "#eab308" }}>{data.topology.meshHealthScore}</div></div>
                  <div><div className="text-white/40">Active agents</div><div className="text-lg font-bold">{data.topology.activeAgents}</div></div>
                  <div><div className="text-white/40">Running</div><div className="text-lg font-bold">{data.topology.runningMissions}</div></div>
                  <div><div className="text-white/40">Queued</div><div className="text-lg font-bold">{data.topology.queuedMissions}</div></div>
                </div>
                <p className="text-[10px] text-white/40 mt-3">Captured {new Date(data.topology.createdAt).toLocaleString()}</p>
              </div>
            )}
            {data.topology?.topology?.nodes && (
              <div className="grid sm:grid-cols-3 gap-2">
                {data.topology.topology.nodes.map((node: any) => <div key={node.id} className="border border-white/10 rounded-lg p-3 text-[11px]"><div className="flex items-center justify-between"><span className="font-semibold">{node.label}</span><span style={{ color: statusColor(node.status) }}>{node.status}</span></div><div className="text-white/40">{node.specialization}</div><div className="text-white/60 mt-1">{node.totalRuns} runs · {node.successRate ?? "—"}% success</div></div>)}
              </div>
            )}
          </section>
        )}

        {data && tab === "memory" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-2"><Brain className="h-4 w-4" style={{ color: GOLD }} /> Worker memory</h2>
            <p className="text-xs text-white/50">Per-agent scoped memory updates as missions complete. Memory remains recommendation-only and founder-supervised.</p>
            <div className="grid sm:grid-cols-3 gap-2 mt-3">
              {data.agents.map((agent) => <div key={agent.id} className="border border-white/10 rounded-lg p-3 text-[11px]"><div className="font-semibold">{agent.displayName}</div><div className="text-white/40">{agent.specialization}</div><div className="text-white/60 mt-1">{agent.totalRuns} runs available for learning</div></div>)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function ExecutionMesh() {
  const [authed, setAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.sessionStorage.getItem(AUTH_FLAG) === "true" && !!window.sessionStorage.getItem(MESH_PIN); } catch { return false; }
  });

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_FLAG || event.key === MESH_PIN) {
        setAuthed(window.sessionStorage.getItem(AUTH_FLAG) === "true" && !!window.sessionStorage.getItem(MESH_PIN));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console onLogout={() => setAuthed(false)} />;
}
