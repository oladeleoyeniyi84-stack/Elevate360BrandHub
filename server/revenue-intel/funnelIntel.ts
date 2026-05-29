// Phase 65 — Revenue Intelligence: Conversion Funnel Intelligence.
//
// Turns the raw funnel stage counts into stage-to-stage conversion rates and
// identifies the single biggest leak. Deterministic, recommendation-only.

import type { RevenueSnapshot } from "./aggregator";

export type FunnelStep = {
  from: string;
  to: string;
  fromCount: number;
  toCount: number;
  conversionPct: number;
  dropOffPct: number;
};

export type FunnelIntelligence = {
  stages: Array<{ name: string; count: number; rate: number }>;
  steps: FunnelStep[];
  biggestLeak: FunnelStep | null;
  overallConversionPct: number; // sessions → won/paid
};

export function analyzeFunnel(snap: RevenueSnapshot): FunnelIntelligence {
  const stages = snap.funnel.stages ?? [];
  const steps: FunnelStep[] = [];

  for (let i = 0; i < stages.length - 1; i++) {
    const a = stages[i];
    const b = stages[i + 1];
    const conversionPct = a.count > 0 ? Math.round((b.count / a.count) * 1000) / 10 : 0;
    steps.push({
      from: a.name,
      to: b.name,
      fromCount: a.count,
      toCount: b.count,
      conversionPct,
      dropOffPct: Math.round((100 - conversionPct) * 10) / 10,
    });
  }

  // Biggest leak = largest absolute drop-off where the prior stage had volume.
  let biggestLeak: FunnelStep | null = null;
  for (const s of steps) {
    if (s.fromCount < 3) continue; // ignore low-volume noise
    if (!biggestLeak || s.dropOffPct > biggestLeak.dropOffPct) biggestLeak = s;
  }

  const first = stages[0]?.count ?? 0;
  const last = stages[stages.length - 1]?.count ?? 0;
  const overallConversionPct = first > 0 ? Math.round((last / first) * 1000) / 10 : 0;

  return { stages, steps, biggestLeak, overallConversionPct };
}
