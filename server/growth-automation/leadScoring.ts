// Phase 66 — Growth Automation: lead scoring analytics.
//
// Deterministic lead-quality distribution and conversion-readiness scoring drawn
// from the growth snapshot. No LLM. Recommendation-only.

import type { GrowthSnapshot } from "./aggregator";

export type LeadScoring = {
  total: number;
  emailCaptured: number;
  hot: number;
  qualified: number;
  bookedThisWeek: number;
  wonThisMonth: number;
  topIntent: string | null;
  // Derived rates (0-100).
  captureRate: number;       // emailCaptured / total
  qualifyRate: number;       // qualified / total
  hotRate: number;           // hot / total
  // 0-100 composite of pipeline health.
  readinessScore: number;
  tiers: Array<{ tier: string; count: number }>;
};

function rate(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 1000) / 10;
}

export function computeLeadScoring(snap: GrowthSnapshot): LeadScoring {
  const ls = snap.leadScoring;
  const total = ls.total;
  const captureRate = rate(ls.emailCaptured, total);
  const qualifyRate = rate(ls.qualified, total);
  const hotRate = rate(ls.hot, total);

  // Composite readiness: weighted blend of capture, qualify, and recent wins.
  const readinessScore = Math.max(0, Math.min(100, Math.round(
    captureRate * 0.3 + qualifyRate * 0.4 + hotRate * 0.2 + Math.min(10, ls.wonThisMonth) * 1,
  )));

  const cold = Math.max(0, total - ls.emailCaptured);
  const warm = Math.max(0, ls.emailCaptured - ls.qualified);
  const tiers = [
    { tier: "Hot", count: ls.hot },
    { tier: "Qualified", count: ls.qualified },
    { tier: "Warm (captured)", count: warm },
    { tier: "Cold (anonymous)", count: cold },
  ];

  return {
    total,
    emailCaptured: ls.emailCaptured,
    hot: ls.hot,
    qualified: ls.qualified,
    bookedThisWeek: ls.bookedThisWeek,
    wonThisMonth: ls.wonThisMonth,
    topIntent: ls.topIntent,
    captureRate,
    qualifyRate,
    hotRate,
    readinessScore,
    tiers,
  };
}
