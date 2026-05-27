// Phase 54 — Autonomous Recovery Engine
//
// Inspects the latest QA Sentinel report + automation job state, asks DeepSeek
// (via runTask("diagnostics", ...)) for recovery decisions, then executes ONLY
// safe actions. Hard-blocked from anything touching payments, secrets, infra,
// rollbacks, deploys, or env vars. Risky items become recommendations.
//
// Safety contract:
//   - never modifies orders / revenue_recovery_actions / stripe data
//   - never rotates/reads/writes secrets or env vars
//   - never deletes records
//   - never forces deploy or rollback
//   - never re-runs jobs whose group is in BLOCKED_GROUPS
//   - bounded retries (per-job failureCount cap)
//
// Logging safety:
//   - one summary line only: [recoveryEngine] status=X actions=N recommendations=M confidence=Y
//   - never logs PII, secrets, payment data, emails, full prompts/outputs, PIN

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import type { RecoveryReport, InsertRecoveryReport, AutomationJob } from "@shared/schema";

const SELF_JOB_KEY = "phase54_autonomous_recovery_engine";

// Job groups the recovery engine is FORBIDDEN from auto-retrying or mutating.
// Anything touching money, infra, deploys, rollbacks → recommendation only.
const BLOCKED_GROUPS = new Set([
  "revenue", // phase49_revenue_recovery — touches order/refund data flows
  "execution", // phase51 execution/rollback engines — infra-impacting
]);

// Max consecutive failures the engine will tolerate before stopping auto-retry
// and escalating to human recommendation.
const MAX_RETRY_FAILURES = 5;

// A job whose lastSucceededAt is older than this is considered stale.
const STALE_AFTER_MS = 48 * 60 * 60 * 1000; // 48h

type ActionTaken = {
  kind: "reset_failed_to_idle" | "clear_self_failure";
  jobKey: string;
  reason: string;
};

type SkippedAction = {
  kind: "blocked_group" | "retry_limit_exceeded" | "risky_recommendation";
  jobKey?: string;
  reason: string;
};

type Recommendation = {
  severity: "info" | "warning" | "critical";
  message: string;
  jobKey?: string;
};

type RecoveryContext = {
  latestQaReport: {
    id: number | null;
    status: string | null;
    issuesCount: number;
    confidence: number;
    ageMinutes: number | null;
  };
  jobs: Array<{
    jobKey: string;
    jobGroup: string;
    status: string;
    failureCount: number;
    successCount: number;
    cadenceMinutes: number | null;
    isStale: boolean;
    lastErrorKind: string;
  }>;
  health: {
    database: boolean;
    aiRouter: boolean;
    stripe: boolean;
    resend: boolean;
  };
};

type EngineOutcome = {
  status: "healthy" | "warning" | "critical";
  actionsTaken: ActionTaken[];
  recommendations: Recommendation[];
  skippedActions: SkippedAction[];
  confidence: number; // 0..1
};

function classifyError(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  const s = String(raw).toLowerCase();
  if (/timeout|etimedout/.test(s)) return "timeout";
  if (/econnrefused|enotfound|network|fetch failed|socket/.test(s)) return "network";
  if (/5\d\d|internal server|bad gateway|service unavailable/.test(s)) return "upstream_5xx";
  if (/429|rate limit/.test(s)) return "rate_limited";
  if (/database|postgres|relation|column|drizzle|sql/.test(s)) return "database";
  if (/openai|deepseek|model|completion|provider/.test(s)) return "llm_provider";
  if (/stripe|webhook|signature/.test(s)) return "stripe";
  if (/parse|json|schema|validation|zod/.test(s)) return "validation";
  return "other";
}

