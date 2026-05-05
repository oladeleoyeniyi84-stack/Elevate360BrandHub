import { storage } from "../storage";
import { computeMaturityScore } from "../services/maturityScoring";
import { db } from "../db";
import { sql } from "drizzle-orm";

const STALE_THRESHOLD_HOURS = 48;

// Prune bloat-prone tables to keep the DB healthy.
// Runs inside the reliability watchdog (every 6h).
async function pruneOldRecords(): Promise<void> {
  try {
    // Keep latest 200 digest_reports
    await db.execute(sql`
      DELETE FROM digest_reports
      WHERE id NOT IN (
        SELECT id FROM digest_reports ORDER BY generated_at DESC NULLS LAST LIMIT 200
      )
    `);
    // Keep latest 50 quarterly_strategy_reports
    await db.execute(sql`
      DELETE FROM quarterly_strategy_reports
      WHERE id NOT IN (
        SELECT id FROM quarterly_strategy_reports ORDER BY created_at DESC NULLS LAST LIMIT 50
      )
    `);
    // Keep latest 1000 automation_job_logs
    await db.execute(sql`
      DELETE FROM automation_job_logs
      WHERE id NOT IN (
        SELECT id FROM automation_job_logs ORDER BY id DESC LIMIT 1000
      )
    `);
    // Keep latest 500 page_views
    await db.execute(sql`
      DELETE FROM page_views
      WHERE id NOT IN (
        SELECT id FROM page_views ORDER BY id DESC LIMIT 500
      )
    `);
    // Keep latest 200 click_events
    await db.execute(sql`
      DELETE FROM click_events
      WHERE id NOT IN (
        SELECT id FROM click_events ORDER BY id DESC LIMIT 200
      )
    `);
    console.log("[reliabilityWatchdog] pruneOldRecords complete");
  } catch (err: any) {
    console.warn("[reliabilityWatchdog] pruneOldRecords error:", err?.message);
  }
}

export async function runReliabilityWatchdog(): Promise<{
  healthSnapshot: any;
  staleJobs: string[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const staleJobs: string[] = [];

  // 1. Check stale jobs
  const jobs = await storage.getAutomationJobs();
  const staleThreshold = Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000;

  for (const job of jobs) {
    if (job.lastStartedAt && new Date(job.lastStartedAt).getTime() < staleThreshold) {
      staleJobs.push(job.jobKey);
      warnings.push(`Job ${job.jobKey} has not run in over ${STALE_THRESHOLD_HOURS}h`);
    }
    if (job.status === "failed") {
      warnings.push(`Job ${job.jobKey} is in FAILED state`);
    }
  }

  // 2. Check for auto-apply execution queue items stuck for over 24h
  // Items with requires_approval=true are expected to wait for founder action — don't flag those.
  const queueItems = await storage.getExecutionQueue(100);
  const stuckAutoItems = queueItems.filter(
    (q) =>
      q.status === "pending" &&
      !q.requiresApproval &&
      Date.now() - new Date(q.createdAt).getTime() > 24 * 60 * 60 * 1000
  );
  if (stuckAutoItems.length > 0) {
    warnings.push(`${stuckAutoItems.length} auto-apply execution queue items have been stuck for over 24h`);
  }

  // Expire stale approval-required items (older than 7 days) to prevent queue bloat.
  // Items older than 7 days are unlikely to be actioned and just inflate the queue.
  try {
    await db.execute(sql`
      DELETE FROM execution_queue
      WHERE status = 'pending'
        AND requires_approval = true
        AND created_at < now() - interval '7 days'
    `);
  } catch (err: any) {
    console.warn("[reliabilityWatchdog] execution_queue prune error:", err?.message);
  }

  // 3. Check rollback rate
  const changes = await storage.getAppliedChanges(50);
  const rollbacks = await storage.getRollbackEvents(20);
  const recent = changes.filter((c) => Date.now() - new Date(c.createdAt).getTime() < 24 * 60 * 60 * 1000);
  if (recent.length > 0 && rollbacks.length / recent.length > 0.5) {
    warnings.push(`High rollback rate detected: ${rollbacks.length} rollbacks vs ${recent.length} recent changes`);
  }

  // 4. Prune old records to prevent DB bloat
  await pruneOldRecords();

  // 5. Compute maturity score and save snapshot
  const scores = await computeMaturityScore();
  const healthSnapshot = await storage.createSystemHealthSnapshot({
    jobHealthScore: scores.jobHealthScore,
    revenueTruthScore: scores.revenueTruthScore,
    auditHealthScore: scores.auditHealthScore,
    executionSafetyScore: scores.executionSafetyScore,
    growthHealthScore: scores.growthHealthScore,
    overallMaturityScore: scores.overallMaturityScore,
    metaJson: { staleJobs, warnings, details: scores.details },
  });

  console.log(`[reliabilityWatchdog] score=${scores.overallMaturityScore} warnings=${warnings.length} staleJobs=${staleJobs.length}`);
  return { healthSnapshot, staleJobs, warnings };
}
