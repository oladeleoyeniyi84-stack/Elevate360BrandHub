import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, CheckCircle2, Eye, EyeOff, FlaskConical, Lock,
  Play, RefreshCw, Sparkles, StopCircle, ThumbsDown, ThumbsUp, Trophy,
  Undo2, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Variant = {
  key: string; name: string; description?: string; weight: number;
  isControl?: boolean; config?: Record<string, any>;
};
type Experiment = {
  id: number; experimentKey: string; name: string; hypothesis: string;
  surface: string; targetMetric: string; variants: Variant[];
  trafficAllocation: number; status: "draft" | "proposed" | "approved" | "running" | "completed" | "rolled_back";
  recommendationId: number | null; winnerVariantKey: string | null;
  rollbackReason: string | null; decidedBy: string | null; decidedAt: string | null;
  startedAt: string | null; completedAt: string | null;
  diagnosticsSummary: string; executiveSummary: string;
  diagnosticsProvider: string | null; executiveProvider: string | null;
  confidence: number; createdAt: string;
};
type VariantStats = {
  variantKey: string; isControl: boolean; assignments: number; conversions: number;
  revenueCents: number; conversionRate: number; liftPct: number | null;
  zScore: number | null; pValue: number | null; confidence: number;
};
type Analysis = { variants: VariantStats[]; winner: string | null; minConfidence: number };

const statusColor = (s: string) =>
  s === "running" ? "#22c55e"
  : s === "approved" ? "#60a5fa"
  : s === "completed" ? "#a78bfa"
  : s === "rolled_back" ? "#ef4444"
  : s === "proposed" ? "#eab308"
  : "#94a3b8";

const dollars = (cents: number) => "$" + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
const pct = (v: number) => (v * 100).toFixed(2) + "%";

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/dashboard/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      sessionStorage.setItem("e360_dashboard_auth", "true");
      onAuth();
    } else { setError("Invalid PIN."); setPin(""); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}>
            <Lock className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Experiment Lab</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-experiments-pin"
              type={showPin ? "text" : "password"}
              value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-experiments-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-experiments-login" className="btn-primary w-full py-3">Access Lab</button>
        </form>
      </div>
    </div>
  );
}

