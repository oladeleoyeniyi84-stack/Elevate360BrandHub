import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity, CheckCircle2, Eye, EyeOff, Layers, Lock, Pause, Play,
  RefreshCw, Shield, Sparkles, ThumbsDown, ThumbsUp, Users, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Segment = {
  id: number; segmentKey: string; name: string; description: string;
  rules: any[]; priority: number; status: string; createdAt: string;
};
type SegmentCount = { segmentKey: string; count: number; avgScore: number };
type Rule = {
  id: number; surface: string; segmentKey: string;
  contentVariant: Record<string, any>; rationale: string;
  status: "pending" | "approved" | "active" | "inactive" | "rejected";
  priority: number; decidedBy: string | null; decidedAt: string | null;
  diagnosticsSummary: string; executiveSummary: string;
  diagnosticsProvider: string | null; executiveProvider: string | null;
  createdAt: string;
};
type Analytics = {
  perSegment: Array<{
    surface: string; segmentKey: string; views: number; clicks: number;
    conversions: number; ctr: number; cvr: number; revenueCents: number;
  }>;
  diagnostics: string; executive: string;
  diagnosticsProvider: string; executiveProvider: string;
};

const statusColor = (s: string) =>
  s === "active" ? "#22c55e"
  : s === "approved" ? "#60a5fa"
  : s === "pending" ? "#eab308"
  : s === "rejected" ? "#ef4444"
  : "#94a3b8";

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
          <h1 className="text-2xl font-bold text-white">Personalization Console</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-personalization-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-personalization-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-personalization-login" className="btn-primary w-full py-3">Access Console</button>
        </form>
      </div>
    </div>
  );
}

