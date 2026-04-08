import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, XCircle,
  RefreshCw, Download, ChevronDown, ChevronUp, Edit2, Clock,
  ClipboardList, Info,
} from "lucide-react";
import { AutonomousAlertsPanel } from "@/components/dashboard/AutonomousAlertsPanel";
import type { AutonomousAlert } from "@/types/automation";

async function authedJsonAudit<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditRun {
  id: number;
  auditType: string;
  status: string;
  overallVerdict: string | null;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  checksPassed: number;
  checksFailed: number;
  summary: string | null;
  createdAt: string;
}

interface AuditCheck {
  id: number;
  checkKey: string;
  checkGroup: string;
  title: string;
  severity: string;
  status: string;
  expectedValue: string | null;
  actualValue: string | null;
  detailsJson: Record<string, unknown> | null;
}

interface AuditIssue {
  id: number;
  issueCode: string;
  area: string;
  severity: string;
  expected: string;
  actual: string;
  suspectedCause: string | null;
  owner: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface AuditSummary {
  latestRun: AuditRun | null;
  openIssueCount: number;
  criticalOpen: number;
  highOpen: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function SeverityBadge({ severity }: { severity: string }) {
  const classes: Record<string, string> = {
    critical: "bg-red-500/20 text-red-300 border border-red-500/30",
    high: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    low: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${classes[severity] ?? classes.low}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pass")
    return <span className="flex items-center gap-1 text-green-400 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" />pass</span>;
  if (status === "warning")
    return <span className="flex items-center gap-1 text-yellow-400 text-xs font-medium"><AlertTriangle className="h-3.5 w-3.5" />warning</span>;
  return <span className="flex items-center gap-1 text-red-400 text-xs font-medium"><XCircle className="h-3.5 w-3.5" />fail</span>;
}

function IssueStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "text-red-300",
    investigating: "text-yellow-300",
    fixed: "text-green-300",
    ignored: "text-slate-400",
  };
  return <span className={`text-xs font-medium capitalize ${map[status] ?? "text-white/50"}`}>{status}</span>;
}

function VerdictCard({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="text-white/30 text-sm">—</span>;
  if (verdict === "trusted") return <span className="flex items-center gap-1.5 text-green-400 font-bold text-sm"><ShieldCheck className="h-4 w-4" />Trusted</span>;
  if (verdict === "trusted_with_exceptions") return <span className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm"><AlertTriangle className="h-4 w-4" />Trusted with Exceptions</span>;
  return <span className="flex items-center gap-1.5 text-red-400 font-bold text-sm"><AlertCircle className="h-4 w-4" />Not Yet Trusted</span>;
}

// ─── Controlled Test Matrix (local state, 10 cases) ──────────────────────────

type TestResult = "pending" | "pass" | "fail";
type TestCase = { id: string; path: string; expected: string; actual: string; result: TestResult; notes: string };

const DEFAULT_TEST_CASES: TestCase[] = [
  { id: "T01", path: "Chat → click recommended offer → Stripe checkout", expected: "Order linked to session, attribution = ai_originated", actual: "", result: "pending", notes: "" },
  { id: "T02", path: "Direct checkout with no prior chat", expected: "Order has sessionId=null, shown as direct in Revenue tab", actual: "", result: "pending", notes: "" },
  { id: "T03", path: "Chat → WhatsApp → purchase confirmed manually", expected: "Admin marks offer accepted with source=whatsapp", actual: "", result: "pending", notes: "" },
  { id: "T04", path: "Book a consultation via booking form", expected: "Booking row created, status=pending, urgency bar increments", actual: "", result: "pending", notes: "" },
  { id: "T05", path: "Cancel a booking in dashboard", expected: "Booking status=cancelled, funnel Booked count decrements", actual: "", result: "pending", notes: "" },
  { id: "T06", path: "Send follow-up to a hot lead via reminder queue", expected: "followupCount+1, lastFollowupSentAt set, audit log entry created", actual: "", result: "pending", notes: "" },
  { id: "T07", path: "Trigger 16 rapid /api/chat requests from same IP", expected: "429 response on hit #16", actual: "", result: "pending", notes: "" },
  { id: "T08", path: "Log in to dashboard with correct PIN", expected: "audit_logs: dashboard_login event with IP in meta", actual: "", result: "pending", notes: "" },
  { id: "T09", path: "Log in with wrong PIN", expected: "401 returned, audit_logs: dashboard_login_failed event", actual: "", result: "pending", notes: "" },
  { id: "T10", path: "GET /api/health with all services running", expected: "200 with status=healthy and all checks ok=true", actual: "", result: "pending", notes: "" },
];

const MATRIX_STORAGE_KEY = "e360_audit_test_matrix_v1";

function loadStoredCases() {
  try {
    const raw = localStorage.getItem(MATRIX_STORAGE_KEY);
    if (!raw) return DEFAULT_TEST_CASES;
    const stored = JSON.parse(raw) as Partial<typeof DEFAULT_TEST_CASES[0]>[];
    return DEFAULT_TEST_CASES.map((def) => {
      const saved = stored.find((s) => s.id === def.id);
      return saved ? { ...def, ...saved } : def;
    });
  } catch {
    return DEFAULT_TEST_CASES;
  }
}

function TestMatrix() {
  const [cases, setCases] = useState(loadStoredCases);

  // Persist to localStorage whenever results change
  useEffect(() => {
    try {
      localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(cases));
    } catch {/* ignore quota errors */}
  }, [cases]);

  const setResult = (id: string, result: TestResult) => {
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, result } : c));
  };
  const setActual = (id: string, actual: string) => {
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, actual } : c));
  };
  const setNotes = (id: string, notes: string) => {
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, notes } : c));
  };
  const handleReset = () => {
    setCases(DEFAULT_TEST_CASES);
    try { localStorage.removeItem(MATRIX_STORAGE_KEY); } catch {/* ignore */}
  };

  const passed = cases.filter((c) => c.result === "pass").length;
  const failed = cases.filter((c) => c.result === "fail").length;
  const pending = cases.filter((c) => c.result === "pending").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400">{passed} pass</span>
          <span className="text-red-400">{failed} fail</span>
          <span className="text-white/30">{pending} pending</span>
        </div>
        <button
          data-testid="button-test-matrix-reset"
          onClick={handleReset}
          className="text-xs text-white/30 hover:text-white/60 transition border border-white/10 px-2.5 py-1 rounded-lg"
        >
          Reset All
        </button>
      </div>
      {cases.map((c) => (
        <div key={c.id} className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#F4A62A] font-mono font-bold">{c.id}</span>
                <span className="text-sm text-white/80 font-medium">{c.path}</span>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{c.expected}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {(["pass", "fail", "pending"] as TestResult[]).map((r) => (
                <button
                  key={r}
                  data-testid={`button-test-result-${c.id}-${r}`}
                  onClick={() => setResult(c.id, r)}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    c.result === r
                      ? r === "pass" ? "bg-green-500/30 text-green-300 border border-green-500/40"
                        : r === "fail" ? "bg-red-500/30 text-red-300 border border-red-500/40"
                        : "bg-white/10 text-white/60 border border-white/15"
                      : "bg-white/5 text-white/30 border border-white/8 hover:bg-white/8"
                  }`}
                >
                  {r === "pass" ? "✓ Pass" : r === "fail" ? "✗ Fail" : "—"}
                </button>
              ))}
            </div>
          </div>
          {c.result !== "pending" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                data-testid={`input-test-actual-${c.id}`}
                value={c.actual}
                onChange={(e) => setActual(c.id, e.target.value)}
                placeholder="Actual result observed..."
                className="text-xs rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-white/70 placeholder-white/25 focus:outline-none focus:border-[#F4A62A]/40"
              />
              <input
                data-testid={`input-test-notes-${c.id}`}
                value={c.notes}
                onChange={(e) => setNotes(c.id, e.target.value)}
                placeholder="Notes..."
                className="text-xs rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-white/70 placeholder-white/25 focus:outline-none focus:border-[#F4A62A]/40"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuditTab() {
  const qc = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [editingIssueId, setEditingIssueId] = useState<number | null>(null);
  const [editOwner, setEditOwner] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [activeSection, setActiveSection] = useState<"checks" | "issues" | "matrix" | "verdict">("checks");
  const [isRunning, setIsRunning] = useState(false);
  const [issueFilter, setIssueFilter] = useState<string>("open");

  // Queries
  const summaryQuery = useQuery<AuditSummary>({
    queryKey: ["/api/dashboard/audit/summary"],
    refetchInterval: 60_000,
  });

  const runsQuery = useQuery<AuditRun[]>({
    queryKey: ["/api/dashboard/audit/runs"],
  });

  const activeRunId = selectedRunId ?? summaryQuery.data?.latestRun?.id ?? null;

  const checksQuery = useQuery<AuditCheck[]>({
    queryKey: ["/api/dashboard/audit/runs", activeRunId, "checks"],
    queryFn: async () => {
      if (!activeRunId) return [];
      const res = await fetch(`/api/dashboard/audit/runs/${activeRunId}/checks`, { credentials: "include" });
      return res.json();
    },
    enabled: !!activeRunId,
  });

  const issuesQuery = useQuery<AuditIssue[]>({
    queryKey: ["/api/dashboard/audit/issues"],
  });

  // Run audit mutation
  const runAuditMutation = useMutation({
    mutationFn: async (auditType: string) => {
      setIsRunning(true);
      const res = await fetch("/api/dashboard/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ auditType }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setIsRunning(false);
      setSelectedRunId(data.run.id);
      qc.invalidateQueries({ queryKey: ["/api/dashboard/audit/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/audit/runs"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/audit/issues"] });
    },
    onError: () => setIsRunning(false),
  });

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, string> }) => {
      const res = await fetch(`/api/dashboard/audit/issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setEditingIssueId(null);
      qc.invalidateQueries({ queryKey: ["/api/dashboard/audit/issues"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/audit/summary"] });
    },
  });

  const autonomousAlertsQ = useQuery<AutonomousAlert[]>({
    queryKey: ["autonomous-alerts"],
    queryFn: () => authedJsonAudit("/api/audit/autonomous-alerts"),
    refetchInterval: 120_000,
  });

  const runAutonomousChecks = useMutation({
    mutationFn: () => authedJsonAudit("/api/audit/run-autonomous-checks", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autonomous-alerts"] }),
  });

  const patchAlert = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AutonomousAlert["status"] }) =>
      authedJsonAudit(`/api/audit/autonomous-alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autonomous-alerts"] }),
  });

  const handleExport = () => {
    const url = activeRunId
      ? `/api/dashboard/audit/export?runId=${activeRunId}`
      : "/api/dashboard/audit/export";
    window.open(url, "_blank");
  };

  const latestRun = summaryQuery.data?.latestRun;
  const checks = checksQuery.data ?? [];
  const issues = issuesQuery.data ?? [];
  const filteredIssues = issueFilter === "all" ? issues : issues.filter((i) => i.status === issueFilter);

  // Verdict per group from checks
  const verdictByGroup = (() => {
    const groups = ["continuity", "funnel", "revenue", "attribution", "followup", "reliability", "security"];
    const result: Record<string, { pass: number; fail: number; warn: number; verdict: string }> = {};
    for (const g of groups) {
      const gc = checks.filter((c) => c.checkGroup === g);
      const fail = gc.filter((c) => c.status === "fail").length;
      const warn = gc.filter((c) => c.status === "warning").length;
      const pass = gc.filter((c) => c.status === "pass").length;
      let verdict = "—";
      if (gc.length > 0) {
        if (fail > 0 && gc.some((c) => c.status === "fail" && (c.severity === "critical" || c.severity === "high")))
          verdict = "not_yet_trusted";
        else if (fail > 0 || warn > 0)
          verdict = "trusted_with_exceptions";
        else
          verdict = "trusted";
      }
      result[g] = { pass, fail, warn, verdict };
    }
    return result;
  })();

  return (
    <div className="space-y-6">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3" data-testid="audit-card-verdict">
          <p className="text-xs text-white/40 mb-1">Overall Trust</p>
          <VerdictCard verdict={latestRun?.overallVerdict ?? null} />
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3" data-testid="audit-card-critical">
          <p className="text-xs text-white/40 mb-1">Critical Issues</p>
          <p className={`text-xl font-bold ${(summaryQuery.data?.criticalOpen ?? 0) > 0 ? "text-red-400" : "text-white/30"}`}>
            {summaryQuery.data?.criticalOpen ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 px-4 py-3" data-testid="audit-card-high">
          <p className="text-xs text-white/40 mb-1">High Issues</p>
          <p className={`text-xl font-bold ${(summaryQuery.data?.highOpen ?? 0) > 0 ? "text-orange-400" : "text-white/30"}`}>
            {summaryQuery.data?.highOpen ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3" data-testid="audit-card-passed">
          <p className="text-xs text-white/40 mb-1">Checks Passed</p>
          <p className="text-xl font-bold text-green-400">{latestRun?.checksPassed ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3" data-testid="audit-card-failed">
          <p className="text-xs text-white/40 mb-1">Checks Failed</p>
          <p className={`text-xl font-bold ${(latestRun?.checksFailed ?? 0) > 0 ? "text-red-400" : "text-white/30"}`}>
            {latestRun?.checksFailed ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3" data-testid="audit-card-last-run">
          <p className="text-xs text-white/40 mb-1">Last Run</p>
          <p className="text-xs font-medium text-white/60 leading-tight">
            {latestRun ? new Date(latestRun.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
          </p>
        </div>
      </div>

      {/* ── Staleness Warning ── */}
      {latestRun && (() => {
        const hoursSince = (Date.now() - new Date(latestRun.createdAt).getTime()) / 3_600_000;
        return hoursSince > 24 ? (
          <div className="flex items-start gap-2 rounded-xl border border-yellow-500/25 bg-yellow-500/8 px-4 py-3" data-testid="audit-staleness-warning">
            <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300/80 leading-relaxed">
              Last audit was <strong>{Math.floor(hoursSince)}h ago</strong>. Run a fresh audit to ensure the verdict reflects current data.
            </p>
          </div>
        ) : null;
      })()}

      {/* ── Quick Actions ── */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
        <h3 className="text-sm font-semibold text-white/70 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: isRunning ? "Running…" : "Run Full Audit", type: "full", gold: true },
            { label: "Revenue", type: "revenue" },
            { label: "Attribution", type: "attribution" },
            { label: "Funnel", type: "funnel" },
            { label: "Follow-Up", type: "followup" },
            { label: "Continuity", type: "continuity" },
            { label: "Reliability", type: "reliability" },
            { label: "Security", type: "security" },
          ].map(({ label, type, gold }) => (
            <button
              key={type}
              data-testid={`button-audit-run-${type}`}
              disabled={isRunning}
              onClick={() => { runAuditMutation.mutate(type); setActiveSection("checks"); }}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                gold
                  ? "bg-[#F4A62A] text-black hover:bg-[#F4A62A]/90"
                  : "border border-white/12 text-white/70 hover:bg-white/6 hover:text-white"
              }`}
            >
              {isRunning && type === "full" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
          <button
            data-testid="button-audit-export"
            onClick={handleExport}
            disabled={!activeRunId}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-[#F4A62A]/30 text-[#F4A62A] hover:bg-[#F4A62A]/10 transition disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            Export Report
          </button>
        </div>
        {latestRun?.summary && (
          <p className="mt-3 text-xs text-white/40 leading-relaxed">{latestRun.summary}</p>
        )}
      </div>

      {/* ── Run History Selector ── */}
      {(runsQuery.data?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Viewing run:</span>
          <select
            data-testid="select-audit-run"
            value={activeRunId ?? ""}
            onChange={(e) => setSelectedRunId(Number(e.target.value))}
            className="text-xs rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-white/70 focus:outline-none"
          >
            {runsQuery.data?.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} — {r.auditType} — {r.overallVerdict ?? r.status} — {new Date(r.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Section Tabs ── */}
      {!latestRun && !isRunning && (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-10 text-center">
          <ShieldCheck className="h-10 w-10 text-[#F4A62A]/30 mx-auto mb-3" />
          <p className="text-white/50 text-sm mb-4">No audit has been run yet.</p>
          <button
            data-testid="button-audit-run-first"
            onClick={() => runAuditMutation.mutate("full")}
            className="bg-[#F4A62A] text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[#F4A62A]/90 transition"
          >
            Run Full Audit
          </button>
        </div>
      )}

      {(latestRun || isRunning) && (
        <>
          <div className="flex gap-1 bg-white/4 rounded-xl p-1 overflow-x-auto">
            {[
              { key: "checks", label: "Automated Checks", icon: ClipboardList },
              { key: "issues", label: `Issues (${issues.filter(i => i.status === "open").length} open)`, icon: AlertCircle },
              { key: "matrix", label: "Test Matrix", icon: CheckCircle2 },
              { key: "verdict", label: "Final Verdict", icon: ShieldCheck },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                data-testid={`button-audit-section-${key}`}
                onClick={() => setActiveSection(key as any)}
                className={`flex items-center gap-1.5 flex-shrink-0 py-2 px-3 rounded-lg text-xs font-medium transition ${
                  activeSection === key ? "bg-[#F4A62A] text-black" : "text-white/50 hover:text-white/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Automated Checks Table ── */}
          {activeSection === "checks" && (
            <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
              {checksQuery.isLoading ? (
                <div className="p-8 text-center text-white/40 text-sm">Loading checks…</div>
              ) : checks.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">No checks found for this run.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-white/40 text-xs">
                      <th className="text-left px-4 py-3 font-medium">Check</th>
                      <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Group</th>
                      <th className="text-left px-4 py-3 font-medium">Severity</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Expected</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Actual</th>
                      <th className="text-left px-4 py-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...checks]
                      .sort((a, b) => {
                        const statusOrder = { fail: 0, warning: 1, pass: 2 };
                        const sA = (statusOrder as any)[a.status] ?? 3;
                        const sB = (statusOrder as any)[b.status] ?? 3;
                        if (sA !== sB) return sA - sB;
                        return (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
                      })
                      .map((c) => (
                        <>
                          <tr
                            key={c.id}
                            data-testid={`row-audit-check-${c.checkKey}`}
                            className={`border-b border-white/5 hover:bg-white/4 transition ${
                              c.status === "fail" ? "bg-red-500/5" : c.status === "warning" ? "bg-yellow-500/5" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <p className="text-white/80 text-xs font-medium leading-tight">{c.title}</p>
                              <p className="text-white/30 text-xs font-mono mt-0.5">{c.checkKey}</p>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-xs capitalize text-white/40 bg-white/6 px-2 py-0.5 rounded">{c.checkGroup}</span>
                            </td>
                            <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                            <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-white/40 max-w-[120px] truncate">{c.expectedValue}</td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-white/70 max-w-[120px] truncate">{c.actualValue}</td>
                            <td className="px-4 py-3">
                              {c.detailsJson && (
                                <button
                                  data-testid={`button-audit-check-expand-${c.checkKey}`}
                                  onClick={() => setExpandedCheck(expandedCheck === c.checkKey ? null : c.checkKey)}
                                  className="text-white/30 hover:text-white/60 transition"
                                >
                                  {expandedCheck === c.checkKey ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedCheck === c.checkKey && c.detailsJson && (
                            <tr key={`${c.id}-detail`} className="border-b border-white/5 bg-white/2">
                              <td colSpan={7} className="px-6 py-3">
                                <div className="space-y-1.5">
                                  {Object.entries(c.detailsJson).map(([k, v]) => (
                                    <div key={k} className="flex gap-2 text-xs">
                                      <span className="text-white/30 font-mono min-w-[140px] flex-shrink-0">{k}:</span>
                                      <span className="text-white/60 break-all">
                                        {Array.isArray(v) ? (v.length === 0 ? "[]" : v.join(", ")) : String(v ?? "—")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Issues Register ── */}
          {activeSection === "issues" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Filter:</span>
                {["open", "investigating", "fixed", "ignored", "all"].map((f) => (
                  <button
                    key={f}
                    data-testid={`button-issue-filter-${f}`}
                    onClick={() => setIssueFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition capitalize ${
                      issueFilter === f ? "bg-[#F4A62A]/20 text-[#F4A62A] border border-[#F4A62A]/30" : "text-white/40 hover:text-white/60 border border-white/10"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {filteredIssues.length === 0 ? (
                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-300 text-sm font-medium">No {issueFilter !== "all" ? issueFilter : ""} issues found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      data-testid={`card-audit-issue-${issue.id}`}
                      className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-[#F4A62A]">{issue.issueCode}</span>
                            <SeverityBadge severity={issue.severity} />
                            <IssueStatusBadge status={issue.status} />
                            <span className="text-xs text-white/30 capitalize bg-white/6 px-2 py-0.5 rounded">{issue.area}</span>
                          </div>
                          <div className="text-xs text-white/60 leading-relaxed">
                            <span className="text-white/30">Expected: </span>{issue.expected}
                          </div>
                          <div className="text-xs text-white/60 leading-relaxed">
                            <span className="text-white/30">Actual: </span>{issue.actual}
                          </div>
                          {issue.suspectedCause && (
                            <div className="text-xs text-white/40 leading-relaxed">
                              <span className="text-white/20">Cause: </span>{issue.suspectedCause}
                            </div>
                          )}
                          {issue.owner && (
                            <div className="text-xs text-white/40"><span className="text-white/20">Owner: </span>{issue.owner}</div>
                          )}
                          {issue.notes && (
                            <div className="text-xs text-white/40 italic">{issue.notes}</div>
                          )}
                        </div>
                        <button
                          data-testid={`button-issue-edit-${issue.id}`}
                          onClick={() => { setEditingIssueId(issue.id); setEditOwner(issue.owner ?? ""); setEditNotes(issue.notes ?? ""); }}
                          className="text-white/30 hover:text-white/60 transition flex-shrink-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>

                      {editingIssueId === issue.id && (
                        <div className="space-y-2 pt-2 border-t border-white/8">
                          <input
                            data-testid={`input-issue-owner-${issue.id}`}
                            value={editOwner}
                            onChange={(e) => setEditOwner(e.target.value)}
                            placeholder="Assign owner..."
                            className="w-full text-xs rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-white/70 placeholder-white/25 focus:outline-none focus:border-[#F4A62A]/40"
                          />
                          <input
                            data-testid={`input-issue-notes-${issue.id}`}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add notes..."
                            className="w-full text-xs rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-white/70 placeholder-white/25 focus:outline-none focus:border-[#F4A62A]/40"
                          />
                          <div className="flex gap-2 flex-wrap">
                            {["open", "investigating", "fixed", "ignored"].map((s) => (
                              <button
                                key={s}
                                data-testid={`button-issue-status-${issue.id}-${s}`}
                                onClick={() => updateIssueMutation.mutate({ id: issue.id, updates: { owner: editOwner, notes: editNotes, status: s } })}
                                className="px-3 py-1 rounded-lg text-xs font-medium border border-white/12 text-white/60 hover:bg-white/8 transition capitalize"
                              >
                                Mark {s}
                              </button>
                            ))}
                            <button
                              data-testid={`button-issue-cancel-${issue.id}`}
                              onClick={() => setEditingIssueId(null)}
                              className="px-3 py-1 rounded-lg text-xs text-white/30 hover:text-white/60 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Controlled Test Matrix ── */}
          {activeSection === "matrix" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-[#F4A62A]/20 bg-[#F4A62A]/5 p-3">
                <Info className="h-4 w-4 text-[#F4A62A] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#F4A62A]/80 leading-relaxed">
                  These tests must be run manually in the live environment. Mark each pass or fail after completing the test. Results are saved locally in this session.
                </p>
              </div>
              <TestMatrix />
            </div>
          )}

          {/* ── Final Verdict Panel ── */}
          {activeSection === "verdict" && (
            <div className="space-y-4">
              {/* Per-group trust cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { key: "revenue", label: "Revenue Trust" },
                  { key: "attribution", label: "Attribution Trust" },
                  { key: "funnel", label: "Funnel Trust" },
                  { key: "followup", label: "Follow-Up Trust" },
                  { key: "reliability", label: "Reliability Trust" },
                  { key: "continuity", label: "Continuity Trust" },
                  { key: "security", label: "Security Trust" },
                ].map(({ key, label }) => {
                  const g = verdictByGroup[key];
                  return (
                    <div key={key} data-testid={`card-verdict-${key}`} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                      <p className="text-xs text-white/40 mb-2">{label}</p>
                      <VerdictCard verdict={g?.verdict === "—" ? null : g?.verdict ?? null} />
                      {g && g.pass + g.fail + g.warn > 0 && (
                        <p className="text-xs text-white/30 mt-1">{g.pass} pass · {g.fail} fail · {g.warn} warn</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Overall verdict */}
              <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-center space-y-3">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Overall Verdict</h3>
                <div className="text-2xl font-bold">
                  <VerdictCard verdict={latestRun?.overallVerdict ?? null} />
                </div>
                {latestRun?.summary && (
                  <p className="text-xs text-white/40 leading-relaxed max-w-md mx-auto">{latestRun.summary}</p>
                )}
                <div className="flex justify-center gap-6 pt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{latestRun?.checksPassed ?? 0}</p>
                    <p className="text-xs text-white/30">Passed</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${(latestRun?.checksFailed ?? 0) > 0 ? "text-red-400" : "text-white/20"}`}>{latestRun?.checksFailed ?? 0}</p>
                    <p className="text-xs text-white/30">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${(summaryQuery.data?.criticalOpen ?? 0) > 0 ? "text-red-400" : "text-white/20"}`}>{summaryQuery.data?.criticalOpen ?? 0}</p>
                    <p className="text-xs text-white/30">Critical Open</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 text-xs text-white/30">
                  <Clock className="h-3.5 w-3.5" />
                  {latestRun ? `Last run: ${new Date(latestRun.createdAt).toLocaleString()}` : "No audit run yet"}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Phase 49: Autonomous Alerts ── */}
      <div className="mt-6">
        <div className="mb-4 flex justify-end">
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
            onClick={() => runAutonomousChecks.mutate()}
            disabled={runAutonomousChecks.isPending}
            data-testid="button-run-autonomous-checks-audit"
          >
            {runAutonomousChecks.isPending ? "Running…" : "Run Autonomous Checks"}
          </button>
        </div>
        <AutonomousAlertsPanel
          rows={autonomousAlertsQ.data || []}
          onUpdate={(id, status) => patchAlert.mutate({ id, status })}
        />
      </div>
    </div>
  );
}
