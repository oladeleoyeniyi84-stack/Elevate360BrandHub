// Phase 72.5 — Growth Actions tab: founder-approved SEO remediation queue.
// Read + decide only; every action is server-generated with stored evidence
// and a transparent priority formula. Nothing here executes changes.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { SectionCard } from "./shared";

const GOLD = "#F4A62A";

interface GrowthAction {
  id: number;
  actionType: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  targetPath: string | null;
  targetQuery: string | null;
  priorityScore: number;
  impactScore: number;
  evidenceScore: number;
  relevanceScore: number;
  confidenceScore: number;
  effortScore: number;
  sourceType: string;
  status: string;
  founderDecision: string | null;
  decisionNote: string | null;
  implementationNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  dismissedAt: string | null;
  measurementStart: string | null;
  measurementEnd: string | null;
  baselineMetrics: Record<string, unknown> | null;
  resultMetrics: (Record<string, unknown> & { outcome?: string }) | null;
}

interface GrowthPayload {
  actions: GrowthAction[];
  summary: {
    kpis: {
      openActions: number; highPriorityActions: number; approvedActions: number;
      completedActions: number; awaitingMeasurement: number; observedImprovements: number;
      impressionsChangePct: number | null; clicksChangePct: number | null;
      organicFunnelEntries: number; directionalOrganicRevenueCents: number;
    };
    operations: {
      lastGscSync: { at: string | null; status: string | null; source: string | null };
      nextScheduledGscSync: string | null;
      lastSeoAudit: { at: string | null; status: string | null };
      nextScheduledSeoAudit: string | null;
      lastGenerationRun: { at: string | null; summary: string | null };
      currentJobFailure: string | null;
    };
    priorityModel: string;
    measurementDisclaimer: string;
  };
}

const STATUS_STYLES: Record<string, string> = {
  proposed: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  completed: "bg-emerald-600/15 text-emerald-300 border-emerald-500/30",
  dismissed: "bg-white/8 text-white/40 border-white/15",
  superseded: "bg-white/8 text-white/40 border-white/15",
};

const STATUS_FILTERS = ["all", "proposed", "approved", "in_progress", "completed", "dismissed", "superseded"] as const;

function fmtDate(s: string | null): string {
  return s ? new Date(s).toLocaleString() : "—";
}

function Kpi({ label, value, testid }: { label: string; value: string | number; testid?: string }) {
  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-3">
      <p className="text-white/40 text-[10px] uppercase tracking-wide font-bold">{label}</p>
      <p className="text-white text-lg font-black" data-testid={testid}>{value}</p>
    </div>
  );
}

