// Phase 65 — Revenue Intelligence Engine: cross-system revenue aggregator.
//
// Reads (read-only) from every revenue-relevant subsystem and produces a single
// scrubbed snapshot used by the insight engine, forecast engine, report engine,
// and revenue copilot. Never mutates anything.

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

export type RevenueSnapshot = {
  generatedAt: string;
  totals: {
    combinedRevenueCents: number;
    stripeRevenueCents: number;
    wonRevenueCents: number;
    paidOrders: number;
    wonDeals: number;
    avgOrderValueCents: number;
  };
  attribution: {
    monthlySeries: Array<{ month: string; total: number; stripeRevenue: number; wonRevenue: number }>;
    byOffer: Array<{ name: string; revenue: number; count: number; avgValue: number }>;
    byIntent: Array<{ intent: string; revenue: number; count: number }>;
    bySource: Array<{ source: string; revenue: number; count: number }>;
    topPaths: Array<{ intent: string; offer: string; revenue: number; count: number }>;
  };
  clv: {
    totalCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
    avgLtvCents: number;
    avgOrdersPerCustomer: number;
    medianLtvCents: number;
    topCustomers: Array<{ label: string; orders: number; totalCents: number; firstOrder: string; lastOrder: string }>;
    cohorts: Array<{ month: string; customers: number; revenueCents: number }>;
  };
  offers: {
    perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }>;
  };
  funnel: {
    totalSessions: number; withIntent: number; emailCaptured: number;
    qualified: number; booked: number; paidOrders: number;
    stages: Array<{ name: string; count: number; rate: number }>;
  };
  bookings: {
    total: number; pending: number; confirmed: number; last30Days: number;
    bookedLeads: number; wonLeads: number; bookingToWonRate: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  pipeline: {
    totalLeads: number; emailCaptured: number; hot: number; qualified: number;
    bookedThisWeek: number; wonThisMonth: number;
    topIntent: string | null; topRecommendedOffer: string | null;
  };
  urgency: {
    overdueHotLeads: number; newQualifiedLeads: number; pendingBookings: number;
    paidOrdersToday: number; unrepliedContacts: number;
  };
  aiOps: { openai: string; deepseek: string; router: string; premiumModel: string; automationModel: string };
  series: Array<{ date: string; visits: number; leads: number; conversions: number; revenueCents: number }>;
};

export async function buildRevenueSnapshot(seriesDays = 90): Promise<RevenueSnapshot> {
  const [
    summary, attribution, funnel, urgency, clv, bookingIntel, offers, series,
  ] = await Promise.all([
    storage.getDashboardSummary().catch(() => null),
    storage.getRevenueAttributionData().catch(() => null),
    storage.getConversionFunnel().catch(() => null),
    storage.getUrgencyDashboard().catch(() => null),
    storage.getCustomerLtvData().catch(() => null),
    storage.getBookingIntelligence().catch(() => null),
    storage.getOfferOptimizerData().catch(() => null),
    storage.getFounderIntelSeries(seriesDays).catch(() => [] as any[]),
  ]);

  const ai = getAIStatus();

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      combinedRevenueCents: attribution?.totals?.combinedRevenue ?? 0,
      stripeRevenueCents: attribution?.totals?.stripeRevenue ?? 0,
      wonRevenueCents: attribution?.totals?.wonRevenue ?? 0,
      paidOrders: attribution?.totals?.paidOrders ?? 0,
      wonDeals: attribution?.totals?.wonDeals ?? 0,
      avgOrderValueCents: attribution?.totals?.avgOrderValue ?? 0,
    },
    attribution: {
      monthlySeries: attribution?.monthlySeries ?? [],
      byOffer: (attribution?.byOffer ?? []).slice(0, 12),
      byIntent: (attribution?.byIntent ?? []).slice(0, 12),
      bySource: (attribution?.bySource ?? []).slice(0, 12),
      topPaths: (attribution?.topPaths ?? []).slice(0, 10),
    },
    clv: clv ?? {
      totalCustomers: 0, repeatCustomers: 0, repeatRate: 0, avgLtvCents: 0,
      avgOrdersPerCustomer: 0, medianLtvCents: 0, topCustomers: [], cohorts: [],
    },
    offers: { perOffer: offers?.perOffer ?? {} },
    funnel: {
      totalSessions: funnel?.totalSessions ?? 0,
      withIntent: funnel?.withIntent ?? 0,
      emailCaptured: funnel?.emailCaptured ?? 0,
      qualified: funnel?.qualified ?? 0,
      booked: funnel?.booked ?? 0,
      paidOrders: funnel?.paidOrders ?? 0,
      stages: funnel?.stages ?? [],
    },
    bookings: {
      total: bookingIntel?.total ?? 0,
      pending: bookingIntel?.pending ?? 0,
      confirmed: bookingIntel?.confirmed ?? 0,
      last30Days: bookingIntel?.last30Days ?? 0,
      bookedLeads: bookingIntel?.bookedLeads ?? 0,
      wonLeads: bookingIntel?.wonLeads ?? 0,
      bookingToWonRate: bookingIntel?.bookingToWonRate ?? 0,
      byStatus: bookingIntel?.byStatus ?? [],
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
    },
    urgency: {
      overdueHotLeads: urgency?.overdueHotLeads ?? 0,
      newQualifiedLeads: urgency?.newQualifiedLeads ?? 0,
      pendingBookings: urgency?.pendingBookings ?? 0,
      paidOrdersToday: urgency?.paidOrdersToday ?? 0,
      unrepliedContacts: urgency?.unrepliedContacts ?? 0,
    },
    aiOps: {
      openai: ai.openai, deepseek: ai.deepseek, router: ai.router,
      premiumModel: ai.defaultPremiumModel, automationModel: ai.defaultAutomationModel,
    },
    series: series ?? [],
  };
}
