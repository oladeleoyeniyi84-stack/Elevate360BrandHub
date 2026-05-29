// Phase 65 — Revenue Intelligence: AI Executive Revenue Reports.
//
// Generates daily / weekly / monthly / quarterly executive revenue reports.
// OpenAI synthesizes the executive narrative (hard-locked, no fallback) over a
// scrubbed revenue snapshot + deterministic analytics. Persisted for the founder.
// Recommendation-only; mutates nothing operational.

import { storage } from "./../storage";
import { runTask } from "../ai/modelRouter";
import { buildRevenueSnapshot, scrub } from "./aggregator";
import { computeRevenueForecast } from "./revenueForecast";
import { computeClvAnalytics } from "./clvEngine";
import { computeOfferAnalytics } from "./offerAnalytics";
import { analyzeFunnel } from "./funnelIntel";
import { deriveRevenueInsights } from "./insightEngine";
import type { RevenueIntelReport } from "@shared/schema";

export type PeriodType = "daily" | "weekly" | "monthly" | "quarterly";
export const PERIODS: PeriodType[] = ["daily", "weekly", "monthly", "quarterly"];

const PERIOD_FRAMING: Record<PeriodType, string> = {
  daily: "Today's revenue focus: what moved, what to watch, and the single most important revenue action now.",
  weekly: "This week's revenue: momentum, what converted, and the priorities for the next 7 days.",
  monthly: "This month's revenue: trends, offer mix, lifetime value, and strategic adjustments.",
  quarterly: "This quarter's revenue strategy: big bets, customer economics, and what Elevate360 should monetize next.",
};

const fmtUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);

// Recursively scrub every string in a structure before persistence.
function deepScrub<T>(v: T): T {
  if (typeof v === "string") return scrub(v, 2400) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => deepScrub(x)) as unknown as T;
  if (v && typeof v === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(v as any)) out[k] = deepScrub(val);
    return out;
  }
  return v;
}

export async function generateRevenueReport(period: PeriodType): Promise<RevenueIntelReport> {
  const snap = await buildRevenueSnapshot();
  const forecast = computeRevenueForecast(snap.series.map((p) => ({ date: p.date, revenueCents: p.revenueCents })));
  const clv = computeClvAnalytics(snap);
  const offers = computeOfferAnalytics(snap);
  const funnel = analyzeFunnel(snap);
  const insights = deriveRevenueInsights(snap);

  const opportunities = insights.filter((d) => d.kind === "opportunity").slice(0, 5);
  const risks = insights.filter((d) => d.kind === "risk").slice(0, 5);
  const actions = insights.filter((d) => d.kind === "action").slice(0, 5);

  const payload = {
    period,
    revenue: {
      combined: fmtUSD(snap.totals.combinedRevenueCents),
      stripe: fmtUSD(snap.totals.stripeRevenueCents),
      won: fmtUSD(snap.totals.wonRevenueCents),
      paidOrders: snap.totals.paidOrders,
      wonDeals: snap.totals.wonDeals,
      avgOrderValue: fmtUSD(snap.totals.avgOrderValueCents),
    },
    attribution: {
      topOffers: snap.attribution.byOffer.slice(0, 3).map((o) => ({ name: o.name, revenue: fmtUSD(o.revenue), count: o.count })),
      topPaths: snap.attribution.topPaths.slice(0, 3).map((p) => ({ path: `${p.intent} → ${p.offer}`, revenue: fmtUSD(p.revenue), count: p.count })),
      topSource: snap.attribution.bySource[0]?.source ?? null,
    },
    clv: {
      totalCustomers: clv.totalCustomers, repeatRate: clv.repeatRate,
      avgLtv: fmtUSD(clv.avgLtvCents), medianLtv: fmtUSD(clv.medianLtvCents),
      top20Share: clv.top20RevenueSharePct,
    },
    offers: {
      bestSeller: offers.bestSeller?.name ?? null,
      highestAvgValue: offers.highestAvgValue?.name ?? null,
      bestAcceptance: offers.bestAcceptance ? { name: offers.bestAcceptance.name, rate: offers.bestAcceptance.acceptanceRate } : null,
    },
    funnel: {
      overallConversion: funnel.overallConversionPct,
      biggestLeak: funnel.biggestLeak ? { step: `${funnel.biggestLeak.from} → ${funnel.biggestLeak.to}`, dropOff: funnel.biggestLeak.dropOffPct } : null,
    },
    bookings: { total: snap.bookings.total, pending: snap.bookings.pending, last30Days: snap.bookings.last30Days, bookingToWonRate: snap.bookings.bookingToWonRate },
    forecast: forecast.horizons.map((h) => ({ horizon: h.label, projected: fmtUSD(h.projected), range: `${fmtUSD(h.low)}–${fmtUSD(h.high)}`, trend: h.trend, confidence: h.confidence })),
    opportunities: opportunities.map((o) => o.title),
    risks: risks.map((r) => r.title),
    actions: actions.map((a) => a.title),
  };

  let summary = "";
  let providerMeta: any = { provider: "none", model: "none" };
  try {
    const r = await runTask("executive_copy", {
      messages: [
        {
          role: "system",
          content:
            "You are the Chief Revenue Officer to the founder of Elevate360Official. Write a crisp executive revenue briefing. " +
            PERIOD_FRAMING[period] +
            " Structure: (1) State of revenue in 2 sentences. (2) Biggest revenue opportunity. (3) Biggest revenue risk. (4) The single most important revenue action right now. " +
            "Be specific to the data. Recommendation-only — never instruct to change pricing, charge customers, issue refunds, send autonomous emails, or take destructive/irreversible action. Plain prose, no markdown headers, no JSON. Max 220 words.",
        },
        { role: "user", content: scrub(JSON.stringify(payload), 5000) },
      ],
      temperature: 0.4, maxTokens: 600,
    }, { providerOverride: "openai" });
    summary = scrub(r.content, 2400).trim();
    providerMeta = { provider: r.provider, model: r.model, latencyMs: r.latencyMs };
  } catch (e: any) {
    console.warn("[revenue-intel] report synthesis failed:", scrub(e?.message, 160));
    summary = "Executive revenue synthesis is temporarily unavailable. The structured revenue intelligence below reflects your current state.";
  }

  const title = `${period.charAt(0).toUpperCase() + period.slice(1)} Revenue Briefing — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Final scrub on EVERYTHING persisted (summary + every string in sections).
  const sections = deepScrub({
    revenue: payload.revenue,
    attribution: payload.attribution,
    clv: payload.clv,
    offers: payload.offers,
    funnel: payload.funnel,
    bookings: payload.bookings,
    forecast: payload.forecast,
    opportunities: opportunities.map((o) => ({ title: o.title, detail: o.detail, priority: o.priority, confidence: o.confidence })),
    risks: risks.map((r) => ({ title: r.title, detail: r.detail, priority: r.priority, confidence: r.confidence })),
    actions: actions.map((a) => ({ title: a.title, detail: a.detail, priority: a.priority, confidence: a.confidence })),
  });

  return storage.createRevenueIntelReport({
    periodType: period,
    title: scrub(title, 240),
    summary: scrub(summary, 2400),
    sections: sections as any,
    providerMetadata: providerMeta,
    source: providerMeta.provider ?? "openai",
  });
}
