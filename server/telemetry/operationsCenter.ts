// Phase 55 — Founder AI Operations Center · telemetry aggregation
//
// Single-call snapshot powering the founder-grade /ops dashboard. Pulls from
// existing storage layer + AI router status + (optionally) lightweight Stripe
// configuration probe. No secrets, no PII, no full prompts/outputs are ever
// returned in the payload.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { getAIStatus } from "../ai/modelRouter";
import { getMemoryStats } from "../ai/memory";
import { isStripeConfigured } from "../stripeClient";
import { db } from "../db";
import { sql } from "drizzle-orm";
import type { AutomationJob, AutomationJobLog } from "@shared/schema";

// Belt-and-suspenders scrubber for free-text fields sourced from prior model
// outputs (sentinel issues, recovery recommendations). Strips anything that
// looks like a secret, token, email, or URL with query string before we either
// return the payload to the frontend or forward it to the briefing LLM.
const SCRUB_PATTERNS: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/https?:\/\/\S*\?\S+/g, "[redacted:url-with-query]"],
  [/DASHBOARD_PIN[^\s]*/gi, "[redacted:pin]"],
  [/(OPENAI|DEEPSEEK|RESEND|STRIPE)_[A-Z_]*KEY[^\s]*/g, "[redacted:key]"],
];
function scrub(s: string | null | undefined, maxLen = 280): string {
  if (!s) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB_PATTERNS) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

export type OpsOverview = {
  generatedAt: string;
  health: {
    overall: "healthy" | "degraded" | "critical";
    database: { ok: boolean; latencyMs: number | null };
    aiRouter: { ok: boolean; premium: string; automation: string };
    openai: { ok: boolean };
    deepseek: { ok: boolean };
    stripe: { ok: boolean };
    resend: { ok: boolean };
    memory: { activeSessions: number };
  };
  qaSentinel: {
    latestId: number | null;
    status: string | null;
    issuesCount: number;
    confidence: number;
    ageMinutes: number | null;
    recentIssues: string[];
  };
  recoveryEngine: {
    latestId: number | null;
    status: string | null;
    actionsCount: number;
    recommendationsCount: number;
    skippedCount: number;
    confidence: number;
    ageMinutes: number | null;
    topRecommendations: Array<{ severity: string; message: string; jobKey?: string }>;
  };
  automation: {
    total: number;
    succeeded: number;
    failed: number;
    running: number;
    stale: number;
    byGroup: Record<string, { total: number; failed: number }>;
    failingJobs: Array<{ jobKey: string; jobGroup: string; failureCount: number }>;
    upcoming: Array<{ jobKey: string; nextRunInMinutes: number }>;
  };
  activity: {
    contactsLast24h: number;
    subscribersLast24h: number;
    visitsLast24h: number;
  };
};

export type TimeseriesPoint = {
  bucket: string; // ISO hour
  succeeded: number;
  failed: number;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function isStale(job: AutomationJob): boolean {
  if (!job.cadenceMinutes || job.cadenceMinutes >= 24 * 60) return false;
  if (!job.lastSucceededAt) return false;
  return Date.now() - new Date(job.lastSucceededAt).getTime() > 48 * HOUR_MS;
}

async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number | null }> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: null };
  }
}

