import { FormEvent, useEffect, useState } from "react";
import { Activity, Bot, Eye, EyeOff, Loader2, Network, RefreshCw, Shield, Workflow } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";
const AUTH_FLAG = "e360_dashboard_auth";
const MESH_PIN = "e360_mesh_dashboard_pin";

type Overview = {
  stats?: { idleAgents?: number; busyAgents?: number; queuedMissions?: number; runningMissions?: number; failedMissions24h?: number; completedMissions24h?: number };
  agents?: Array<{ id: number; agentKey: string; displayName: string; specialization: string; provider: string; status: string; totalRuns?: number; successfulRuns?: number; failedRuns?: number; averageLatencyMs?: number }>;
  missions?: Array<{ id: number; missionKey: string; title: string; objective?: string; priority?: number; status: string; resultSummary?: string | null; createdAt?: string }>;
  topology?: { meshHealthScore?: number; activeAgents?: number; runningMissions?: number; queuedMissions?: number; createdAt?: string } | null;
  providers?: { openai?: boolean; deepseek?: boolean };
};

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

function authHeaders(json = false): HeadersInit {
  const pin = getStoredPin();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(pin ? { "x-dashboard-pin": pin, Authorization: `Bearer ${pin}` } : {}),
    Accept: "application/json",
  };
}

async function protectedFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(authHeaders(false));
  new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));
  const response = await fetch(path, { credentials: "include", ...init, headers });
  if (response.status === 401) {
    clearStoredAuth();
    throw new Error("Unauthorized. Please sign in again.");
  }
  return response;
}

async function verifyPinDirectly(pin: string) {
  return fetch("/api/admin/mesh/overview", {
    credentials: "include",
    headers: { "x-dashboard-pin": pin, Authorization: `Bearer ${pin}`, Accept: "application/json" },
  });
}

function statusColor(status = "") {
  return ({ idle: "#22c55e", busy: "#eab308", running: "#eab308", queued: "#60a5fa", assigned: "#60a5fa", completed: "#22c55e", completed_with_failures: "#eab308", failed: "#ef4444", blocked: "#ef4444", cancelled: "#94a3b8" } as Record<string, string>)[status] || "#94a3b8";
}

