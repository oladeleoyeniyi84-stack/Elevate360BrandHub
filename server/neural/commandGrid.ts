// Phase 61 — Command Grid Aggregator
//
// One read-only orchestration of every neural subsystem for the dashboard.

import { storage } from "../storage";
import { listSignals } from "./commandBus";
import { latestCognitiveState, buildCognitiveStateSnapshot } from "./cognitiveState";
import { computeCategoryHealth } from "./healthEngine";
import { evaluateEscalations, listEscalations } from "./escalationEngine";
import { generateInsightStream, listInsights } from "./insightEngine";

export async function getCommandGridOverview() {
  const [snap, signals, escalations, health, insights, orchStats, deps, recentWorkflows] = await Promise.all([
    latestCognitiveState(),
    listSignals({ limit: 25 }),
    listEscalations(undefined, 25),
    storage.listLatestGlobalHealthScores(),
    listInsights(15),
    storage.getOrchestratorStats().catch(() => ({ queued: 0, running: 0, pendingApproval: 0, succeeded24h: 0, failed24h: 0, blocked24h: 0 })),
    storage.listWorkflowDependencies().catch(() => []),
    storage.listOrchestratorWorkflows(undefined, 20).catch(() => []),
  ]);
  return {
    cognitiveState: snap,
    signals, escalations, health, insights,
    orchestrator: { stats: orchStats, recentWorkflows },
    workflowMatrix: deps,
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Full neural scan — builds a fresh snapshot, recomputes category health,
 * derives escalations, and generates a new insight pair. Returns a summary.
 */
export async function runNeuralScan(): Promise<{ summary: string; healthScore: number; signals: number; escalations: number }> {
  await computeCategoryHealth(); // persists fresh per-category scores
  const snap = await buildCognitiveStateSnapshot();
  const esc = await evaluateEscalations();
  await generateInsightStream();
  const open = await storage.listNeuralSignals({ status: "open", limit: 100 });
  console.log(`[commandGrid] status=${snap.globalStatus} health=${snap.healthScore} signals=${open.length} escalations=${esc.created}`);
  return {
    summary: `health=${snap.healthScore} (${snap.globalStatus}); signals=${open.length}; escalations created=${esc.created}, deduped=${esc.skipped}`,
    healthScore: snap.healthScore,
    signals: open.length,
    escalations: esc.created,
  };
}
