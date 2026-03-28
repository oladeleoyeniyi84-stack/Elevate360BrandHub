import { storage } from "../storage";

export type MaturityScores = {
  jobHealthScore: number;
  revenueTruthScore: number;
  auditHealthScore: number;
  executionSafetyScore: number;
  growthHealthScore: number;
  overallMaturityScore: number;
  details: Record<string, string>;
};

export async function computeMaturityScore(): Promise<MaturityScores> {
  const details: Record<string, string> = {};

  // Job health — based on automation jobs and their last run time
  const jobs = await storage.getAutomationJobs();
  const staleThresholdMs = 48 * 60 * 60 * 1000;
  const staleJobs = jobs.filter(
    (j) => j.lastStartedAt && Date.now() - new Date(j.lastStartedAt).getTime() > staleThresholdMs
  );
  const jobHealthScore = jobs.length === 0 ? 50 : Math.max(0, 100 - Math.round((staleJobs.length / jobs.length) * 100));
  details.jobHealth = `${jobs.length} jobs, ${staleJobs.length} stale`;

  // Revenue truth — based on paid orders
  const orderStats = await storage.getOrderStats();
  const revenueTruthScore = orderStats.paid > 0 ? Math.min(100, 50 + Math.min(50, orderStats.paid * 5)) : 30;
  details.revenueTruth = `${orderStats.paid} paid orders, $${(orderStats.revenue / 100).toFixed(0)} revenue`;

  // Audit health — based on audit log activity
  const auditLogs = await storage.getAuditLogs(100);
  const recentAudit = auditLogs.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);
  const auditHealthScore = Math.min(100, 40 + recentAudit.length * 3);
  details.auditHealth = `${recentAudit.length} audit events in last 7 days`;

  // Execution safety — based on applied changes and rollbacks
  const changes = await storage.getAppliedChanges(50);
  const rollbacks = await storage.getRollbackEvents(20);
  const rollbackRate = changes.length > 0 ? (rollbacks.length / changes.length) : 0;
  const executionSafetyScore = Math.max(0, Math.round(100 - rollbackRate * 200));
  details.executionSafety = `${changes.length} changes, ${rollbacks.length} rollbacks (${Math.round(rollbackRate * 100)}% rollback rate)`;

  // Growth health — based on experiments and source performance
  const experiments = await storage.getGrowthExperiments(20);
  const wonExp = experiments.filter((e) => e.status === "won").length;
  const sources = await storage.getLatestSourcePerformance(10);
  const growthHealthScore = Math.min(100, (wonExp * 20) + (sources.length > 0 ? 40 : 10));
  details.growthHealth = `${wonExp} winning experiments, ${sources.length} source snapshots`;

  const overallMaturityScore = Math.round(
    (jobHealthScore + revenueTruthScore + auditHealthScore + executionSafetyScore + growthHealthScore) / 5
  );

  return {
    jobHealthScore,
    revenueTruthScore,
    auditHealthScore,
    executionSafetyScore,
    growthHealthScore,
    overallMaturityScore,
    details,
  };
}
