// Phase 64 — Founder Intelligence: cross-system data aggregator.
//
// Reads (read-only) from every existing subsystem and produces a single
// scrubbed snapshot used by the decision engine, forecast engine, report
// engine, and copilot. Never mutates anything.

import { storage } from "../storage";
import { getAIStatus } from "../ai/modelRouter";
import { getMemoryAnalytics, getMemoryHealth } from "../memory/memoryEngine";

const SCRUB: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];

export function scrub(s: any, maxLen = 4000): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

export type IntelSnapshot = {
  generatedAt: string;
  revenue: {
    combinedRevenueCents: number;
    stripeRevenueCents: number;
    wonRevenueCents: number;
    paidOrders: number;
    wonDeals: number;
    avgOrderValueCents: number;
    monthlySeries: Array<{ month: string; total: number; stripeRevenue: number; wonRevenue: number }>;
    byOffer: Array<{ name: string; revenue: number; count: number }>;
    topPaths: Array<{ intent: string; offer: string; revenue: number; count: number }>;
  };
  pipeline: {
    totalLeads: number; emailCaptured: number; hot: number; qualified: number;
    bookedThisWeek: number; wonThisMonth: number;
    topIntent: string | null; topRecommendedOffer: string | null;
    funnel: Array<{ name: string; count: number; rate: number }>;
  };
  growth: {
    hasReport: boolean;
    headline: string | null;
    recommendations: number;
    topRecommendation: string | null;
  };
  experiments: {
    running: number;
    total: number;
    names: string[];
  };
  personalization: {
    segments: number;
    topSegment: string | null;
    avgCtr: number;
    avgCvr: number;
  };
  aiOps: {
    openai: string; deepseek: string; router: string;
    premiumModel: string; automationModel: string;
  };
  memory: {
    total: number; embeddingCoverage: number; staleExpired: number;
    topAccessed: Array<{ title: string | null; scope: string; accessCount: number }>;
  };
  urgency: {
    overdueHotLeads: number; newQualifiedLeads: number; pendingBookings: number;
    paidOrdersToday: number; unrepliedContacts: number;
  };
  series: Array<{ date: string; visits: number; leads: number; conversions: number; revenueCents: number }>;
};

export async function buildIntelSnapshot(seriesDays = 30): Promise<IntelSnapshot> {
  const [
    summary, attribution, funnel, urgency,
    growthReport, growthRecs, experiments,
    personaStats, personaCounts, series,
    memHealth, memAnalytics,
  ] = await Promise.all([
    storage.getDashboardSummary().catch(() => null),
    storage.getRevenueAttributionData().catch(() => null),
    storage.getConversionFunnel().catch(() => null),
    storage.getUrgencyDashboard().catch(() => null),
    storage.getLatestGrowthReport().catch(() => null),
    storage.listGrowthRecommendations(undefined, 50).catch(() => [] as any[]),
    storage.listExperiments("running", 100).catch(() => [] as any[]),
    storage.getPersonalizationEventStats().catch(() => [] as any[]),
    storage.getPersonalizationProfileCounts().catch(() => [] as any[]),
    storage.getFounderIntelSeries(seriesDays).catch(() => [] as any[]),
    getMemoryHealth().catch(() => null),
    getMemoryAnalytics().catch(() => null),
  ]);

  const ai = getAIStatus();

  const personaTop = [...(personaCounts ?? [])].sort((a: any, b: any) => b.count - a.count)[0] ?? null;
  const ctrAvg = (personaStats ?? []).length
    ? (personaStats as any[]).reduce((s, p) => s + (p.ctr ?? 0), 0) / (personaStats as any[]).length
    : 0;
  const cvrAvg = (personaStats ?? []).length
    ? (personaStats as any[]).reduce((s, p) => s + (p.cvr ?? 0), 0) / (personaStats as any[]).length
    : 0;

  const topRec = (growthRecs ?? [])[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    revenue: {
      combinedRevenueCents: attribution?.totals?.combinedRevenue ?? 0,
      stripeRevenueCents: attribution?.totals?.stripeRevenue ?? 0,
      wonRevenueCents: attribution?.totals?.wonRevenue ?? 0,
      paidOrders: attribution?.totals?.paidOrders ?? 0,
      wonDeals: attribution?.totals?.wonDeals ?? 0,
      avgOrderValueCents: attribution?.totals?.avgOrderValue ?? 0,
      monthlySeries: attribution?.monthlySeries ?? [],
      byOffer: (attribution?.byOffer ?? []).slice(0, 8).map((o: any) => ({ name: o.name, revenue: o.revenue, count: o.count })),
      topPaths: attribution?.topPaths ?? [],
    },
    pipeline: {
      totalLeads: summary?.leads?.total ?? 0,
      emailCaptured: summary?.leads?.emailCaptured ?? 0,
      hot: summary?.leads?.hot ?? 0,
      qualified: summary?.leads?.qualified ?? 0,
      bookedThisWeek: summary?.leads?.bookedThisWeek ?? 0,
      wonThisMonth: summary?.leads?.wonThisMonth ?? 0,
      topIntent: summary?.topIntent ?? null,
      topRecommendedOffer: summary?.topRecommendedOffer ?? null,
      funnel: funnel?.stages ?? [],
    },
    growth: {
      hasReport: !!growthReport,
      headline: (growthReport as any)?.headline ?? (growthReport as any)?.summary ?? null,
      recommendations: (growthRecs ?? []).length,
      topRecommendation: (topRec as any)?.title ?? (topRec as any)?.recommendation ?? null,
    },
    experiments: {
      running: (experiments ?? []).length,
      total: (experiments ?? []).length,
      names: (experiments ?? []).slice(0, 8).map((e: any) => e.name ?? e.experimentKey ?? "experiment"),
    },
    personalization: {
      segments: (personaCounts ?? []).length,
      topSegment: (personaTop as any)?.segmentKey ?? null,
      avgCtr: Math.round(ctrAvg * 100) / 100,
      avgCvr: Math.round(cvrAvg * 100) / 100,
    },
    aiOps: {
      openai: ai.openai, deepseek: ai.deepseek, router: ai.router,
      premiumModel: ai.defaultPremiumModel, automationModel: ai.defaultAutomationModel,
    },
    memory: {
      total: memHealth?.total ?? 0,
      embeddingCoverage: memHealth?.embeddingCoverage ?? 0,
      staleExpired: memHealth?.staleExpired ?? 0,
      topAccessed: (memAnalytics?.topAccessed ?? []).slice(0, 5).map((m: any) => ({
        title: m.title ?? null, scope: m.scope, accessCount: m.accessCount,
      })),
    },
    urgency: {
      overdueHotLeads: urgency?.overdueHotLeads ?? 0,
      newQualifiedLeads: urgency?.newQualifiedLeads ?? 0,
      pendingBookings: urgency?.pendingBookings ?? 0,
      paidOrdersToday: urgency?.paidOrdersToday ?? 0,
      unrepliedContacts: urgency?.unrepliedContacts ?? 0,
    },
    series: series ?? [],
  };
}
