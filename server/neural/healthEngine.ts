// Phase 61 — Health Engine
//
// Reads health signals across all Phase 53-60 engines and emits per-category
// scores. Pure aggregation — never mutates upstream state.

import { storage } from "../storage";
import type { GlobalHealthScore, InsertGlobalHealthScore } from "@shared/schema";

export type CategoryScore = {
  category: "infrastructure" | "ai" | "revenue" | "growth" | "orchestration" | "personalization" | "experiment";
  score: number;            // 0..100
  trend: "up" | "down" | "flat";
  explanation: string;
  metadata: Record<string, any>;
};

function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }
function trendFromDelta(curr: number, prev: number): "up" | "down" | "flat" {
  if (Math.abs(curr - prev) < 3) return "flat";
  return curr > prev ? "up" : "down";
}

async function prevScore(category: string): Promise<number> {
  const rows = await storage.listLatestGlobalHealthScores();
  return rows.find(r => r.category === category)?.score ?? 50;
}

export async function computeCategoryHealth(): Promise<CategoryScore[]> {
  const out: CategoryScore[] = [];

  // Infrastructure: based on QA sentinel & system snapshots
  try {
    const qa = await storage.getAutomationJob("phase53_deepseek_qa_sentinel").catch(() => null);
    const failures = (qa as any)?.failureCount ?? 0;
    const score = clamp(100 - failures * 15);
    out.push({
      category: "infrastructure", score, trend: trendFromDelta(score, await prevScore("infrastructure")),
      explanation: failures === 0 ? "QA sentinel healthy." : `QA sentinel has ${failures} recent failure(s).`,
      metadata: { qaStatus: (qa as any)?.status ?? "unknown", failures },
    });
  } catch { out.push(emptyCat("infrastructure", "QA telemetry unavailable.")); }

  // AI: based on whether OpenAI + DeepSeek keys are configured
  try {
    const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
    const hasDeepseek = Boolean(process.env.DEEPSEEK_API_KEY);
    const score = (hasOpenAi ? 50 : 0) + (hasDeepseek ? 50 : 0);
    out.push({
      category: "ai", score, trend: trendFromDelta(score, await prevScore("ai")),
      explanation: hasOpenAi && hasDeepseek ? "Both providers configured." : "One or more AI providers missing.",
      metadata: { openai: hasOpenAi, deepseek: hasDeepseek },
    });
  } catch { out.push(emptyCat("ai", "Unable to inspect providers.")); }

  // Revenue: based on latest revenue command report confidence + alert count
  try {
    const latest = await storage.getLatestRevenueCommandReport();
    const openAlerts = await storage.listRevenueAlerts("open", 50).catch(() => []);
    const baseline = latest?.confidence ?? 40;
    const penalty = Math.min(40, openAlerts.length * 8);
    const score = clamp(baseline - penalty);
    out.push({
      category: "revenue", score, trend: trendFromDelta(score, await prevScore("revenue")),
      explanation: latest
        ? `Latest report confidence ${latest.confidence}%, ${openAlerts.length} open alert(s).`
        : "No revenue report yet.",
      metadata: { reportId: latest?.id, openAlerts: openAlerts.length },
    });
  } catch { out.push(emptyCat("revenue", "Revenue telemetry unavailable.")); }

  // Growth: open growth recommendations
  try {
    const recs = await storage.listGrowthRecommendations(undefined, 50).catch(() => []);
    const open = recs.filter(r => r.status === "open").length;
    const score = clamp(60 + Math.min(30, open * 3));
    out.push({
      category: "growth", score, trend: trendFromDelta(score, await prevScore("growth")),
      explanation: open === 0 ? "No open growth recommendations." : `${open} growth opportunity/ies queued.`,
      metadata: { open },
    });
  } catch { out.push(emptyCat("growth", "Growth telemetry unavailable.")); }

  // Orchestration: based on orchestrator stats
  try {
    const s = await storage.getOrchestratorStats();
    const total = s.succeeded24h + s.failed24h + s.blocked24h;
    const successRate = total === 0 ? 80 : Math.round((s.succeeded24h / total) * 100);
    const penalty = s.failed24h * 8 + s.blocked24h * 3;
    const score = clamp(successRate - penalty + 10);
    out.push({
      category: "orchestration", score, trend: trendFromDelta(score, await prevScore("orchestration")),
      explanation: `${s.succeeded24h} succeeded, ${s.failed24h} failed, ${s.blocked24h} blocked in last 24h.`,
      metadata: s as any,
    });
  } catch { out.push(emptyCat("orchestration", "Orchestrator telemetry unavailable.")); }

  // Personalization: segment coverage
  try {
    const stats = await storage.getPersonalizationEventStats().catch(() => []);
    const active = stats.filter(s => s.views >= 5).length;
    const score = clamp(40 + Math.min(50, active * 10));
    out.push({
      category: "personalization", score, trend: trendFromDelta(score, await prevScore("personalization")),
      explanation: active === 0 ? "No active personalization segments yet." : `${active} segment(s) with traffic.`,
      metadata: { activeSegments: active },
    });
  } catch { out.push(emptyCat("personalization", "Personalization telemetry unavailable.")); }

  // Experiment: running vs total
  try {
    const list = await storage.listExperiments(undefined, 50).catch(() => []);
    const running = list.filter(e => e.status === "running").length;
    const winners = list.filter(e => e.winnerVariantKey).length;
    const score = clamp(40 + running * 12 + winners * 4);
    out.push({
      category: "experiment", score, trend: trendFromDelta(score, await prevScore("experiment")),
      explanation: `${running} running experiment(s), ${winners} declared winner(s).`,
      metadata: { running, winners, total: list.length },
    });
  } catch { out.push(emptyCat("experiment", "Experiment telemetry unavailable.")); }

  // Persist
  for (const c of out) {
    await storage.createGlobalHealthScore({
      category: c.category, score: c.score, trend: c.trend,
      explanation: c.explanation, metadata: c.metadata as any,
    } as InsertGlobalHealthScore).catch(() => undefined);
  }
  return out;
}

function emptyCat(category: CategoryScore["category"], note: string): CategoryScore {
  return { category, score: 50, trend: "flat", explanation: note, metadata: {} };
}

export async function listLatestHealth(): Promise<GlobalHealthScore[]> {
  return storage.listLatestGlobalHealthScores();
}
