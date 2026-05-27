// Phase 61 — Cognitive State Snapshots
//
// Snapshots the global posture of the AI OS — weighted health composite +
// raw category breakdown, persisted for trend analysis.

import { storage } from "../storage";
import { computeCategoryHealth, type CategoryScore } from "./healthEngine";
import type { CognitiveStateSnapshot, InsertCognitiveStateSnapshot } from "@shared/schema";

const WEIGHTS = {
  infrastructure: 0.20, ai: 0.15, revenue: 0.20, growth: 0.10,
  orchestration: 0.15, personalization: 0.10, experiment: 0.10,
} as const;

function statusFor(score: number): "healthy" | "degraded" | "critical" | "unknown" {
  if (!Number.isFinite(score) || score <= 0) return "unknown";
  if (score >= 80) return "healthy";
  if (score >= 55) return "degraded";
  return "critical";
}

export async function buildCognitiveStateSnapshot(): Promise<CognitiveStateSnapshot> {
  const cats = await computeCategoryHealth();
  const byCat = Object.fromEntries(cats.map(c => [c.category, c])) as Record<CategoryScore["category"], CategoryScore>;
  const composite = cats.reduce((sum, c) => sum + c.score * (WEIGHTS as any)[c.category], 0);
  const healthScore = Math.max(0, Math.min(100, Math.round(composite)));
  const globalStatus = statusFor(healthScore);

  const summaryBits = cats
    .filter(c => c.score < 60 || c.trend === "down")
    .slice(0, 3)
    .map(c => `${c.category}=${c.score}`)
    .join(", ");
  const summary = summaryBits
    ? `Global ${globalStatus} (${healthScore}). Watching: ${summaryBits}.`
    : `Global ${globalStatus} (${healthScore}). All categories steady.`;

  const snap: InsertCognitiveStateSnapshot = {
    globalStatus, healthScore,
    infrastructureScore: byCat.infrastructure?.score ?? 0,
    aiScore: byCat.ai?.score ?? 0,
    revenueScore: byCat.revenue?.score ?? 0,
    growthScore: byCat.growth?.score ?? 0,
    orchestrationScore: byCat.orchestration?.score ?? 0,
    personalizationScore: byCat.personalization?.score ?? 0,
    experimentScore: byCat.experiment?.score ?? 0,
    summary,
    rawState: { categories: cats } as any,
  };
  return storage.createCognitiveStateSnapshot(snap);
}

export async function latestCognitiveState(): Promise<CognitiveStateSnapshot | null> {
  return storage.getLatestCognitiveStateSnapshot();
}
