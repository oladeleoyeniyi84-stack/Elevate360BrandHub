// Phase 64 — Founder Intelligence: overview composer.
//
// Composes the full /founder-intelligence dashboard payload from the snapshot,
// deterministic forecasts, and the persisted decision items. Read-only.

import { storage } from "../storage";
import { buildIntelSnapshot, type IntelSnapshot } from "./aggregator";
import { computeForecasts, type Forecast } from "./forecastEngine";
import type { FounderDecisionItem } from "@shared/schema";

export type FounderIntelOverview = {
  generatedAt: string;
  snapshot: IntelSnapshot;
  forecasts: Forecast[];
  decisions: {
    opportunities: FounderDecisionItem[];
    risks: FounderDecisionItem[];
    actions: FounderDecisionItem[];
  };
  latestReports: Array<{ id: number; periodType: string; title: string; createdAt: Date }>;
};

export async function buildOverview(): Promise<FounderIntelOverview> {
  const snapshot = await buildIntelSnapshot();
  const forecasts = computeForecasts(snapshot.series);

  const [openItems, reports] = await Promise.all([
    storage.listFounderDecisionItems({ status: "open", limit: 100 }),
    storage.listFounderIntelReports(undefined, 8),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    snapshot,
    forecasts,
    decisions: {
      opportunities: openItems.filter((i) => i.kind === "opportunity").slice(0, 6),
      risks: openItems.filter((i) => i.kind === "risk").slice(0, 6),
      actions: openItems.filter((i) => i.kind === "action").slice(0, 6),
    },
    latestReports: reports.map((r) => ({ id: r.id, periodType: r.periodType, title: r.title, createdAt: r.createdAt })),
  };
}