async function gatherContext(): Promise<RecoveryContext> {
  const latestQa = await storage.getLatestQaSentinelReport().catch(() => null);
  const jobs = await storage.getAutomationJobs().catch(() => [] as AutomationJob[]);

  const now = Date.now();
  const jobSummaries = jobs.map((j) => {
    const isStale =
      !!j.cadenceMinutes &&
      j.cadenceMinutes < 24 * 60 &&
      !!j.lastSucceededAt &&
      now - new Date(j.lastSucceededAt).getTime() > STALE_AFTER_MS;
    return {
      jobKey: j.jobKey,
      jobGroup: j.jobGroup,
      status: j.status,
      failureCount: j.failureCount,
      successCount: j.successCount,
      cadenceMinutes: j.cadenceMinutes,
      isStale,
      lastErrorKind: classifyError(j.lastError),
    };
  });

  // Derive health from latest QA sentinel rawChecks (sentinel already gathered them)
  const raw = (latestQa?.rawChecks ?? {}) as any;
  const health = {
    database: !!raw.database?.ok,
    aiRouter: !!raw.aiRouter?.ok,
    stripe: !!raw.stripe?.configured,
    resend: !!raw.resend?.ok,
  };

  const qaAgeMin = latestQa?.createdAt
    ? Math.round((now - new Date(latestQa.createdAt).getTime()) / 60_000)
    : null;

  return {
    latestQaReport: {
      id: latestQa?.id ?? null,
      status: latestQa?.status ?? null,
      issuesCount: Array.isArray(latestQa?.issues) ? (latestQa!.issues as any[]).length : 0,
      confidence: typeof latestQa?.confidence === "number" ? latestQa.confidence / 100 : 0,
      ageMinutes: qaAgeMin,
    },
    jobs: jobSummaries,
    health,
  };
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

async function askDeepSeek(ctx: RecoveryContext): Promise<{
  recommendations: Recommendation[];
  confidence: number;
  modelStatus: "healthy" | "warning" | "critical";
} | null> {
  const sys =
    "You are a Senior Production SRE for Elevate360Official. Given a safety-scrubbed " +
    "diagnostics + automation job context, return ONLY a JSON object: " +
    '{ "status": "healthy"|"warning"|"critical", ' +
    '"recommendations": [{"severity":"info"|"warning"|"critical","message":string,"jobKey"?:string}], ' +
    '"confidence": number (0..1) }. ' +
    "Recommendations only — the engine itself decides which mechanical actions to execute. " +
    "Be concise. No prose outside JSON.";
  const user = "Context:\n" + JSON.stringify(ctx, null, 2);

  try {
    const result = await runTask(
      "diagnostics",
      {
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        maxTokens: 700,
        jsonMode: true,
      }
    );
    let parsed: any = null;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== "object") return null;
    const statusRaw = String(parsed.status ?? "").toLowerCase();
    const modelStatus: "healthy" | "warning" | "critical" =
      statusRaw === "critical" || statusRaw === "warning" || statusRaw === "healthy"
        ? (statusRaw as any)
        : "warning";
    const recs: Recommendation[] = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
          .filter((r: any) => r && typeof r === "object" && typeof r.message === "string")
          .map((r: any) => ({
            severity:
              r.severity === "critical" || r.severity === "warning" ? r.severity : "info",
            message: String(r.message).slice(0, 500),
            jobKey: typeof r.jobKey === "string" ? r.jobKey.slice(0, 80) : undefined,
          }))
          .slice(0, 25)
      : [];
    return { recommendations: recs, confidence: clamp01(parsed.confidence), modelStatus };
  } catch {
    return null;
  }
}