function ProposeDialog({ onClose, onSubmit, pending }: { onClose: () => void; onSubmit: (vars: any) => void; pending: boolean }) {
  const [hypothesis, setHypothesis] = useState("");
  const [surface, setSurface] = useState("conversion");
  const [targetMetric, setTargetMetric] = useState("conversion");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="lux-card w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: GOLD }} /> Propose New Experiment
        </h3>
        <p className="text-white/50 text-xs mb-4">DeepSeek will draft a control + variant from your hypothesis. Founder approval is required before it goes live.</p>
        <div className="space-y-3">
          <div>
            <label className="text-white/70 text-xs uppercase tracking-wider">Hypothesis</label>
            <textarea
              data-testid="input-propose-hypothesis"
              value={hypothesis} onChange={e => setHypothesis(e.target.value)} rows={3}
              placeholder="e.g. Showing a free-guide CTA in the chat widget after 30s will lift lead capture by 25%."
              className="mt-1 w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/70 text-xs uppercase tracking-wider">Surface</label>
              <input data-testid="input-propose-surface" value={surface} onChange={e => setSurface(e.target.value)}
                className="mt-1 w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50" />
            </div>
            <div>
              <label className="text-white/70 text-xs uppercase tracking-wider">Target metric</label>
              <input data-testid="input-propose-metric" value={targetMetric} onChange={e => setTargetMetric(e.target.value)}
                className="mt-1 w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-white/70 hover:text-white text-sm">Cancel</button>
            <button
              data-testid="button-propose-submit"
              onClick={() => onSubmit({ hypothesis, surface, targetMetric })}
              disabled={pending || !hypothesis.trim()}
              className="btn-primary px-4 py-2 disabled:opacity-50 text-sm flex items-center gap-2"
            >
              {pending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Drafting…</> : <><Zap className="h-4 w-4" /> Propose</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantBar({ stats, winner }: { stats: VariantStats[]; winner: string | null }) {
  if (!stats.length) return <div className="text-white/40 text-sm">No variant data yet.</div>;
  const data = stats.map(v => ({
    variant: v.variantKey,
    cr: Number((v.conversionRate * 100).toFixed(2)),
    isWinner: v.variantKey === winner,
    isControl: v.isControl,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="variant" stroke="rgba(255,255,255,0.5)" fontSize={11} />
        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickFormatter={v => `${v}%`} />
        <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          formatter={(v: any) => `${v}%`} />
        <Bar dataKey="cr" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isWinner ? "#22c55e" : d.isControl ? "#94a3b8" : GOLD} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ExperimentDetailCard({ exp, analysis, onAction, pending }: {
  exp: Experiment; analysis: Analysis | null; pending: boolean;
  onAction: (action: string, reason?: string) => void;
}) {
  const totalAssign = analysis?.variants.reduce((s, v) => s + v.assignments, 0) ?? 0;
  const totalConv = analysis?.variants.reduce((s, v) => s + v.conversions, 0) ?? 0;
  const totalRev = analysis?.variants.reduce((s, v) => s + v.revenueCents, 0) ?? 0;

  return (
    <div className="lux-card" data-testid={`exp-card-${exp.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold" data-testid={`exp-name-${exp.id}`}>{exp.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full capitalize"
              style={{ background: statusColor(exp.status) + "33", color: statusColor(exp.status) }}
              data-testid={`exp-status-${exp.id}`}>
              {exp.status.replace("_", " ")}
            </span>
            {exp.winnerVariantKey && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Winner: {exp.winnerVariantKey}
              </span>
            )}
          </div>
          <div className="text-white/40 text-xs mt-1 font-mono">{exp.experimentKey}</div>
          {exp.hypothesis && <p className="text-white/70 text-sm mt-2">{exp.hypothesis}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {exp.status === "proposed" && (
            <>
              <button data-testid={`button-approve-${exp.id}`} onClick={() => onAction("approve")} disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm flex items-center gap-1 disabled:opacity-50">
                <ThumbsUp className="h-3.5 w-3.5" /> Approve
              </button>
              <button data-testid={`button-reject-${exp.id}`} onClick={() => onAction("reject")} disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm flex items-center gap-1 disabled:opacity-50">
                <ThumbsDown className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          {exp.status === "approved" && (
            <button data-testid={`button-start-${exp.id}`} onClick={() => onAction("start")} disabled={pending}
              className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50">
              <Play className="h-3.5 w-3.5" /> Start
            </button>
          )}
          {exp.status === "running" && (
            <>
              <button data-testid={`button-complete-${exp.id}`} onClick={() => onAction("complete")} disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 text-sm flex items-center gap-1 disabled:opacity-50">
                <StopCircle className="h-3.5 w-3.5" /> Complete
              </button>
              <button data-testid={`button-rollback-${exp.id}`}
                onClick={() => { const r = window.prompt("Rollback reason?", "Founder rollback"); if (r != null) onAction("rollback", r); }}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm flex items-center gap-1 disabled:opacity-50">
                <Undo2 className="h-3.5 w-3.5" /> Rollback
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="text-white/50 text-xs uppercase">Traffic</div>
          <div className="text-white font-semibold">{exp.trafficAllocation}%</div>
        </div>
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="text-white/50 text-xs uppercase">Assignments</div>
          <div className="text-white font-semibold" data-testid={`exp-assignments-${exp.id}`}>{totalAssign}</div>
        </div>
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="text-white/50 text-xs uppercase">Conversions</div>
          <div className="text-white font-semibold">{totalConv}</div>
        </div>
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="text-white/50 text-xs uppercase">Revenue</div>
          <div className="text-white font-semibold">{dollars(totalRev)}</div>
        </div>
      </div>

      {analysis && analysis.variants.length > 0 && (
        <>
          <VariantBar stats={analysis.variants} winner={analysis.winner} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm" data-testid={`exp-variants-table-${exp.id}`}>
              <thead className="text-white/50 text-xs uppercase">
                <tr>
                  <th className="text-left py-1.5">Variant</th>
                  <th className="text-right py-1.5">N</th>
                  <th className="text-right py-1.5">CR</th>
                  <th className="text-right py-1.5">Lift</th>
                  <th className="text-right py-1.5">p</th>
                  <th className="text-right py-1.5">Conf.</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {analysis.variants.map(v => (
                  <tr key={v.variantKey} className="border-t border-white/5">
                    <td className="py-1.5">
                      <span className="font-mono text-xs">{v.variantKey}</span>
                      {v.isControl && <span className="ml-2 text-white/40 text-xs">(control)</span>}
                      {v.variantKey === analysis.winner && <Trophy className="inline h-3.5 w-3.5 ml-1 text-emerald-400" />}
                    </td>
                    <td className="text-right tabular-nums">{v.assignments}</td>
                    <td className="text-right tabular-nums">{pct(v.conversionRate)}</td>
                    <td className="text-right tabular-nums">{v.liftPct == null ? "—" : `${v.liftPct > 0 ? "+" : ""}${v.liftPct}%`}</td>
                    <td className="text-right tabular-nums">{v.pValue == null ? "—" : v.pValue.toFixed(3)}</td>
                    <td className="text-right tabular-nums">{Math.round(v.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {exp.executiveSummary && (
        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Executive Summary (OpenAI)
          </div>
          <pre data-testid={`exp-exec-${exp.id}`} className="text-white/80 text-sm whitespace-pre-wrap font-sans">{exp.executiveSummary}</pre>
        </div>
      )}
      {exp.diagnosticsSummary && (
        <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Diagnostics (DeepSeek)
          </div>
          <pre data-testid={`exp-diag-${exp.id}`} className="text-white/70 text-sm whitespace-pre-wrap font-sans">{exp.diagnosticsSummary}</pre>
        </div>
      )}
      {exp.rollbackReason && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>Rolled back: {exp.rollbackReason}</div>
        </div>
      )}
    </div>
  );
}

function LabDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"running" | "proposed" | "completed" | "all">("running");
  const [showPropose, setShowPropose] = useState(false);
  const [analyses, setAnalyses] = useState<Record<number, Analysis>>({});

  const statusFilter = tab === "all" ? undefined : tab === "completed" ? "completed" : tab;

  const listQ = useQuery<Experiment[]>({
    queryKey: ["/api/admin/experiments", statusFilter],
    queryFn: async () => {
      const r = await fetch(`/api/admin/experiments${statusFilter ? `?status=${statusFilter}` : ""}`);
      if (!r.ok) throw new Error("list failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  // Auto-fetch analysis for visible experiments
  useEffect(() => {
    const items = listQ.data ?? [];
    items.forEach(async (exp) => {
      if (analyses[exp.id]) return;
      try {
        const r = await fetch(`/api/admin/experiments/${exp.id}`);
        if (!r.ok) return;
        const j = await r.json();
        setAnalyses(prev => ({ ...prev, [exp.id]: j.analysis }));
      } catch {}
    });
  }, [listQ.data]);

  const proposeMut = useMutation({
    mutationFn: async (vars: any) => {
      const r = await fetch("/api/admin/experiments/propose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (!r.ok) throw new Error("propose failed");
      return r.json();
    },
    onSuccess: () => {
      setShowPropose(false);
      qc.invalidateQueries({ queryKey: ["/api/admin/experiments"] });
    },
  });

  const decideMut = useMutation({
    mutationFn: async (vars: { id: number; action: string; reason?: string }) => {
      const r = await fetch(`/api/admin/experiments/${vars.id}/decide`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: vars.action, reason: vars.reason }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.message || "decision failed");
      return body;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/experiments"] }),
  });

  const analyzeMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/experiments/${id}/analyze`, { method: "POST" });
      if (!r.ok) throw new Error("analyze failed");
      return r.json();
    },
    onSuccess: (j) => {
      if (j?.experiment?.id) {
        setAnalyses(prev => ({ ...prev, [j.experiment.id]: j.analysis }));
      }
      qc.invalidateQueries({ queryKey: ["/api/admin/experiments"] });
    },
  });

  const items = listQ.data ?? [];

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <FlaskConical className="h-6 w-6" style={{ color: GOLD }} /> Experiment Lab
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Phase 57 · DeepSeek drafts variants · OpenAI calls the winner · Recommendation-only
            </p>
          </div>
          <button data-testid="button-new-experiment" onClick={() => setShowPropose(true)} className="btn-primary px-4 py-2.5 flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> New Experiment
          </button>
        </header>

        <div className="lux-card mb-6 text-xs text-white/60 italic">
          Safety boundaries: experiments are content-config only (copy, banners, CTA). The orchestrator never deploys code, changes pricing, mutates payments, or sends email. Variant assignment is sticky per session and only served while status = <strong>running</strong>.
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(["running", "proposed", "completed", "all"] as const).map(t => (
            <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap capitalize transition ${
                tab === t ? "bg-[#F4A62A] text-black font-semibold" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}>
              {t}
            </button>
          ))}
          <span className="text-white/40 text-xs ml-auto self-center">{items.length} item(s)</span>
        </div>

        {listQ.isLoading && <div className="text-white/50 text-sm">Loading…</div>}
        {!listQ.isLoading && items.length === 0 && (
          <div className="lux-card text-center py-10" data-testid="empty-state">
            <FlaskConical className="h-10 w-10 mx-auto mb-3" style={{ color: GOLD }} />
            <p className="text-white/70">No experiments in this view.</p>
            <button onClick={() => setShowPropose(true)} className="btn-primary mt-4 px-4 py-2 text-sm inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Propose your first
            </button>
          </div>
        )}

        <div className="space-y-4">
          {items.map(exp => (
            <div key={exp.id} className="relative">
              <ExperimentDetailCard
                exp={exp}
                analysis={analyses[exp.id] ?? null}
                pending={decideMut.isPending && decideMut.variables?.id === exp.id}
                onAction={(action, reason) => decideMut.mutate({ id: exp.id, action, reason })}
              />
              {(exp.status === "running" || exp.status === "completed") && (
                <button
                  data-testid={`button-analyze-${exp.id}`}
                  onClick={() => analyzeMut.mutate(exp.id)}
                  disabled={analyzeMut.isPending}
                  className="absolute top-4 right-4 sm:static sm:mt-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 text-xs inline-flex items-center gap-1 disabled:opacity-50">
                  {analyzeMut.isPending && analyzeMut.variables === exp.id
                    ? <><RefreshCw className="h-3 w-3 animate-spin" /> Analyzing…</>
                    : <><Activity className="h-3 w-3" /> Re-analyze</>}
                </button>
              )}
            </div>
          ))}
        </div>

        {showPropose && (
          <ProposeDialog onClose={() => setShowPropose(false)}
            pending={proposeMut.isPending}
            onSubmit={vars => proposeMut.mutate(vars)} />
        )}
      </div>
    </div>
  );
}

export default function ExperimentLabPage() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("e360_dashboard_auth") === "true") setAuthed(true);
  }, []);
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <LabDashboard />;
}
