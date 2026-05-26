// Phase 53 — DeepSeek QA Sentinel
// Backend QA, monitoring, and issue-detection layer. Probes core endpoints,
// inspects automation job state, then asks DeepSeek (via runTask("diagnostics"))
// to analyze the raw results and produce a structured report.
//
// PII / secret safety:
//   - never logs API keys, customer data, payment info, full prompts, or full
//     model outputs
//   - only summary log line: [qaSentinel] status=X issues=N confidence=Y

import { storage } from "../storage";
import { runTask } from "./modelRouter";
import type { InsertQaSentinelReport, QaSentinelReport } from "@shared/schema";

const SELF_JOB_KEY = "phase53_deepseek_qa_sentinel";

const KNOWN_JOB_KEYS = [
  "phase49_revenue_recovery",
  "phase49_content_opportunities",
  "phase49_anomaly_engine",
  "phase49_founder_brief",
  "phase49_monthly_strategy",
  "phase50_source_performance",
  "phase50_funnel_leak_optimizer",
  "phase50_offer_optimizer",
  "phase50_experiment_generator",
  "phase51_execution_engine",
  "phase51_rollback_engine",
  "phase52_reliability_watchdog",
  "phase52_quarterly_strategy",
  "phase53_deepseek_qa_sentinel",
];

type CheckResult = {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  detail?: string;
};

function classifyError(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  const s = String(raw).toLowerCase();
  if (/timeout|timed out|etimedout/.test(s)) return "timeout";
  if (/econnrefused|enotfound|network|fetch failed|socket/.test(s)) return "network";
  if (/401|unauthor/.test(s)) return "auth";
  if (/403|forbidden/.test(s)) return "forbidden";
  if (/404|not found/.test(s)) return "not_found";
  if (/429|rate limit/.test(s)) return "rate_limited";
  if (/5\d\d|internal server|bad gateway|service unavailable/.test(s)) return "upstream_5xx";
  if (/database|postgres|relation|column|drizzle|sql/.test(s)) return "database";
  if (/openai|deepseek|model|completion|provider/.test(s)) return "llm_provider";
  if (/stripe|webhook|signature/.test(s)) return "stripe";
  if (/parse|json|schema|validation|zod/.test(s)) return "validation";
  return "other";
}

type RawChecks = {
  health: { ok: boolean; status?: number; payload?: Record<string, unknown>; detail?: string };
  endpoints: Record<string, CheckResult>;
  stripe: { configured: boolean };
  database: { ok: boolean; detail?: string };
  aiRouter: { ok: boolean; detail?: string; openai?: string; deepseek?: string };
  resend: { ok: boolean; detail?: string };
  automationJobs: {
    total: number;
    succeeded: number;
    failed: number;
    stale: number;
    failingJobs: Array<{ jobKey: string; status: string; lastErrorKind?: string }>;
  };
};

export type QaSentinelOutcome = {
  overallStatus: "healthy" | "warning" | "critical";
  issues: string[];
  recommendedFixes: string[];
  nextActions: string[];
  confidence: number; // 0..1
};

function getBaseUrl(): string {
  const port = process.env.PORT || "5000";
  return `http://127.0.0.1:${port}`;
}

async function probe(
  path: string,
  init: RequestInit = {},
  timeoutMs = 5_000
): Promise<CheckResult & { payload?: any }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "user-agent": "qa-sentinel/1.0", ...(init.headers ?? {}) },
    });
    const latencyMs = Date.now() - start;
    let payload: any = undefined;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        payload = await res.json();
      } catch {
        /* ignore parse failure */
      }
    }
    return { ok: res.ok, status: res.status, latencyMs, payload };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, detail: e?.name === "AbortError" ? "timeout" : (e?.message ?? "fetch failed") };
  } finally {
    clearTimeout(timer);
  }
}