function ActionCard({ a, disclaimer, onDecision }: {
  a: GrowthAction;
  disclaimer: string;
  onDecision: (id: number, decision: "approve" | "dismiss" | "start" | "complete", note?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [completeNote, setCompleteNote] = useState("");
  const [mode, setMode] = useState<"none" | "dismiss" | "complete">("none");
  const live = ["proposed", "approved", "in_progress"].includes(a.status);

  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-4 space-y-3" data-testid={`card-growth-action-${a.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-md px-1.5 py-0.5 ${STATUS_STYLES[a.status] ?? STATUS_STYLES.proposed}`}>{a.status.replace("_", " ")}</span>
            <span className="text-white/35 text-[10px] uppercase tracking-wide font-mono">{a.actionType}</span>
          </div>
          <h3 className="text-white font-bold text-sm mt-1.5">{a.title}</h3>
          <p className="text-white/55 text-xs mt-1 leading-relaxed">{a.description}</p>
          {(a.targetPath || a.targetQuery) && (
            <p className="text-white/35 text-[11px] mt-1 font-mono break-all">
              {a.targetPath && <>page: {a.targetPath} </>}{a.targetQuery && <>query: {a.targetQuery}</>}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-white/40 text-[10px] uppercase tracking-wide font-bold">Priority</p>
          <p className="text-xl font-black" style={{ color: GOLD }} data-testid={`text-priority-${a.id}`}>{a.priorityScore}</p>
        </div>
      </div>

      <button onClick={() => setOpen(!open)} className="text-white/45 hover:text-white/70 text-xs flex items-center gap-1" data-testid={`button-evidence-${a.id}`}>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} Evidence & scores
      </button>
      {open && (
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-2 text-center">
            {[["Impact 30%", a.impactScore], ["Evidence 25%", a.evidenceScore], ["Relevance 20%", a.relevanceScore], ["Confidence 15%", a.confidenceScore], ["Effort eff. 10%", a.effortScore]].map(([l, v]) => (
              <div key={String(l)} className="bg-white/4 border border-white/10 rounded-lg py-1.5">
                <p className="text-white/35 text-[9px] uppercase font-bold">{l}</p>
                <p className="text-white/80 text-sm font-bold">{v}</p>
              </div>
            ))}
          </div>
          <pre className="text-white/45 text-[10px] bg-black/30 border border-white/10 rounded-lg p-3 overflow-x-auto max-h-56" data-testid={`text-evidence-${a.id}`}>
            {JSON.stringify(a.evidence, null, 2)}
          </pre>
          {a.decisionNote && <p className="text-white/45 text-xs">Decision note: {a.decisionNote}</p>}
          {a.implementationNote && <p className="text-white/45 text-xs">Implementation: {a.implementationNote}</p>}
          {a.status === "completed" && (
            <div className="bg-white/4 border border-white/10 rounded-lg p-3 space-y-1">
              <p className="text-white/60 text-xs font-bold uppercase tracking-wide">Measurement</p>
              <p className="text-white/45 text-[11px]">Baseline captured {fmtDate(a.completedAt)} · window opens {a.measurementStart ?? "—"}</p>
              {a.resultMetrics ? (
                <>
                  <p className="text-white/70 text-xs">Outcome: <span className="font-bold">{String(a.resultMetrics.outcome ?? "—").replace("_", " ")}</span> (through {a.measurementEnd ?? "—"})</p>
                  <pre className="text-white/40 text-[10px] overflow-x-auto max-h-40">{JSON.stringify({ baseline: a.baselineMetrics, result: a.resultMetrics }, null, 2)}</pre>
                </>
              ) : (
                <p className="text-white/45 text-xs">Awaiting a full post-implementation window of stored data.</p>
              )}
              <p className="text-white/30 text-[10px] italic">{disclaimer}</p>
            </div>
          )}
        </div>
      )}

      {live && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {a.status === "proposed" && (
            <button onClick={() => onDecision(a.id, "approve")} className="btn-primary px-3 py-1.5 text-xs" data-testid={`button-approve-${a.id}`}>Approve</button>
          )}
          {(a.status === "approved") && (
            <button onClick={() => onDecision(a.id, "start")} className="btn-primary px-3 py-1.5 text-xs" data-testid={`button-start-${a.id}`}>Mark in progress</button>
          )}
          {(a.status === "approved" || a.status === "in_progress") && (
            <button onClick={() => setMode(mode === "complete" ? "none" : "complete")} className="text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs" data-testid={`button-complete-${a.id}`}>Mark completed</button>
          )}
          <button onClick={() => setMode(mode === "dismiss" ? "none" : "dismiss")} className="text-white/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs" data-testid={`button-dismiss-${a.id}`}>Dismiss</button>
        </div>
      )}
      {mode === "dismiss" && (
        <div className="flex items-center gap-2">
          <input value={dismissReason} onChange={(e) => setDismissReason(e.target.value)} placeholder="Reason (required)" className="flex-1 bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white" data-testid={`input-dismiss-reason-${a.id}`} />
          <button disabled={dismissReason.trim().length < 3} onClick={() => onDecision(a.id, "dismiss", dismissReason.trim())} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40" data-testid={`button-confirm-dismiss-${a.id}`}>Confirm</button>
        </div>
      )}
      {mode === "complete" && (
        <div className="flex items-center gap-2">
          <input value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="Implementation note (required)" className="flex-1 bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white" data-testid={`input-complete-note-${a.id}`} />
          <button disabled={completeNote.trim().length < 3} onClick={() => onDecision(a.id, "complete", completeNote.trim())} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40" data-testid={`button-confirm-complete-${a.id}`}>Confirm</button>
        </div>
      )}
    </div>
  );
}

export function GrowthActionsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [pathFilter, setPathFilter] = useState("");
  const [queryFilter, setQueryFilter] = useState("");
  const [minPriority, setMinPriority] = useState("");

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (typeFilter) params.set("actionType", typeFilter);
  if (pathFilter.trim()) params.set("targetPath", pathFilter.trim());
  if (queryFilter.trim()) params.set("targetQuery", queryFilter.trim());
  if (minPriority) params.set("minPriority", minPriority);
  const qs = params.toString();

  const q = useQuery<GrowthPayload>({
    queryKey: ["/api/dashboard/search-growth/actions", qs],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/search-growth/actions${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(`Failed to load growth actions (${res.status})`);
      return res.json();
    },
  });

  const decision = useMutation({
    mutationFn: async ({ id, kind, note }: { id: number; kind: "approve" | "dismiss" | "start" | "complete"; note?: string }) => {
      const body = kind === "dismiss" ? { reason: note } : kind === "complete" ? { implementationNote: note } : note ? { note } : {};
      const res = await fetch(`/api/dashboard/search-growth/actions/${id}/${kind}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Decision failed (${res.status})`);
      return json;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/dashboard/search-growth/actions"] }),
  });

  if (q.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" style={{ color: GOLD }} /></div>;
  }
  if (q.isError || !q.data) {
    return <p className="text-white/50 text-sm py-10 text-center" data-testid="text-growth-error">Could not load growth actions.</p>;
  }

  const { actions, summary } = q.data;
  const k = summary.kpis;
  const ops = summary.operations;
  const actionTypes = Array.from(new Set(actions.map((a) => a.actionType))).sort();

  return (
    <div className="space-y-6">
      <SectionCard title="Executive Summary" icon={TrendingUp}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
          <Kpi label="Open actions" value={k.openActions} testid="kpi-open-actions" />
          <Kpi label="High priority (70+)" value={k.highPriorityActions} testid="kpi-high-priority" />
          <Kpi label="Approved" value={k.approvedActions} />
          <Kpi label="Completed" value={k.completedActions} />
          <Kpi label="Awaiting measurement" value={k.awaitingMeasurement} />
          <Kpi label="Observed improvements" value={k.observedImprovements} />
          <Kpi label="Impressions Δ (28d)" value={k.impressionsChangePct === null ? "—" : `${k.impressionsChangePct > 0 ? "+" : ""}${k.impressionsChangePct}%`} />
          <Kpi label="Clicks Δ (28d)" value={k.clicksChangePct === null ? "—" : `${k.clicksChangePct > 0 ? "+" : ""}${k.clicksChangePct}%`} />
          <Kpi label="Organic funnel entries" value={k.organicFunnelEntries} />
          <Kpi label="Directional organic revenue" value={`$${(k.directionalOrganicRevenueCents / 100).toLocaleString()}`} />
        </div>
        <p className="text-white/30 text-[11px] mt-3 leading-relaxed" data-testid="text-priority-model">{summary.priorityModel}</p>
      </SectionCard>

      <SectionCard title="Search Operations" icon={TrendingUp}>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm mt-2" data-testid="panel-growth-ops">
          <div className="flex items-center justify-between"><span className="text-white/60">Last GSC sync</span><span className="text-white/85 text-xs">{fmtDate(ops.lastGscSync.at)} · {ops.lastGscSync.status ?? "—"}{ops.lastGscSync.source ? ` (${ops.lastGscSync.source})` : ""}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/60">Next scheduled GSC sync</span><span className="text-white/85 text-xs">{fmtDate(ops.nextScheduledGscSync)}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/60">Last SEO audit</span><span className="text-white/85 text-xs">{fmtDate(ops.lastSeoAudit.at)} · {ops.lastSeoAudit.status ?? "—"}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/60">Next scheduled SEO audit</span><span className="text-white/85 text-xs">{fmtDate(ops.nextScheduledSeoAudit)}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/60">Last generation run</span><span className="text-white/85 text-xs">{fmtDate(ops.lastGenerationRun.at)}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/60">Job failure</span><span className={`text-xs ${ops.currentJobFailure ? "text-red-400" : "text-white/45"}`}>{ops.currentJobFailure ?? "none"}</span></div>
        </div>
        {ops.lastGenerationRun.summary && <p className="text-white/35 text-xs mt-2">{ops.lastGenerationRun.summary}</p>}
      </SectionCard>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-black/30 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white/80" data-testid="select-growth-status">
          {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-black/30 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white/80" data-testid="select-growth-type">
          <option value="">All types</option>
          {actionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} placeholder="Filter by page…" className="bg-black/30 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white/80 w-36" data-testid="input-growth-path" />
        <input value={queryFilter} onChange={(e) => setQueryFilter(e.target.value)} placeholder="Filter by query…" className="bg-black/30 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white/80 w-36" data-testid="input-growth-query" />
        <select value={minPriority} onChange={(e) => setMinPriority(e.target.value)} className="bg-black/30 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white/80" data-testid="select-growth-priority">
          <option value="">Any priority</option>
          <option value="70">70+</option>
          <option value="50">50+</option>
          <option value="30">30+</option>
        </select>
      </div>

      {decision.isError && <p className="text-red-400 text-xs" data-testid="text-decision-error">{(decision.error as Error).message}</p>}

      {actions.length === 0 ? (
        <p className="text-white/35 text-sm py-8 text-center" data-testid="text-no-actions">
          No growth actions match. Actions are generated automatically after each successful Search Console sync.
        </p>
      ) : (
        <div className="space-y-3">
          {actions.map((a) => (
            <ActionCard key={a.id} a={a} disclaimer={summary.measurementDisclaimer}
              onDecision={(id, kind, note) => decision.mutate({ id, kind, note })} />
          ))}
        </div>
      )}
    </div>
  );
}
