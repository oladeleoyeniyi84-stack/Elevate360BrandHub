import { storage } from "../storage";
import { computeMaturityScore } from "../services/maturityScoring";

const STALE_THRESHOLD_HOURS = 48;

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

  // 2. Check for unapplied execution queue items (older than 24h)
  const queueItems = await storage.getExecutionQueue(50);
  const oldPending = queueItems.filter(
    (q) => q.status === "pending" && Date.now() - new Date(q.createdAt).getTime() > 24 * 60 * 60 * 1000
  );
  if (oldPending.length > 0) {
    warnings.push(`${oldPending.length} execution queue items have been pending for over 24h`);
  }

  // 3. Check rollback rate
  const changes = await storage.getAppliedChanges(50);
  const rollbacks = await storage.getRollbackEvents(20);
  const recent = changes.filter((c) => Date.now() - new Date(c.createdAt).getTime() < 24 * 60 * 60 * 1000);
  if (recent.length > 0 && rollbacks.length / recent.length > 0.5) {
    warnings.push(`High rollback rate detected: ${rollbacks.length} rollbacks vs ${recent.length} recent changes`);
  }

  // 4. Compute maturity score and save snapshot
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
