// Phase 65 — Revenue Intelligence: Revenue Copilot.
//
// Answers strategic revenue questions ("Where is my revenue coming from?",
// "Which offer should I push?", "Why is conversion dropping?", "How do I grow
// lifetime value?") grounded in the live revenue snapshot, analytics, and
// forecast. OpenAI synthesis is hard-locked (no fallback). Recommendation-only.

import { runTask } from "../ai/modelRouter";
import { buildRevenueSnapshot, scrub } from "./aggregator";
import { computeRevenueForecast } from "./revenueForecast";
import { computeClvAnalytics } from "./clvEngine";
import { computeOfferAnalytics } from "./offerAnalytics";
import { analyzeFunnel } from "./funnelIntel";
import { deriveRevenueInsights } from "./insightEngine";

export const SUGGESTED_QUESTIONS = [
  "Where is my revenue coming from?",
  "Which offer should I push?",
  "Why is conversion dropping?",
  "How do I grow customer lifetime value?",
];

const fmtUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);

export type RevenueCopilotAnswer = {
  question: string;
  answer: string;
  grounding: { opportunities: string[]; risks: string[]; actions: string[] };
  provider: string;
  model: string;
  generatedAt: string;
};

export async function askRevenueCopilot(question: string): Promise<RevenueCopilotAnswer> {
  const q = scrub(question, 500).trim().slice(0, 500);
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
    question: q,
    revenue: {
      combined: fmtUSD(snap.totals.combinedRevenueCents),
      avgOrderValue: fmtUSD(snap.totals.avgOrderValueCents),
      paidOrders: snap.totals.paidOrders,
      topOffers: snap.attribution.byOffer.slice(0, 3).map((o) => ({ name: o.name, revenue: fmtUSD(o.revenue) })),
      topPaths: snap.attribution.topPaths.slice(0, 3).map((p) => `${p.intent} → ${p.offer}`),
      topSource: snap.attribution.bySource[0]?.source ?? null,
    },
    clv: { totalCustomers: clv.totalCustomers, repeatRate: clv.repeatRate, avgLtv: fmtUSD(clv.avgLtvCents), top20Share: clv.top20RevenueSharePct },
    offers: { bestSeller: offers.bestSeller?.name ?? null, bestAcceptance: offers.bestAcceptance?.name ?? null, highestAvgValue: offers.highestAvgValue?.name ?? null },
    funnel: { overallConversion: funnel.overallConversionPct, biggestLeak: funnel.biggestLeak ? `${funnel.biggestLeak.from} → ${funnel.biggestLeak.to} (${funnel.biggestLeak.dropOffPct}% drop-off)` : null },
    bookings: { total: snap.bookings.total, pending: snap.bookings.pending, bookingToWonRate: snap.bookings.bookingToWonRate },
    forecast: forecast.horizons.map((h) => ({ horizon: h.label, projected: fmtUSD(h.projected), trend: h.trend, confidence: h.confidence })),
    opportunities: opportunities.map((o) => o.title),
    risks: risks.map((r) => r.title),
    actions: actions.map((a) => a.title),
  };

  let answer = "";
  let provider = "none", model = "none";
  try {
    const r = await runTask("executive_copy", {
      messages: [
        {
          role: "system",
          content:
            "You are the Revenue Copilot for Elevate360Official — a sharp Chief Revenue Officer. Answer the founder's revenue question directly and specifically using ONLY the data provided. " +
            "Lead with the answer, then 2-4 concrete reasons grounded in the numbers. End with one clear next step. " +
            "Recommendation-only: never instruct to change pricing, charge customers, issue refunds, modify infrastructure, send autonomous emails, or take destructive/irreversible action — frame those as suggestions for the founder to approve. " +
            "Plain prose, no markdown headers, no JSON. Max 180 words.",
        },
        { role: "user", content: scrub(JSON.stringify(payload), 5000) },
      ],
      temperature: 0.45, maxTokens: 500,
    }, { providerOverride: "openai" });
    answer = scrub(r.content, 1800).trim();
    provider = r.provider; model = r.model;
  } catch (e: any) {
    console.warn("[revenue-intel] copilot failed:", scrub(e?.message, 160));
    answer = "The revenue copilot is temporarily unavailable. Based on your current data, prioritise the top-ranked revenue opportunity and risk shown in your Insights tab.";
  }

  return {
    question: q,
    answer,
    grounding: {
      opportunities: opportunities.map((o) => o.title),
      risks: risks.map((r) => r.title),
      actions: actions.map((a) => a.title),
    },
    provider, model,
    generatedAt: new Date().toISOString(),
  };
}