function ProposeDialog({ surfaces, onClose, onSubmit, pending }: {
  surfaces: string[]; onClose: () => void;
  onSubmit: (v: { surface: string; hypothesis: string }) => void; pending: boolean;
}) {
  const [surface, setSurface] = useState(surfaces[0] ?? "hero");
  const [hypothesis, setHypothesis] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="lux-card w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: GOLD }} /> Propose Personalization Rules
        </h3>
        <p className="text-white/50 text-xs mb-4">
          DeepSeek will draft one content-only variant per active segment. Founder approval required before activation.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-white/70 text-xs uppercase tracking-wider">Surface</label>
            <select data-testid="select-propose-surface" value={surface} onChange={e => setSurface(e.target.value)}
              className="mt-1 w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50">
              {surfaces.map(s => <option key={s} value={s} className="bg-[#0b1224]">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/70 text-xs uppercase tracking-wider">Hypothesis (optional)</label>
            <textarea
              data-testid="input-propose-hypothesis"
              value={hypothesis} onChange={e => setHypothesis(e.target.value)} rows={3}
              placeholder="e.g. Visitors deeper in the funnel respond to direct CTAs; awareness-stage prefers story-led copy."
              className="mt-1 w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-white/70 hover:text-white text-sm">Cancel</button>
            <button
              data-testid="button-propose-submit"
              onClick={() => onSubmit({ surface, hypothesis })}
              disabled={pending}
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

function RuleCard({ rule, onAction, pending }: {
  rule: Rule; pending: boolean;
  onAction: (id: number, action: string) => void;
}) {
  const variantJson = JSON.stringify(rule.contentVariant ?? {}, null, 2);
  return (
    <div className="lux-card" data-testid={`rule-card-${rule.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold" data-testid={`rule-surface-${rule.id}`}>{rule.surface}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full text-white/70 bg-white/10">→ {rule.segmentKey}</span>
            <span className="text-xs px-2 py-0.5 rounded-full capitalize"
              style={{ background: statusColor(rule.status) + "33", color: statusColor(rule.status) }}
              data-testid={`rule-status-${rule.id}`}>
              {rule.status}
            </span>
          </div>
          {rule.rationale && <p className="text-white/70 text-sm mt-2">{rule.rationale}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {rule.status === "pending" && (
            <>
              <button data-testid={`button-approve-${rule.id}`} onClick={() => onAction(rule.id, "approve")} disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm flex items-center gap-1 disabled:opacity-50">
                <ThumbsUp className="h-3.5 w-3.5" /> Approve
              </button>
              <button data-testid={`button-reject-${rule.id}`} onClick={() => onAction(rule.id, "reject")} disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm flex items-center gap-1 disabled:opacity-50">
                <ThumbsDown className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          {rule.status === "approved" && (
            <button data-testid={`button-activate-${rule.id}`} onClick={() => onAction(rule.id, "activate")} disabled={pending}
              className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50">
              <Play className="h-3.5 w-3.5" /> Activate
            </button>
          )}
          {rule.status === "inactive" && (
            <button data-testid={`button-reactivate-${rule.id}`} onClick={() => onAction(rule.id, "activate")} disabled={pending}
              className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50">
              <Play className="h-3.5 w-3.5" /> Re-activate
            </button>
          )}
          {rule.status === "active" && (
            <button data-testid={`button-deactivate-${rule.id}`} onClick={() => onAction(rule.id, "deactivate")} disabled={pending}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-sm flex items-center gap-1 disabled:opacity-50">
              <Pause className="h-3.5 w-3.5" /> Deactivate
            </button>
          )}
        </div>
      </div>
      <div className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white/70 overflow-auto" style={{ maxHeight: 200 }}>
        <pre className="whitespace-pre-wrap font-mono" data-testid={`rule-variant-${rule.id}`}>{variantJson}</pre>
      </div>
      {rule.decidedBy && (
        <div className="text-white/40 text-xs mt-2">
          Decided by {rule.decidedBy}{rule.decidedAt ? ` · ${new Date(rule.decidedAt).toLocaleString()}` : ""}
        </div>
      )}
    </div>
  );
}

function SegmentComparisonChart({ rows }: { rows: Analytics["perSegment"] }) {
  if (!rows.length) return <div className="text-white/40 text-sm">No telemetry yet.</div>;
  const data = rows.map(r => ({
    label: `${r.surface}·${r.segmentKey}`,
    cvr: Number((r.cvr * 100).toFixed(2)),
    ctr: Number((r.ctr * 100).toFixed(2)),
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={11} tickFormatter={v => `${v}%`} />
        <YAxis type="category" dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={11} width={160} />
        <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          formatter={(v: any) => `${v}%`} />
        <Legend wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }} />
        <Bar dataKey="ctr" name="CTR" fill="#94a3b8" radius={[0, 4, 4, 0]} />
        <Bar dataKey="cvr" name="CVR" fill={GOLD} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function PersonalizationConsole() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  const [tab, setTab] = useState<"segments" | "rules" | "pending" | "analytics">("segments");
  const [showPropose, setShowPropose] = useState(false);
  const [analyticsSurface, setAnalyticsSurface] = useState<string>("");
  const qc = useQueryClient();

  const segmentsQ = useQuery<{ segments: Segment[]; counts: SegmentCount[] }>({
    queryKey: ["/api/admin/personalization/segments"], enabled: authed,
  });
  const surfacesQ = useQuery<{ surfaces: string[] }>({
    queryKey: ["/api/admin/personalization/surfaces"], enabled: authed,
  });
  const rulesQ = useQuery<Rule[]>({
    queryKey: ["/api/admin/personalization/rules"], enabled: authed, refetchInterval: 30000,
  });
  const analyticsQ = useQuery<Analytics>({
    queryKey: ["/api/admin/personalization/analytics", analyticsSurface],
    enabled: authed && tab === "analytics",
    queryFn: async () => {
      const url = analyticsSurface
        ? `/api/admin/personalization/analytics?surface=${encodeURIComponent(analyticsSurface)}`
        : "/api/admin/personalization/analytics";
      const r = await fetch(url, { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); setAuthed(false); throw new Error("401"); }
      if (!r.ok) throw new Error(`Analytics failed (${r.status})`);
      return r.json();
    },
  });

  // Detect 401 on default queries
  useEffect(() => {
    const err = (segmentsQ.error || rulesQ.error || surfacesQ.error) as any;
    if (err && String(err.message).includes("401")) {
      sessionStorage.removeItem("e360_dashboard_auth"); setAuthed(false);
    }
  }, [segmentsQ.error, rulesQ.error, surfacesQ.error]);

  const proposeM = useMutation({
    mutationFn: async (v: { surface: string; hypothesis: string }) => {
      const r = await fetch("/api/admin/personalization/propose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(v),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Propose failed");
      return r.json();
    },
    onSuccess: () => { setShowPropose(false); qc.invalidateQueries({ queryKey: ["/api/admin/personalization/rules"] }); },
  });

  const decideM = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      const r = await fetch(`/api/admin/personalization/rules/${id}/decide`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Decide failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/personalization/rules"] }); },
  });

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;

  const segments = segmentsQ.data?.segments ?? [];
  const counts = segmentsQ.data?.counts ?? [];
  const countMap = new Map(counts.map(c => [c.segmentKey, c]));
  const surfaces = surfacesQ.data?.surfaces ?? [];
  const allRules = rulesQ.data ?? [];
  const pendingRules = allRules.filter(r => r.status === "pending");
  const activeRules = allRules.filter(r => r.status === "active" || r.status === "approved");
  const otherRules = allRules.filter(r => r.status === "inactive" || r.status === "rejected");

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      {/* Header */}
      <div className="border-b border-white/10 sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(11,18,36,0.92)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: GOLD }}>
              <Layers className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">Personalization Console</h1>
              <p className="text-xs text-white/50">Phase 58 · Adaptive content per visitor segment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="button-propose-new" onClick={() => setShowPropose(true)}
              className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Propose Rules
            </button>
            <button onClick={() => { sessionStorage.removeItem("e360_dashboard_auth"); setAuthed(false); }}
              className="px-3 py-1.5 rounded-lg text-white/60 hover:text-white text-sm">Logout</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto">
          {([
            ["segments", "Segments", Users],
            ["rules", "Active & Approved", CheckCircle2],
            ["pending", `Pending (${pendingRules.length})`, Sparkles],
            ["analytics", "Analytics", Activity],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} data-testid={`tab-${k}`} onClick={() => setTab(k as any)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 whitespace-nowrap ${tab === k ? "bg-[#F4A62A] text-black font-medium" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Safety banner */}
        <div className="lux-card flex items-start gap-3 border-l-4" style={{ borderLeftColor: GOLD }}>
          <Shield className="h-5 w-5 mt-0.5 shrink-0" style={{ color: GOLD }} />
          <div className="text-sm">
            <div className="text-white font-medium">Safe personalization boundaries</div>
            <div className="text-white/60 mt-1">
              Content-only variants on a closed whitelist of surfaces. No protected-class signals, no price discrimination,
              no payment or email mutations. All AI proposals require founder approval before activation.
            </div>
          </div>
        </div>

        {tab === "segments" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segmentsQ.isLoading && <div className="text-white/40 text-sm">Loading segments…</div>}
            {segments.map(seg => {
              const c = countMap.get(seg.segmentKey);
              return (
                <div key={seg.id} className="lux-card" data-testid={`segment-card-${seg.segmentKey}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold truncate">{seg.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{ background: statusColor(seg.status) + "33", color: statusColor(seg.status) }}>
                      {seg.status}
                    </span>
                  </div>
                  <div className="text-white/40 text-xs font-mono mb-2">{seg.segmentKey}</div>
                  {seg.description && <p className="text-white/70 text-sm mb-3">{seg.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-white/50">Profiles</div>
                      <div className="text-white font-semibold text-lg" data-testid={`segment-count-${seg.segmentKey}`}>{c?.count ?? 0}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-white/50">Avg score</div>
                      <div className="text-white font-semibold text-lg">{c?.avgScore?.toFixed(1) ?? "—"}</div>
                    </div>
                  </div>
                  {Array.isArray(seg.rules) && seg.rules.length > 0 && (
                    <div className="mt-3 text-xs text-white/50">{seg.rules.length} rule{seg.rules.length === 1 ? "" : "s"}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "rules" && (
          <div className="space-y-3">
            {rulesQ.isLoading && <div className="text-white/40 text-sm">Loading rules…</div>}
            {activeRules.length === 0 && !rulesQ.isLoading && (
              <div className="lux-card text-white/50 text-sm">
                No active rules yet. Click <span className="text-white">Propose Rules</span> to draft AI suggestions, then approve and activate them.
              </div>
            )}
            {activeRules.map(r => <RuleCard key={r.id} rule={r} pending={decideM.isPending} onAction={(id, a) => decideM.mutate({ id, action: a })} />)}
            {otherRules.length > 0 && (
              <>
                <div className="text-white/40 text-xs uppercase tracking-wider pt-4">Archive</div>
                {otherRules.map(r => <RuleCard key={r.id} rule={r} pending={decideM.isPending} onAction={(id, a) => decideM.mutate({ id, action: a })} />)}
              </>
            )}
          </div>
        )}

        {tab === "pending" && (
          <div className="space-y-3">
            {pendingRules.length === 0 && (
              <div className="lux-card text-white/50 text-sm">No pending proposals.</div>
            )}
            {pendingRules.map(r => <RuleCard key={r.id} rule={r} pending={decideM.isPending} onAction={(id, a) => decideM.mutate({ id, action: a })} />)}
          </div>
        )}

        {tab === "analytics" && (
          <div className="space-y-4">
            <div className="lux-card">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-white font-semibold">Per-segment performance</h3>
                  <p className="text-white/50 text-xs">CTR and CVR by (surface · segment). DeepSeek diagnostics + OpenAI executive summary below.</p>
                </div>
                <select data-testid="select-analytics-surface" value={analyticsSurface} onChange={e => setAnalyticsSurface(e.target.value)}
                  className="bg-white/6 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="" className="bg-[#0b1224]">All surfaces</option>
                  {surfaces.map(s => <option key={s} value={s} className="bg-[#0b1224]">{s}</option>)}
                </select>
              </div>
              {analyticsQ.isLoading && <div className="text-white/40 text-sm">Loading…</div>}
              {analyticsQ.data && <SegmentComparisonChart rows={analyticsQ.data.perSegment} />}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lux-card">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4" style={{ color: GOLD }} />
                  <h3 className="text-white font-semibold text-sm">DeepSeek diagnostics</h3>
                  {analyticsQ.data?.diagnosticsProvider && (
                    <span className="text-xs text-white/40 ml-auto">{analyticsQ.data.diagnosticsProvider}</span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap text-white/70 text-sm" data-testid="text-diagnostics">
                  {analyticsQ.data?.diagnostics || "Awaiting ≥10 events to analyze."}
                </pre>
              </div>
              <div className="lux-card">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4" style={{ color: GOLD }} />
                  <h3 className="text-white font-semibold text-sm">OpenAI executive summary</h3>
                  {analyticsQ.data?.executiveProvider && (
                    <span className="text-xs text-white/40 ml-auto">{analyticsQ.data.executiveProvider}</span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap text-white/70 text-sm" data-testid="text-executive">
                  {analyticsQ.data?.executive || "Awaiting ≥10 events to analyze."}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPropose && (
        <ProposeDialog
          surfaces={surfaces} onClose={() => setShowPropose(false)}
          onSubmit={(v) => proposeM.mutate(v)} pending={proposeM.isPending}
        />
      )}
    </div>
  );
}