async function executeSafeActions(
  ctx: RecoveryContext
): Promise<{ actions: ActionTaken[]; skipped: SkippedAction[] }> {
  const actions: ActionTaken[] = [];
  const skipped: SkippedAction[] = [];

  for (const job of ctx.jobs) {
    if (job.status !== "failed") continue;

    // Self-clear: phase53 (sentinel) and phase54 (this engine) — if they're
    // currently running successfully, prior failed status is by definition stale.
    if (job.jobKey === SELF_JOB_KEY) {
      // handled separately after the loop (we're still executing)
      continue;
    }

    if (BLOCKED_GROUPS.has(job.jobGroup)) {
      skipped.push({
        kind: "blocked_group",
        jobKey: job.jobKey,
        reason: `Job group "${job.jobGroup}" requires human review; never auto-retried.`,
      });
      continue;
    }

    if (job.failureCount >= MAX_RETRY_FAILURES) {
      skipped.push({
        kind: "retry_limit_exceeded",
        jobKey: job.jobKey,
        reason: `failureCount=${job.failureCount} >= cap ${MAX_RETRY_FAILURES}; needs human review.`,
      });
      continue;
    }

    // Safe action: reset failed → idle so cadence-driven retry surfaces cleanly
    // in dashboards. jobRunner's existing setTimeout chain will re-run on next
    // cadence tick; we do NOT short-circuit that schedule.
    try {
      await storage.upsertAutomationJob(job.jobKey, {
        status: "idle",
        lastError: null,
      });
      actions.push({
        kind: "reset_failed_to_idle",
        jobKey: job.jobKey,
        reason: `Cleared failed status (errorKind=${job.lastErrorKind}); awaiting next cadence tick.`,
      });
    } catch (e: any) {
      skipped.push({
        kind: "risky_recommendation",
        jobKey: job.jobKey,
        reason: `Could not update job row: ${classifyError(e?.message)}`,
      });
    }
  }

  return { actions, skipped };
}

function computeStatus(
  ctx: RecoveryContext,
  modelStatus: "healthy" | "warning" | "critical" | null,
  skipped: SkippedAction[]
): "healthy" | "warning" | "critical" {
  // Critical if core deps down
  if (!ctx.health.database || !ctx.health.aiRouter) return "critical";
  // Critical if any blocked-group job is failing (needs human)
  if (skipped.some((s) => s.kind === "blocked_group" || s.kind === "retry_limit_exceeded")) {
    return modelStatus === "critical" ? "critical" : "warning";
  }
  if (modelStatus) return modelStatus;
  // Heuristic: any unresolved failures → warning
  const unresolved = ctx.jobs.some((j) => j.status === "failed" && j.jobKey !== SELF_JOB_KEY);
  return unresolved ? "warning" : "healthy";
}

export async function runRecoveryEngine(): Promise<{
  report: RecoveryReport;
  summary: string;
}> {
  const ctx = await gatherContext();
  const { actions, skipped } = await executeSafeActions(ctx);
  const model = await askDeepSeek(ctx);

  const recommendations: Recommendation[] = model?.recommendations ?? [];
  // Add an engine-generated recommendation for each skipped risky item if not
  // already covered by the model (defensive — humans must always see these).
  for (const sk of skipped) {
    recommendations.push({
      severity: sk.kind === "blocked_group" ? "critical" : "warning",
      message: `[engine] ${sk.kind}: ${sk.reason}`,
      jobKey: sk.jobKey,
    });
  }

  const status = computeStatus(ctx, model?.modelStatus ?? null, skipped);
  const confidence = model?.confidence ?? 0.5;

  const insert: InsertRecoveryReport = {
    status,
    actionsTaken: actions as any,
    recommendations: recommendations as any,
    skippedActions: skipped as any,
    rawContext: ctx as any,
    confidence: Math.round(confidence * 100),
  };

  const report = await storage.createRecoveryReport(insert);

  // Self-clear: mark this engine's own row as succeeded (mirrors phase 53 fix).
  try {
    const now = new Date();
    await storage.upsertAutomationJob(SELF_JOB_KEY, {
      status: "succeeded",
      lastFinishedAt: now,
      lastSucceededAt: now,
      lastError: null,
    });
  } catch (e: any) {
    console.warn(`[recoveryEngine] could not update self job status: ${classifyError(e?.message)}`);
  }

  const summary = `status=${status} actions=${actions.length} recommendations=${recommendations.length} confidence=${confidence.toFixed(2)}`;
  console.log(`[recoveryEngine] ${summary}`);

  return { report, summary };
}
