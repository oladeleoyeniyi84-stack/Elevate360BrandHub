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

  // ── Phase 51: Autonomous Execution jobs ─────────────────────────────────────
  const { runExecutionEngine } = await import("./executionEngine");
  const { runRollbackEngine } = await import("./rollbackEngine");

  await registerRecurringJob(
    { jobKey: "phase51_execution_engine", jobGroup: "execution", cadenceMinutes: 360, run: () => runExecutionEngine().then(() => undefined) },
    270_000
  );

  await registerRecurringJob(
    { jobKey: "phase51_rollback_engine", jobGroup: "execution", cadenceMinutes: 720, run: () => runRollbackEngine().then(() => undefined) },
    300_000
  );

  console.log("[automation] Phase 51 jobs registered (2 jobs)");

  // ── Phase 52: Founder Control & Maturity jobs ─────────────────────────────────
  const { runReliabilityWatchdog } = await import("./reliabilityWatchdog");
  const { runQuarterlyStrategyEngine } = await import("./quarterlyStrategyEngine");

  await registerRecurringJob(
    { jobKey: "phase52_reliability_watchdog", jobGroup: "reliability", cadenceMinutes: 360, run: () => runReliabilityWatchdog().then(() => undefined) },
    330_000
  );

  await registerRecurringJob(
    { jobKey: "phase52_quarterly_strategy", jobGroup: "strategy", cadenceMinutes: 30 * 24 * 60, run: runQuarterlyStrategyEngine },
    360_000
  );

  console.log("[automation] Phase 52 jobs registered (2 jobs)");

  // ── Phase 53 — DeepSeek QA Sentinel ─────────────────────────────────────────
  const { runQaSentinel } = await import("../ai/qaSentinel");

  await registerRecurringJob(
    {
      jobKey: "phase53_deepseek_qa_sentinel",
      jobGroup: "diagnostics",
      cadenceMinutes: 360, // every 6 hours
      run: async () => {
        const { summary } = await runQaSentinel();
        return { summary };
      },
    },
    390_000
  );

  console.log("[automation] Phase 53 jobs registered (1 job)");

  // ── Phase 54 — Autonomous Recovery Engine ──────────────────────────────────
  // Boot-offset 15m so it runs well after the QA sentinel (sentinel boot=390s)
  // and consumes the latest report. Subsequent runs follow the 6h cadence
  // independently — both jobs offset enough that they never overlap in practice.
  const { runRecoveryEngine } = await import("./recoveryEngine");

  await registerRecurringJob(
    {
      jobKey: "phase54_autonomous_recovery_engine",
      jobGroup: "diagnostics",
      cadenceMinutes: 360, // every 6 hours
      run: async () => {
        const { summary } = await runRecoveryEngine();
        return { summary };
      },
    },
    900_000 // 15-minute boot offset: sentinel completes (boot 6.5m) before this fires
  );

  console.log("[automation] Phase 54 jobs registered (1 job)");

  // ── Phase 59 — AI Revenue Command Center ──────────────────────────────────
  const { runRevenueCommandCenter } = await import("../revenue/commandCenter");
  await registerRecurringJob(
    {
      jobKey: "phase59_revenue_command_center",
      jobGroup: "revenue",
      cadenceMinutes: 360, // every 6 hours
      run: async () => {
        const { report, alerts } = await runRevenueCommandCenter(30);
        return { summary: `report=${report.id} conf=${report.confidence} new_alerts=${alerts.length}` };
      },
    },
    420_000 // 7-minute boot offset — well after recovery engine
  );
  console.log("[automation] Phase 59 jobs registered (1 job)");

  // ── Phase 60 — AI Orchestrator Core ───────────────────────────────────────
  const { registerOrchestratorRegistry } = await import("../orchestrator/workflows");
  const { tickOrchestrator, queueWorkflow } = await import("../orchestrator/core");
  registerOrchestratorRegistry();
  await registerRecurringJob(
    {
      jobKey: "phase60_orchestrator_core",
      jobGroup: "orchestrator",
      cadenceMinutes: 15,
      run: async () => {
        // Self-feed: queue a daily scan if nothing recent.
        try { await queueWorkflow("daily_operational_scan"); } catch { /* cooldown */ }
        const { summary } = await tickOrchestrator();
        return { summary };
      },
    },
    480_000 // 8-minute boot offset
  );
  console.log("[automation] Phase 60 jobs registered (1 job)");

  // ── Phase 61 — Neural Command Grid (combined job for stability) ───────────
  const { runNeuralScan } = await import("../neural/commandGrid");
  await registerRecurringJob(
    {
      jobKey: "phase61_neural_command_grid",
      jobGroup: "neural",
      cadenceMinutes: 15,
      run: async () => {
        const r = await runNeuralScan();
        return { summary: r.summary };
      },
    },
    540_000 // 9-minute boot offset (after orchestrator)
  );
  console.log("[automation] Phase 61 jobs registered (1 job)");

  // ── Phase 62 — Autonomous Execution Mesh ──────────────────────────────────
  const { runMeshTick } = await import("../mesh/missionEngine");
  const { seedDefaultAgents } = await import("../mesh/agentRegistry");
  await seedDefaultAgents().catch(e => console.warn("[mesh] initial seed failed:", e?.message));
  await registerRecurringJob(
    {
      jobKey: "phase62_execution_mesh_tick",
      jobGroup: "mesh",
      cadenceMinutes: 5,
      run: async () => {
        const r = await runMeshTick();
        return { summary: `processed=${r.processed} health=${r.topologyHealth} agents=${r.agents} pending=${r.pending}` };
      },
    },
    600_000 // 10-minute boot offset (after neural grid)
  );
  console.log("[automation] Phase 62 jobs registered (1 job)");

  // ── Phase 64 — Founder Intelligence System ────────────────────────────────
  const { generateDecisionCenter } = await import("../founder-intel/decisionEngine");
  const { generateExecutiveReport } = await import("../founder-intel/reportEngine");
  await registerRecurringJob(
    {
      jobKey: "phase64_founder_intelligence",
      jobGroup: "founder-intel",
      cadenceMinutes: 1440,
      run: async () => {
        const items = await generateDecisionCenter();
        const report = await generateExecutiveReport("daily");
        return { summary: `decisions=${items.length} report=${report.id}` };
      },
    },
    660_000 // 11-minute boot offset (after execution mesh)
  );
  console.log("[automation] Phase 64 jobs registered (1 job)");

  // ── Phase 65 — Revenue Intelligence Engine ────────────────────────────────
  const { generateRevenueInsights } = await import("../revenue-intel/insightEngine");
  const { generateRevenueReport } = await import("../revenue-intel/reportEngine");
  await registerRecurringJob(
    {
      jobKey: "phase65_revenue_intelligence",
      jobGroup: "revenue-intel",
      cadenceMinutes: 1440,
      run: async () => {
        const items = await generateRevenueInsights();
        const report = await generateRevenueReport("daily");
        return { summary: `insights=${items.length} report=${report.id}` };
      },
    },
    720_000 // 12-minute boot offset (after founder intelligence)
  );
  console.log("[automation] Phase 65 jobs registered (1 job)");
}
