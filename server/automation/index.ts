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
}