async function gatherRawChecks(): Promise<RawChecks> {
  // Probe /api/health (provides db, ai, resend, stripe, memory)
  const healthRes = await probe("/api/health");
  const healthPayload = (healthRes as any).payload ?? {};
  const subChecks = healthPayload.checks ?? {};

  // Lightweight endpoint probes (do NOT trigger LLM calls)
  // Note: /api/chat is POSTed with empty body — we expect 400 (validation) to prove the route is mounted.
  // A 200 here would be unexpected (would mean validation regressed); 5xx indicates a real failure.
  const offersRes = await probe("/api/offers");
  const chatRes = await probe("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const dashboardAuthRes = await probe("/api/dashboard/leads"); // expect 401 unauth → proves protected route mounted

  const endpoints: Record<string, CheckResult> = {
    "/api/offers": {
      ok: offersRes.ok,
      status: offersRes.status,
      latencyMs: offersRes.latencyMs,
      detail: offersRes.detail,
    },
    "/api/chat": {
      // 400 (bad payload) or 200 both prove the route exists; only 5xx / network failure = bad
      ok: typeof chatRes.status === "number" && chatRes.status < 500,
      status: chatRes.status,
      latencyMs: chatRes.latencyMs,
      detail: chatRes.detail ?? (chatRes.status === 400 ? "route mounted (validation rejects empty body, expected)" : undefined),
    },
    "/api/dashboard/leads": {
      // Healthy iff the protected route returns 401 (auth enforced).
      // Network failure → !ok via detail; any other status → unexpected.
      ok: !dashboardAuthRes.detail && dashboardAuthRes.status === 401,
      status: dashboardAuthRes.status,
      latencyMs: dashboardAuthRes.latencyMs,
      detail: dashboardAuthRes.detail
        ? dashboardAuthRes.detail
        : dashboardAuthRes.status === 401
          ? "auth enforced (expected)"
          : `unexpected status ${dashboardAuthRes.status}`,
    },
  };

  // Automation job state (from DB)
  let jobsTotal = 0,
    jobsSucceeded = 0,
    jobsFailed = 0,
    jobsStale = 0;
  const failingJobs: Array<{ jobKey: string; status: string; lastErrorKind?: string }> = [];
  const staleMs = 48 * 60 * 60 * 1000; // 48h
  const now = Date.now();
  for (const key of KNOWN_JOB_KEYS) {
    const job = await storage.getAutomationJob(key).catch(() => null);
    if (!job) continue;
    jobsTotal += 1;
    if (job.status === "succeeded") jobsSucceeded += 1;
    if (job.status === "failed") {
      // The QA sentinel is currently executing this very check — its own prior
      // "failed" status is by definition stale (we're running successfully now).
      // Skip self to avoid every report flagging the previous self-failure.
      if (job.jobKey === SELF_JOB_KEY) {
        jobsSucceeded += 1; // re-count as succeeded for accurate totals
        continue;
      }
      jobsFailed += 1;
      // Do NOT forward raw lastError to LLM or persist it here — it may contain
      // tokens, emails, URLs, stack traces, or upstream provider error strings.
      // Classify into a coarse category instead.
      failingJobs.push({
        jobKey: job.jobKey,
        status: job.status,
        lastErrorKind: classifyError(job.lastError),
      });
    }
    // Stale = job hasn't succeeded in >48h despite cadence < 24h
    if (
      job.cadenceMinutes &&
      job.cadenceMinutes < 24 * 60 &&
      job.lastSucceededAt &&
      now - new Date(job.lastSucceededAt).getTime() > staleMs
    ) {
      jobsStale += 1;
    }
  }

  return {
    health: {
      ok: healthRes.ok,
      status: healthRes.status,
      payload: subChecks,
      detail: healthRes.detail,
    },
    endpoints,
    stripe: { configured: !!subChecks.stripe?.ok },
    database: { ok: !!subChecks.database?.ok, detail: subChecks.database?.detail },
    aiRouter: {
      ok: !!subChecks.ai?.ok,
      detail: subChecks.ai?.detail,
      openai: subChecks.ai?.openai,
      deepseek: subChecks.ai?.deepseek,
    },
    resend: { ok: !!subChecks.resend?.ok, detail: subChecks.resend?.detail },
    automationJobs: {
      total: jobsTotal,
      succeeded: jobsSucceeded,
      failed: jobsFailed,
      stale: jobsStale,
      failingJobs,
    },
  };
}

function heuristicFallback(checks: RawChecks): QaSentinelOutcome {
  const issues: string[] = [];
  const fixes: string[] = [];
  const next: string[] = [];

  if (!checks.health.ok) {
    issues.push(`/api/health returned non-2xx (status=${checks.health.status ?? "n/a"})`);
    fixes.push("Investigate /api/health sub-checks for failing dependency");
  }
  if (!checks.database.ok) {
    issues.push("Database ping failed");
    fixes.push("Verify DATABASE_URL and Postgres availability");
    next.push("Check Render Postgres dashboard");
  }
  if (!checks.aiRouter.ok) {
    issues.push("AI router has no configured provider");
    fixes.push("Set OPENAI_API_KEY and/or DEEPSEEK_API_KEY");
  }
  if (!checks.resend.ok) {
    issues.push("Resend not configured");
    fixes.push("Set RESEND_API_KEY env var");
  }
  if (!checks.stripe.configured) {
    issues.push("Stripe not configured (STRIPE_SECRET_KEY missing)");
    fixes.push("Set STRIPE_SECRET_KEY in Render env vars");
  }
  for (const [path, r] of Object.entries(checks.endpoints)) {
    if (!r.ok) {
      issues.push(`Endpoint ${path} unhealthy (status=${r.status ?? "n/a"}${r.detail ? `, ${r.detail}` : ""})`);
    }
  }
  if (checks.automationJobs.failed > 0) {
    issues.push(`${checks.automationJobs.failed} automation job(s) in failed state`);
    fixes.push("Review failing jobs in /api/automation/jobs and inspect logs");
  }
  if (checks.automationJobs.stale > 0) {
    issues.push(`${checks.automationJobs.stale} automation job(s) appear stale (>48h since last success)`);
  }

  let overall: QaSentinelOutcome["overallStatus"] = "healthy";
  if (issues.length > 0) overall = "warning";
  if (
    !checks.database.ok ||
    !checks.aiRouter.ok ||
    !checks.health.ok ||
    checks.automationJobs.failed >= 3
  )
    overall = "critical";

  return {
    overallStatus: overall,
    issues,
    recommendedFixes: fixes,
    nextActions: next,
    confidence: 0.5, // heuristic only
  };
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function normalizeOutcome(parsed: any, fallback: QaSentinelOutcome): QaSentinelOutcome {
  if (!parsed || typeof parsed !== "object") return fallback;
  const statusRaw = String(parsed.overallStatus ?? parsed.status ?? "").toLowerCase();
  const overallStatus: QaSentinelOutcome["overallStatus"] =
    statusRaw === "critical" || statusRaw === "warning" || statusRaw === "healthy"
      ? (statusRaw as QaSentinelOutcome["overallStatus"])
      : fallback.overallStatus;
  const toStringArr = (v: any): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).slice(0, 50) : [];
  return {
    overallStatus,
    issues: toStringArr(parsed.issues),
    recommendedFixes: toStringArr(parsed.recommendedFixes ?? parsed.fixes),
    nextActions: toStringArr(parsed.nextActions ?? parsed.next_actions),
    confidence: clamp01(parsed.confidence),
  };
}

async function analyzeWithDeepSeek(checks: RawChecks): Promise<QaSentinelOutcome> {
  const fallback = heuristicFallback(checks);
  const systemMsg =
    "You are a Senior Production SRE for the Elevate360Official platform. " +
    "Analyze the JSON diagnostic snapshot and return ONLY a JSON object with keys: " +
    'overallStatus ("healthy"|"warning"|"critical"), issues (string[]), ' +
    "recommendedFixes (string[]), nextActions (string[]), confidence (0..1 number). " +
    "Be concise. Do not include any prose outside the JSON.";
  const userMsg =
    "Diagnostic snapshot:\n" +
    JSON.stringify(checks, null, 2) +
    "\n\nReturn the JSON object now.";

  try {
    const result = await runTask(
      "diagnostics",
      {
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: userMsg },
        ],
        temperature: 0.2,
        maxTokens: 800,
        jsonMode: true,
      }
    );
    let parsed: any = null;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // JSON-mode should always return valid JSON; if not, drop to fallback
      parsed = null;
    }
    return normalizeOutcome(parsed, fallback);
  } catch {
    // Model unavailable — heuristic fallback already computed
    return fallback;
  }
}

