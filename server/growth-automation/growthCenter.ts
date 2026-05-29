// Phase 66 — Growth Automation: overview composer.
//
// Composes the full /growth-automation dashboard payload from the snapshot,
// deterministic analytics (lead scoring, SEO, conversion forecast), persisted
// opportunities, recent campaigns, and recent reports. Read-only.

import { storage } from "../storage";
import { buildGrowthSnapshot, type GrowthSnapshot } from "./aggregator";
import { computeLeadScoring, type LeadScoring } from "./leadScoring";
import { discoverSeoOpportunities, type SeoAnalysis } from "./seoEngine";
import { computeConversionForecast, type ConversionForecast } from "./conversionForecast";
import type { GrowthAutoOpportunity, GrowthAutoCampaign } from "@shared/schema";

export type GrowthOverview = {
  generatedAt: string;
  snapshot: GrowthSnapshot;
  leadScoring: LeadScoring;
  seo: SeoAnalysis;
  conversionForecast: ConversionForecast;
  opportunities: {
    seo: GrowthAutoOpportunity[];
    content: GrowthAutoOpportunity[];
    campaign: GrowthAutoOpportunity[];
    lead: GrowthAutoOpportunity[];
    conversion: GrowthAutoOpportunity[];
    social: GrowthAutoOpportunity[];
    all: GrowthAutoOpportunity[];
  };
  campaigns: Array<{ id: number; title: string; channel: string; status: string; source: string; createdAt: Date }>;
  latestReports: Array<{ id: number; periodType: string; title: string; createdAt: Date }>;
};

export async function buildGrowthOverview(): Promise<GrowthOverview> {
  const snapshot = await buildGrowthSnapshot();
  const leadScoring = computeLeadScoring(snapshot);
  const seo = discoverSeoOpportunities(snapshot);
  const conversionForecast = computeConversionForecast(
    snapshot.series.map((p) => ({ date: p.date, visits: p.visits, conversions: p.conversions })),
  );

  const [openItems, campaigns, reports] = await Promise.all([
    storage.listGrowthAutoOpportunities({ status: "open", limit: 100 }),
    storage.listGrowthAutoCampaigns({ limit: 12 }),
    storage.listGrowthAutoReports(undefined, 8),
  ]);

  const byKind = (k: string) => openItems.filter((i) => i.kind === k).slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    snapshot,
    leadScoring,
    seo,
    conversionForecast,
    opportunities: {
      seo: byKind("seo"),
      content: byKind("content"),
      campaign: byKind("campaign"),
      lead: byKind("lead"),
      conversion: byKind("conversion"),
      social: byKind("social"),
      all: openItems.slice(0, 20),
    },
    campaigns: campaigns.map((c: GrowthAutoCampaign) => ({ id: c.id, title: c.title, channel: c.channel, status: c.status, source: c.source, createdAt: c.createdAt })),
    latestReports: reports.map((r) => ({ id: r.id, periodType: r.periodType, title: r.title, createdAt: r.createdAt })),
  };
}