export async function buildOpsOverview(): Promise<OpsOverview> {
  const [database, jobs, latestQa, latestRecovery, captureTotals, visitTotals] =
    await Promise.all([
      pingDatabase(),
      storage.getAutomationJobs().catch(() => [] as AutomationJob[]),
      storage.getLatestQaSentinelReport().catch(() => null),
      storage.getLatestRecoveryReport().catch(() => null),
      // Phase 69 — SQL COUNT; previously loaded whole contact/subscriber tables.
      storage.getCaptureTotals().catch(() => ({
        contacts: { total: 0, last7d: 0, last24h: 0, unreplied: 0 },
        subscribers: { total: 0, last7d: 0, last24h: 0 },
      })),
      // SQL COUNT — loading all page-view rows here caused prod OOM events.
      storage.getVisitTotals().catch(() => ({ total: 0, last7d: 0, last24h: 0 })),
    ]);

  const aiStatus = getAIStatus();
  const stripeOk = isStripeConfigured();
  const resendOk = !!process.env.RESEND_API_KEY;
  const memStats = getMemoryStats();

  const aiRouterOk =
    aiStatus.openai === "configured" || aiStatus.deepseek === "configured";

  // Automation aggregation
  const byGroup: Record<string, { total: number; failed: number }> = {};
  let succeeded = 0,
    failed = 0,
    running = 0,
    stale = 0;
  const failingJobs: Array<{ jobKey: string; jobGroup: string; failureCount: number }> = [];
  const upcoming: Array<{ jobKey: string; nextRunInMinutes: number }> = [];

  for (const j of jobs) {
    byGroup[j.jobGroup] ??= { total: 0, failed: 0 };
    byGroup[j.jobGroup].total += 1;
    if (j.status === "succeeded") succeeded += 1;
    if (j.status === "failed") {
      failed += 1;
      byGroup[j.jobGroup].failed += 1;
      failingJobs.push({
        jobKey: j.jobKey,
        jobGroup: j.jobGroup,
        failureCount: j.failureCount,
      });
    }
    if (j.status === "running") running += 1;
    if (isStale(j)) stale += 1;
    if (j.nextRunAt) {
      const mins = Math.round((new Date(j.nextRunAt).getTime() - Date.now()) / 60_000);
      if (mins > 0) upcoming.push({ jobKey: j.jobKey, nextRunInMinutes: mins });
    }
  }
  upcoming.sort((a, b) => a.nextRunInMinutes - b.nextRunInMinutes);

  // Health rollup
  let overall: "healthy" | "degraded" | "critical" = "healthy";
  if (!database.ok || !aiRouterOk) overall = "critical";
  else if (!stripeOk || !resendOk || failed > 0 || stale > 0) overall = "degraded";

  const now = Date.now();
  const qaAgeMin = latestQa?.createdAt
    ? Math.round((now - new Date(latestQa.createdAt).getTime()) / 60_000)
    : null;
  const recAgeMin = latestRecovery?.createdAt
    ? Math.round((now - new Date(latestRecovery.createdAt).getTime()) / 60_000)
    : null;

  const recRecs = Array.isArray(latestRecovery?.recommendations)
    ? (latestRecovery!.recommendations as any[])
    : [];

  return {
    generatedAt: new Date().toISOString(),
    health: {
      overall,
      database,
      aiRouter: {
        ok: aiRouterOk,
        premium: aiStatus.defaultPremiumModel,
        automation: aiStatus.defaultAutomationModel,
      },
      openai: { ok: aiStatus.openai === "configured" },
      deepseek: { ok: aiStatus.deepseek === "configured" },
      stripe: { ok: stripeOk },
      resend: { ok: resendOk },
      memory: { activeSessions: memStats.activeSessions },
    },
    qaSentinel: {
      latestId: latestQa?.id ?? null,
      status: latestQa?.status ?? null,
      issuesCount: Array.isArray(latestQa?.issues) ? (latestQa!.issues as any[]).length : 0,
      confidence: typeof latestQa?.confidence === "number" ? latestQa.confidence : 0,
      ageMinutes: qaAgeMin,
      recentIssues: Array.isArray(latestQa?.issues)
        ? (latestQa!.issues as any[]).slice(0, 5).map((s) => scrub(String(s)))
        : [],
    },
    recoveryEngine: {
      latestId: latestRecovery?.id ?? null,
      status: latestRecovery?.status ?? null,
      actionsCount: Array.isArray(latestRecovery?.actionsTaken)
        ? (latestRecovery!.actionsTaken as any[]).length
        : 0,
      recommendationsCount: recRecs.length,
      skippedCount: Array.isArray(latestRecovery?.skippedActions)
        ? (latestRecovery!.skippedActions as any[]).length
        : 0,
      confidence:
        typeof latestRecovery?.confidence === "number" ? latestRecovery.confidence : 0,
      ageMinutes: recAgeMin,
      topRecommendations: recRecs.slice(0, 5).map((r) => ({
        severity: String(r.severity ?? "info"),
        message: scrub(r.message),
        jobKey: typeof r.jobKey === "string" ? r.jobKey.slice(0, 80) : undefined,
      })),
    },
    automation: {
      total: jobs.length,
      succeeded,
      failed,
      running,
      stale,
      byGroup,
      failingJobs: failingJobs.slice(0, 10),
      upcoming: upcoming.slice(0, 5),
    },
    activity: {
      contactsLast24h: captureTotals.contacts.last24h,
      subscribersLast24h: captureTotals.subscribers.last24h,
      visitsLast24h: visitTotals.last24h,
    },
  };
}

export async function buildJobTimeseries(hours = 24): Promise<TimeseriesPoint[]> {
  const since = new Date(Date.now() - hours * HOUR_MS);
  const rows = (await db.execute(sql`
    SELECT
      date_trunc('hour', finished_at) AS bucket,
      status,
      COUNT(*)::int AS n
    FROM automation_job_logs
    WHERE finished_at >= ${since.toISOString()}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `)) as any;

  const data: any[] = Array.isArray(rows) ? rows : (rows?.rows ?? []);
  const buckets = new Map<string, { succeeded: number; failed: number }>();
  // Pre-fill bucket slots so the chart shows continuous hours.
  for (let i = hours - 1; i >= 0; i--) {
    const d = new Date(Math.floor((Date.now() - i * HOUR_MS) / HOUR_MS) * HOUR_MS);
    buckets.set(d.toISOString(), { succeeded: 0, failed: 0 });
  }
  for (const r of data) {
    const key = new Date(r.bucket).toISOString();
    const entry = buckets.get(key) ?? { succeeded: 0, failed: 0 };
    if (r.status === "succeeded") entry.succeeded += Number(r.n) || 0;
    else if (r.status === "failed") entry.failed += Number(r.n) || 0;
    buckets.set(key, entry);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([bucket, v]) => ({ bucket, ...v }));
}

// AI-generated founder briefing — short, plain-language summary of the
// operational state. Uses DeepSeek (diagnostics task). The full overview is
// sent as the prompt, but the overview itself is already PII/secret-free.
export async function generateFounderBriefing(
  overview: OpsOverview
): Promise<{ briefing: string; provider: string; latencyMs: number }> {
  const sys =
    "You are Chief of Staff for Elevate360Official's founder. Given an operational " +
    "snapshot, write a concise founder-facing briefing in <= 6 short bullets. Cover: " +
    "(1) overall production health in one line, (2) any active issues with severity, " +
    "(3) what the recovery engine did or recommended, (4) one forward-looking suggestion. " +
    "No code, no JSON, no apologies, no fluff. Plain English. Founder voice: confident, calm, decisive.";
  const user = "Operational snapshot:\n" + JSON.stringify(overview, null, 2);
  const start = Date.now();
  // Hard-lock provider: founder briefings must always use DeepSeek (automation
  // layer), never fall back to OpenAI. If DeepSeek is unavailable the call
  // fails closed — better no briefing than a surprise provider switch.
  const result = await runTask(
    "diagnostics",
    {
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      maxTokens: 500,
    },
    { providerOverride: "deepseek" }
  );
  return {
    briefing: result.content.trim().slice(0, 4000),
    provider: result.provider,
    latencyMs: Date.now() - start,
  };
}