export async function runQaSentinel(): Promise<{
  report: QaSentinelReport;
  summary: string;
}> {
  const checks = await gatherRawChecks();
  const outcome = await analyzeWithDeepSeek(checks);

  const insert: InsertQaSentinelReport = {
    status: outcome.overallStatus,
    issues: outcome.issues as any,
    recommendedFixes: outcome.recommendedFixes as any,
    nextActions: outcome.nextActions as any,
    confidence: Math.round(outcome.confidence * 100), // store as 0..100 int
    rawChecks: checks as any,
  };

  const report = await storage.createQaSentinelReport(insert);

  // Mark the sentinel's own automation_jobs row as succeeded so manual runs
  // also clear any stale "failed" status (e.g. from a transient earlier
  // scheduled-run failure). Only runs when report creation succeeded — if
  // runQaSentinel throws upstream of this point, jobRunner's normal failure
  // path still records the real failure. Best-effort: never let bookkeeping
  // failures bubble up and break the API response.
  try {
    const now = new Date();
    await storage.upsertAutomationJob(SELF_JOB_KEY, {
      status: "succeeded",
      lastFinishedAt: now,
      lastSucceededAt: now,
      lastError: null,
    });
  } catch (e: any) {
    console.warn(`[qaSentinel] could not update self job status: ${e?.message ?? "unknown"}`);
  }

  const summary = `status=${outcome.overallStatus} issues=${outcome.issues.length} confidence=${outcome.confidence.toFixed(2)}`;
  console.log(`[qaSentinel] ${summary}`);

  return { report, summary };
}
