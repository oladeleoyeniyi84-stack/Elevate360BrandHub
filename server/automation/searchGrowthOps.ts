// Phase 72.5 — Search Growth Operations scheduled jobs.
//
// Runs on the existing Elevate360 job-runner (automation_jobs persistence,
// setTimeout chains, per-run logs). Two jobs:
//   phase72_5_daily_gsc_sync    — every 24h; source="scheduled"
//   phase72_5_weekly_seo_audit  — every 7d; audits the same approved
//                                 canonical public routes as Phase 72.4
//
// Failure control:
// - The DB-enforced single-running-sync guard is reused: a concurrent sync
//   makes the job SKIP cleanly (never a retry storm).
// - Bounded retries (max 2, spaced) ONLY for transient failures — network,
//   rate-limit, Google 5xx. Configuration, permission, validation and
//   unsupported-capability failures never retry; their category is recorded
//   honestly on the job log and the sync run row.

import { storage } from "../storage";
import { runGscSync, GscSyncConflictError } from "../services/googleSearchConsole";
import { runSeoAudit } from "../services/seoAudit";
import { generateSearchGrowthActions, measureCompletedActions } from "../services/searchGrowthActions";

const TRANSIENT_PREFIXES = ["network_failure", "rate_limited", "google_unavailable"];
const MAX_TRANSIENT_RETRIES = 2;
const RETRY_DELAY_MS = 30_000;

export function isTransientGscFailure(text: string | null | undefined): boolean {
  if (!text) return false;
  return TRANSIENT_PREFIXES.some((p) => text.startsWith(p) || text.includes(` ${p}:`) || text.includes(`| ${p}`) || new RegExp(`(^|[ |])${p}:`).test(text));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runScheduledGscSync(): Promise<{ summary: string; meta?: Record<string, unknown> }> {
  // Skip safely if another sync holds the single-running slot.
  if (await storage.hasActiveGscSyncRun()) {
    return { summary: "skipped — a Search Console sync is already running" };
  }

  let attempt = 0;
  // Every attempt is recorded in gsc_sync_runs by runGscSync itself.
  for (;;) {
    attempt++;
    let result;
    try {
      result = await runGscSync({ scheduled: true });
    } catch (err) {
      if (err instanceof GscSyncConflictError) {
        return { summary: "skipped — lost the single-running-sync slot to a concurrent sync" };
      }
      throw err;
    }

    if (result.status === "success" || result.status === "partial") {
      // Generate remediation actions from the fresh stored data (the service
      // itself anchors strictly on the newest SUCCESSFUL run — after a partial
      // run it regenerates from the last full success, never partial data),
      // and settle any due post-completion measurements.
      const gen = result.status === "success"
        ? await generateSearchGrowthActions({ reason: "scheduled_sync" }).catch((e) => ({ generated: 0, updated: 0, superseded: 0, skippedReason: String(e) }))
        : { generated: 0, updated: 0, superseded: 0, skippedReason: "sync partial — generation deferred to next full success" };
      const measured = await measureCompletedActions().catch(() => 0);
      return {
        summary: `sync ${result.status} (run ${result.runId}); actions: ${gen.generated} new, ${gen.updated} refreshed, ${gen.superseded} superseded; ${measured} measured`,
        meta: { syncRunId: result.runId, status: result.status, attempt, rows: result.rows, generation: gen },
      };
    }
    if (result.status === "not_configured") {
      // Configuration failures never retry.
      return { summary: "not_configured — GSC credentials/property absent; no retry", meta: { syncRunId: result.runId } };
    }

    // status === "error": retry ONLY bounded transient failures.
    const failureText = result.reason ?? Object.values(result.setErrors ?? {}).join(" | ");
    if (isTransientGscFailure(failureText) && attempt <= MAX_TRANSIENT_RETRIES) {
      await sleep(RETRY_DELAY_MS);
      continue;
    }
    // Record the final failure category honestly on the job (throw → jobRunner
    // marks the run failed with this message; the sync run row already holds
    // the classified errorText).
    throw new Error(`gsc sync error after ${attempt} attempt(s): ${String(failureText).slice(0, 300)}`);
  }
}

export async function runScheduledSeoAudit(): Promise<{ summary: string; meta?: Record<string, unknown> }> {
  // runSeoAudit deterministically self-fetches ONLY the approved canonical
  // public routes (STATIC_PATHS + published blog slugs) — never dashboards,
  // APIs, private routes, or external URLs.
  const result = await runSeoAudit();
  return { summary: `seo audit finished`, meta: { result: result as unknown as Record<string, unknown> } };
}
