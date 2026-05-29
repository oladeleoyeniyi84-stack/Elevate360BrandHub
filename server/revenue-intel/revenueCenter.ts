// Phase 65 — Revenue Intelligence: overview composer.
//
// Composes the full /revenue-intelligence dashboard payload from the snapshot,
// deterministic analytics (CLV, offers, funnel, forecast), and persisted
// insights. Read-only.

import { storage } from "../storage";
import { buildRevenueSnapshot, type RevenueSnapshot } from "./aggregator";
import { computeRevenueForecast, type RevenueForecast } from "./revenueForecast";
import { computeClvAnalytics, type ClvAnalytics } from "./clvEngine";
import { computeOfferAnalytics, type OfferAnalytics } from "./offerAnalytics";
import { analyzeFunnel, type FunnelIntelligence } from "./funnelIntel";
import type { RevenueInsight } from "@shared/schema";

export type RevenueOverview = {
  generatedAt: string;
  snapshot: RevenueSnapshot;
  clv: ClvAnalytics;
  offers: OfferAnalytics;
  funnel: FunnelIntelligence;
  forecast: RevenueForecast;
  insights: {
    opportunities: RevenueInsight[];
    risks: RevenueInsight[];
    actions: RevenueInsight[];
  };
  latestReports: Array<{ id: number; periodType: string; title: string; createdAt: Date }>;
};

export async function buildRevenueOverview(): Promise<RevenueOverview> {
  const snapshot = await buildRevenueSnapshot();
  const clv = computeClvAnalytics(snapshot);
  const offers = computeOfferAnalytics(snapshot);
  const funnel = analyzeFunnel(snapshot);
  const forecast = computeRevenueForecast(snapshot.series.map((p) => ({ date: p.date, revenueCents: p.revenueCents })));

  const [openItems, reports] = await Promise.all([
    storage.listRevenueInsights({ status: "open", limit: 100 }),
    storage.listRevenueIntelReports(undefined, 8),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    snapshot,
    clv,
    offers,
    funnel,
    forecast,
    insights: {
      opportunities: openItems.filter((i) => i.kind === "opportunity").slice(0, 6),
      risks: openItems.filter((i) => i.kind === "risk").slice(0, 6),
      actions: openItems.filter((i) => i.kind === "action").slice(0, 6),
    },
    latestReports: reports.map((r) => ({ id: r.id, periodType: r.periodType, title: r.title, createdAt: r.createdAt })),
  };
}
