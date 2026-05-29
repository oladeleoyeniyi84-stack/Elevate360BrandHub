// Phase 64 — Founder Intelligence: AI Executive Reports.
//
// Generates daily / weekly / monthly / quarterly executive reports. OpenAI
// synthesizes the executive narrative (hard-locked, no fallback) over a
// scrubbed snapshot + deterministic forecasts. Persisted for the founder.
// Recommendation-only; mutates nothing operational.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { buildIntelSnapshot, scrub } from "./aggregator";
import { computeForecasts } from "./forecastEngine";
import { deriveDecisionItems } from "./decisionEngine";
import type { FounderIntelReport } from "@shared/schema";

export type PeriodType = "daily" | "weekly" | "monthly" | "quarterly";
export const PERIODS: PeriodType[] = ["daily", "weekly", "monthly", "quarterly"];

const PERIOD_FRAMING: Record<PeriodType, string> = {
  daily: "Today's focus: the single most important thing to do now and what to watch.",
  weekly: "This week: momentum, what moved, and the priorities for the next 7 days.",
  monthly: "This month: trends, what's working vs not, and strategic adjustments.",
  quarterly: "This quarter: strategic direction, big bets, and what Elevate360 should launch next.",
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

export async function generateExecutiveReport(period: PeriodType): Promise<FounderIntelReport> {
  const snap = await buildIntelSnapshot();
  const forecasts = computeForecasts(snap.series);
  const decisions = deriveDecisionItems(snap);

  const opportunities = decisions.filter((d) => d.kind === "opportunity").slice(0, 5);
  const risks = decisions.filter((d) => d.kind === "risk").slice(0, 5);
  const actions = decisions.filter((d) => d.kind === "action").slice(0, 5);

  const payload = {
    period,
    revenue: {
      combined: fmtUSD(snap.revenue.combinedRevenueCents),
      paidOrders: snap.revenue.paidOrders,
      wonDeals: snap.revenue.wonDeals,
      avgOrderValue: fmtUSD(snap.revenue.avgOrderValueCents),
      topOffers: snap.revenue.byOffer.slice(0, 3).map((o) => ({ name: o.name, revenue: fmtUSD(o.revenue), count: o.count })),
    },
    pipeline: {
      totalLeads: snap.pipeline.totalLeads, hot: snap.pipeline.hot, qualified: snap.pipeline.qualified,
      bookedThisWeek: snap.pipeline.bookedThisWeek, wonThisMonth: snap.pipeline.wonThisMonth,
      topIntent: snap.pipeline.topIntent,
    },
    growth: { recommendations: snap.growth.recommendations, top: snap.growth.topRecommendation },
    experiments: { running: snap.experiments.running },
    personalization: { segments: snap.personalization.segments, avgCvr: snap.personalization.avgCvr },
    aiOps: { openai: snap.aiOps.openai, deepseek: snap.aiOps.deepseek, premium: snap.aiOps.premiumModel, automation: snap.aiOps.automationModel },
    forecasts: forecasts.map((f) => ({ metric: f.metric, trend: f.trend, changePct: f.changePct, confidence: f.confidence })),
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
            "You are the Chief of Staff to the founder of Elevate360Official. Write a crisp executive briefing. " +
            PERIOD_FRAMING[period] +
            " Structure: (1) State of the business in 2 sentences. (2) Biggest opportunity. (3) Biggest risk. (4) The single most important action right now. " +
            "Be specific to the data. Recommendation-only — never instruct to change pricing, charge customers, or take destructive/irreversible action. Plain prose, no markdown headers, no JSON. Max 220 words.",
        },
        { role: "user", content: scrub(JSON.stringify(payload), 5000) },
      ],
      temperature: 0.4, maxTokens: 600,
    }, { providerOverride: "openai" });
    summary = scrub(r.content, 2400).trim();
    providerMeta = { provider: r.provider, model: r.model, latencyMs: r.latencyMs };
  } catch (e: any) {
    console.warn("[founder-intel] report synthesis failed:", scrub(e?.message, 160));
    summary = "Executive synthesis is temporarily unavailable. The structured intelligence below reflects your current cross-system state.";
  }

  const title = `${period.charAt(0).toUpperCase() + period.slice(1)} Executive Briefing — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Final scrub on EVERYTHING persisted (summary + every string in sections).
  const sections = deepScrub({
    revenue: payload.revenue,
    pipeline: payload.pipeline,
    growth: payload.growth,
    experiments: payload.experiments,
    personalization: payload.personalization,
    aiOps: payload.aiOps,
    forecasts,
    opportunities: opportunities.map((o) => ({ title: o.title, detail: o.detail, priority: o.priority, confidence: o.confidence })),
    risks: risks.map((r) => ({ title: r.title, detail: r.detail, priority: r.priority, confidence: r.confidence })),
    actions: actions.map((a) => ({ title: a.title, detail: a.detail, priority: a.priority, confidence: a.confidence })),
  });

  return storage.createFounderIntelReport({
    periodType: period,
    title: scrub(title, 240),
    summary: scrub(summary, 2400),
    sections: sections as any,
    providerMetadata: providerMeta,
    source: providerMeta.provider ?? "openai",
  });
}
