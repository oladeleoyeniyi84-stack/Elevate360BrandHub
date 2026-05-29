// Phase 66 — Growth Automation Engine: cross-system growth aggregator.
//
// Reads (read-only) from every growth-relevant subsystem — traffic/SEO, lead
// scoring, content inventory, source performance, funnel, offers, attribution,
// social channels — and produces a single scrubbed snapshot used by the
// opportunity engine, forecast, report engine, campaign planner, and copilot.
// Never mutates anything.

import { storage } from "../storage";
import { getAIStatus } from "../ai/modelRouter";

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

// Static brand social presence (no external API calls — recommendation-only).
export const SOCIAL_CHANNELS = [
  { channel: "instagram", label: "Instagram", handle: "officialelevate360" },
  { channel: "youtube", label: "YouTube", handle: "Elevate360" },
  { channel: "etsy", label: "Etsy", handle: "Elevate360Official" },
  { channel: "audiomack", label: "Audiomack", handle: "elevate360music" },
  { channel: "blog", label: "Blog", handle: "/blog" },
];

export type GrowthSnapshot = {
  generatedAt: string;
  traffic: {
    totalViews: number;
    topPages: Array<{ page: string; views: number }>;
  };
  leadScoring: {
    total: number; emailCaptured: number; hot: number; qualified: number;
    bookedThisWeek: number; wonThisMonth: number; topIntent: string | null;
  };
  seo: {
    blogCount: number;
    latestBlogAt: string | null;
    daysSinceLastPost: number | null;
    pages: Array<{ page: string; views: number }>;
    recentTitles: string[];
  };
  sources: Array<{ source: string; visits: number; chatLeads: number; qualifiedLeads: number; paidOrders: number; revenueCents: number; qualityScore: number }>;
  funnel: {
    totalSessions: number; withIntent: number; emailCaptured: number;
    qualified: number; booked: number; paidOrders: number;
    stages: Array<{ name: string; count: number; rate: number }>;
  };
  offers: { perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }> };
  attribution: {
    byOffer: Array<{ name: string; revenue: number; count: number }>;
    byIntent: Array<{ intent: string; revenue: number; count: number }>;
    bySource: Array<{ source: string; revenue: number; count: number }>;
    topPaths: Array<{ intent: string; offer: string; revenue: number; count: number }>;
  };
  socialChannels: Array<{ channel: string; label: string; handle: string }>;
  aiOps: { openai: string; deepseek: string; router: string; premiumModel: string; automationModel: string };
  series: Array<{ date: string; visits: number; leads: number; conversions: number; revenueCents: number }>;
};

export async function buildGrowthSnapshot(seriesDays = 90): Promise<GrowthSnapshot> {
  const [
    seo, leadScoring, sources, funnel, offers, attribution, series,
  ] = await Promise.all([
    storage.getGrowthSeoData().catch(() => null),
    storage.getLeadScoringData().catch(() => null),
    storage.getLatestSourcePerformance(50).catch(() => [] as any[]),
    storage.getConversionFunnel().catch(() => null),
    storage.getOfferOptimizerData().catch(() => null),
    storage.getRevenueAttributionData().catch(() => null),
    storage.getFounderIntelSeries(seriesDays).catch(() => [] as any[]),
  ]);

  const ai = getAIStatus();

  const latestBlogAt = seo?.latestBlogAt ? new Date(seo.latestBlogAt) : null;
  const daysSinceLastPost = latestBlogAt
    ? Math.floor((Date.now() - latestBlogAt.getTime()) / 86_400_000)
    : null;

  return {
    generatedAt: new Date().toISOString(),
    traffic: {
      totalViews: seo?.totalViews ?? 0,
      topPages: (seo?.pages ?? []).slice(0, 12),
    },
    leadScoring: {
      total: leadScoring?.total ?? 0,
      emailCaptured: leadScoring?.emailCaptured ?? 0,
      hot: leadScoring?.hot ?? 0,
      qualified: leadScoring?.qualified ?? 0,
      bookedThisWeek: leadScoring?.bookedThisWeek ?? 0,
      wonThisMonth: leadScoring?.wonThisMonth ?? 0,
      topIntent: leadScoring?.topIntent ?? null,
    },
    seo: {
      blogCount: seo?.blogCount ?? 0,
      latestBlogAt: latestBlogAt ? latestBlogAt.toISOString() : null,
      daysSinceLastPost,
      pages: (seo?.pages ?? []).slice(0, 12),
      recentTitles: (seo?.blogPosts ?? []).slice(0, 8).map((p) => scrub(p.title, 120)),
    },
    sources: (sources ?? []).slice(0, 12).map((s: any) => ({
      source: scrub(s.sourceName ?? "unknown", 80),
      visits: s.visits ?? 0,
      chatLeads: s.chatLeads ?? 0,
      qualifiedLeads: s.qualifiedLeads ?? 0,
      paidOrders: s.paidOrders ?? 0,
      revenueCents: s.revenue ?? 0,
      qualityScore: s.qualityScore ?? 0,
    })),
    funnel: {
      totalSessions: funnel?.totalSessions ?? 0,
      withIntent: funnel?.withIntent ?? 0,
      emailCaptured: funnel?.emailCaptured ?? 0,
      qualified: funnel?.qualified ?? 0,
      booked: funnel?.booked ?? 0,
      paidOrders: funnel?.paidOrders ?? 0,
      stages: funnel?.stages ?? [],
    },
    offers: { perOffer: offers?.perOffer ?? {} },
    attribution: {
      byOffer: (attribution?.byOffer ?? []).slice(0, 12),
      byIntent: (attribution?.byIntent ?? []).slice(0, 12),
      bySource: (attribution?.bySource ?? []).slice(0, 12),
      topPaths: (attribution?.topPaths ?? []).slice(0, 10),
    },
    socialChannels: SOCIAL_CHANNELS.map((c) => ({ channel: c.channel, label: c.label, handle: c.handle })),
    aiOps: {
      openai: ai.openai, deepseek: ai.deepseek, router: ai.router,
      premiumModel: ai.defaultPremiumModel, automationModel: ai.defaultAutomationModel,
    },
    series: series ?? [],
  };
}