function PinGate({ onAuth }: { onAuth: (overview?: Overview | null) => void }) {
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const trimmed = pin.trim().replace(/^['\"]+|['\"]+$/g, "");
    if (!trimmed) {
      setErr("Enter your dashboard PIN.");
      return;
    }

    setErr("");
    setSubmitting(true);
    try {
      const direct = await verifyPinDirectly(trimmed);
      if (direct.ok) {
        const overview = await direct.json().catch(() => null);
        setStoredAuth(trimmed);
        onAuth(overview);
        return;
      }

      const auth = await fetch("/api/dashboard/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ pin: trimmed, dashboardPin: trimmed }),
      });

      let authBody: any = null;
      try { authBody = await auth.clone().json(); } catch {}

      // If the PIN is valid but the persistent session store is down, the server
      // may return a session-save message. Continue with the stateless admin PIN
      // fallback already supported by protected mesh endpoints.
      if (auth.ok || (auth.status >= 500 && String(authBody?.message || "").toLowerCase().includes("session"))) {
        setStoredAuth(trimmed);
        const verify = await verifyPinDirectly(trimmed).catch(() => null);
        if (verify?.ok) {
          const overview = await verify.json().catch(() => null);
          onAuth(overview);
          return;
        }
        onAuth(null);
        return;
      }

      clearStoredAuth();
      setErr(authBody?.message || "Invalid PIN.");
      setPin("");
    } catch (error) {
      console.error("[mesh] auth error", error);
      clearStoredAuth();
      setErr("Could not verify the PIN. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}><Network className="h-7 w-7 text-black" /></div>
          <h1 className="text-2xl font-bold text-white">Execution Mesh</h1>
          <p className="text-white/50 text-sm mt-1">Phase 62 · Distributed AI workforce</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl space-y-4">
          <div className="relative">
            <input type={show ? "text" : "password"} value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Enter PIN" autoFocus disabled={submitting} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 pr-12 focus:outline-none focus:border-[#F4A62A]/50 disabled:opacity-60" />
            <button type="button" onClick={() => setShow((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" tabIndex={-1}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
          {err && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-center">{err}</div>}
          <button type="submit" disabled={submitting || !pin.trim()} className="w-full rounded-xl py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2" style={{ background: GOLD, color: "#000" }}>{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Entering…</> : "Enter Mesh"}</button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = GOLD }: { label: string; value: string | number; icon: JSX.Element; color?: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">{icon}{label}</div><div className="text-3xl font-bold mt-2" style={{ color }}>{value}</div></div>;
}

function Console({ seed, onLogout }: { seed?: Overview | null; onLogout: () => void }) {
  const [data, setData] = useState<Overview | null>(seed || null);
  const [tab, setTab] = useState<"overview" | "agents" | "missions" | "topology">("overview");
  const [loading, setLoading] = useState(!seed);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function loadOverview() {
    try {
      setError("");
      const response = await protectedFetch("/api/admin/mesh/overview");
      if (!response.ok) throw new Error(`Overview failed (HTTP ${response.status})`);
      setData(await response.json());
    } catch (error: any) {
      console.error("[mesh] overview error", error);
      setError(error?.message || "Could not load mesh overview.");
      if (String(error?.message || "").includes("Unauthorized")) onLogout();
    } finally { setLoading(false); }
  }

  async function runTick() {
    setRunning(true);
    try {
      setError("");
      const response = await protectedFetch("/api/admin/mesh/run", { method: "POST", headers: authHeaders(true), body: "{}" });
      if (!response.ok) throw new Error(`Mesh tick failed (HTTP ${response.status})`);
      await loadOverview();
    } catch (error: any) { setError(error?.message || "Could not run mesh tick."); }
    finally { setRunning(false); }
  }

  useEffect(() => {
    loadOverview();
    const timer = window.setInterval(loadOverview, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = data?.stats || {};
  const agents = data?.agents || [];
  const missions = data?.missions || [];
  const topology = data?.topology || null;
  const chart = agents.map((agent) => ({ name: agent.agentKey?.replace("_worker", "") || agent.displayName, success: agent.successfulRuns || 0, failed: agent.failedRuns || 0, total: agent.totalRuns || 0 }));

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(220_50%_8%)]/90 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}><Network className="h-5 w-5 text-black" /></div><div className="min-w-0"><h1 className="text-base sm:text-lg font-semibold truncate">Execution Mesh</h1><p className="text-[11px] sm:text-xs text-white/40 truncate">Phase 62 · Distributed AI workforce · founder-supervised</p></div></div>
          <div className="flex items-center gap-2"><button onClick={runTick} disabled={running} className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold disabled:opacity-50" style={{ background: GOLD, color: "#000" }}><RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} /> {running ? "Ticking…" : "Run tick"}</button><button onClick={() => { clearStoredAuth(); onLogout(); }} className="text-xs px-3 py-2 rounded-lg border border-white/10">Sign out</button></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3"><div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#F4A62A]/5 border border-[#F4A62A]/20 rounded-lg px-3 py-2"><Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} /><span>Workers operate under Phase 60 governance. They analyse, recommend, synthesize and queue safe work only.</span></div></div>
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto">{(["overview", "agents", "missions", "topology"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${tab === item ? "bg-[#F4A62A] text-black font-semibold" : "border border-white/10 text-white/60 hover:border-white/30"}`}>{item}</button>)}</div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading && <div className="text-white/50 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading mesh…</div>}
        {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {data && tab === "overview" && <><section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><StatCard label="Mesh health" value={topology?.meshHealthScore ?? "—"} icon={<Activity className="h-3.5 w-3.5" />} /><StatCard label="Agents" value={(stats.idleAgents || 0) + (stats.busyAgents || 0) || agents.length} color="#22c55e" icon={<Bot className="h-3.5 w-3.5" />} /><StatCard label="Running" value={stats.runningMissions || 0} color="#eab308" icon={<Workflow className="h-3.5 w-3.5" />} /><StatCard label="Queued" value={stats.queuedMissions || 0} color="#60a5fa" icon={<Network className="h-3.5 w-3.5" />} /></section><section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h2 className="font-semibold text-sm mb-3">Provider status</h2><div className="grid sm:grid-cols-2 gap-3 text-sm"><div className="rounded-xl border border-white/10 p-3 flex justify-between"><span>OpenAI</span><span className={data.providers?.openai ? "text-green-400" : "text-red-400"}>{data.providers?.openai ? "configured" : "offline"}</span></div><div className="rounded-xl border border-white/10 p-3 flex justify-between"><span>DeepSeek</span><span className={data.providers?.deepseek ? "text-green-400" : "text-red-400"}>{data.providers?.deepseek ? "configured" : "offline"}</span></div></div></section><section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h2 className="font-semibold text-sm mb-3">Workload distribution</h2>{chart.some((item) => item.total > 0) ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="name" stroke="#ffffff60" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} /><YAxis stroke="#ffffff60" tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #ffffff20", borderRadius: 8, color: "#fff", fontSize: 12 }} /><Bar dataKey="success" stackId="a" fill="#22c55e" /><Bar dataKey="failed" stackId="a" fill="#ef4444" /></BarChart></ResponsiveContainer></div> : <p className="text-xs text-white/50">No worker runs yet. Run a tick.</p>}</section></>}
        {data && tab === "agents" && <section className="grid sm:grid-cols-2 gap-3">{agents.length === 0 && <p className="text-xs text-white/50">No agents loaded yet. Run a tick to seed the mesh registry.</p>}{agents.map((agent) => <div key={agent.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center justify-between gap-3 mb-2"><div><div className="text-sm font-semibold">{agent.displayName}</div><div className="text-[11px] text-white/40">{agent.specialization}</div></div><span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor(agent.status)}22`, color: statusColor(agent.status) }}>{agent.status}</span></div><div className="grid grid-cols-3 gap-2 mt-2 text-[11px]"><div><div className="text-white/40">Provider</div><div>{agent.provider}</div></div><div><div className="text-white/40">Runs</div><div>{agent.totalRuns || 0}</div></div><div><div className="text-white/40">Avg latency</div><div>{agent.averageLatencyMs || 0}ms</div></div></div></div>)}</section>}
        {data && tab === "missions" && <section className="space-y-3">{missions.length === 0 && <p className="text-xs text-white/50">No missions yet.</p>}{missions.map((mission) => <div key={mission.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-sm font-semibold truncate">{mission.title}</div><div className="text-[11px] text-white/40 truncate">{mission.missionKey}</div></div><span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 font-semibold" style={{ background: `${statusColor(mission.status)}22`, color: statusColor(mission.status) }}>{mission.status}</span></div>{mission.resultSummary && <p className="text-xs text-white/60 mt-2">{mission.resultSummary}</p>}</div>)}</section>}
        {data && tab === "topology" && <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">{!topology && <p className="text-xs text-white/50">No topology snapshot yet. Run a tick to generate one.</p>}{topology && <div><h2 className="font-semibold text-sm mb-3">Topology snapshot</h2><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]"><div><div className="text-white/40">Health</div><div className="text-lg font-bold" style={{ color: (topology.meshHealthScore || 0) >= 80 ? "#22c55e" : "#eab308" }}>{topology.meshHealthScore}</div></div><div><div className="text-white/40">Active agents</div><div className="text-lg font-bold">{topology.activeAgents}</div></div><div><div className="text-white/40">Running</div><div className="text-lg font-bold">{topology.runningMissions}</div></div><div><div className="text-white/40">Queued</div><div className="text-lg font-bold">{topology.queuedMissions}</div></div></div>{topology.createdAt && <p className="text-[10px] text-white/40 mt-3">Captured {new Date(topology.createdAt).toLocaleString()}</p>}</div>}</section>}
      </main>
    </div>
  );
}

export default function ExecutionMesh() {
  const [seed, setSeed] = useState<Overview | null>(null);
  const [authed, setAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.sessionStorage.getItem(AUTH_FLAG) === "true" && !!window.sessionStorage.getItem(MESH_PIN); } catch { return false; }
  });
  if (!authed) return <PinGate onAuth={(overview) => { setSeed(overview || null); setAuthed(true); }} />;
  return <Console seed={seed} onLogout={() => { setSeed(null); setAuthed(false); }} />;
}
