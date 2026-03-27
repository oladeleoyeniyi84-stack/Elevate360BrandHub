import { registerRecurringJob } from "./jobRunner";
import { runRevenueRecoveryEngine } from "./revenueRecoveryEngine";
import { runContentOpportunityEngine } from "./contentOpportunityEngine";
import { generateFounderWeeklyBrief, generateMonthlyStrategyBrief } from "./executiveDigestEngine";
import { runAnomalyEngine } from "./anomalyEngine";

export async function startAutomationJobs() {
  await registerRecurringJob(
    {
      jobKey: "phase49_revenue_recovery",
      jobGroup: "revenue",
      cadenceMinutes: 120,
      run: runRevenueRecoveryEngine,
    },
    75_000
  );

  await registerRecurringJob(
    {
      jobKey: "phase49_content_opportunities",
      jobGroup: "content",
      cadenceMinutes: 24 * 60,
      run: runContentOpportunityEngine,
    },
    120_000
  );

  await registerRecurringJob(
    {
      jobKey: "phase49_anomaly_engine",
      jobGroup: "audit",
      cadenceMinutes: 60,
      run: runAnomalyEngine,
    },
    90_000
  );

  await registerRecurringJob(
    {
      jobKey: "phase49_founder_brief",
      jobGroup: "digest",
      cadenceMinutes: 7 * 24 * 60,
      run: generateFounderWeeklyBrief,
    },
    180_000
  );

  await registerRecurringJob(
    {
      jobKey: "phase49_monthly_strategy",
      jobGroup: "digest",
      cadenceMinutes: 30 * 24 * 60,
      run: generateMonthlyStrategyBrief,
    },
    240_000
  );

  console.log("[automation] Phase 49 jobs registered (5 jobs)");

  // ── Phase 50: Growth Optimization jobs ──────────────────────────────────────
  const { runSourcePerformanceEngine } = await import("./sourcePerformanceEngine");
  const { runFunnelLeakEngine } = await import("./funnelLeakEngine");
  const { runOfferPerformanceEngine } = await import("./offerPerformanceEngine");
  const { runGrowthExperimentEngine } = await import("./growthExperimentEngine");

  await registerRecurringJob(
    { jobKey: "phase50_source_performance", jobGroup: "growth", cadenceMinutes: 720, run: runSourcePerformanceEngine },
    150_000
  );

  await registerRecurringJob(
    { jobKey: "phase50_funnel_leak_optimizer", jobGroup: "growth", cadenceMinutes: 720, run: runFunnelLeakEngine },
    180_000
  );

  await registerRecurringJob(
    { jobKey: "phase50_offer_optimizer", jobGroup: "growth", cadenceMinutes: 1440, run: runOfferPerformanceEngine },
    210_000
  );

  await registerRecurringJob(
    { jobKey: "phase50_experiment_generator", jobGroup: "growth", cadenceMinutes: 1440, run: runGrowthExperimentEngine },
    240_000
  );

  console.log("[automation] Phase 50 jobs registered (4 jobs)");
}
