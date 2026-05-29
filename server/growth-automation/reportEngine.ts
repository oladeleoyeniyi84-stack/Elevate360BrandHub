// Phase 66 — Growth Automation: AI Executive Growth Reports.
//
// Generates daily / weekly / monthly / quarterly executive growth reports. OpenAI
// synthesizes the executive narrative (hard-locked, no fallback) over a scrubbed
// growth snapshot + deterministic analytics. Persisted for the founder.
// Recommendation-only; mutates nothing operational.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { buildGrowthSnapshot, scrub } from "./aggregator";
import { computeLeadScoring } from "./leadScoring";
import { discoverSeoOpportunities } from "./seoEngine";
import { computeConversionForecast } from "./conversionForecast";
import { deriveGrowthOpportunities } from "./opportunityEngine";
import type { GrowthAutoReport } from "@shared/schema";

export type PeriodType = "daily" | "weekly" | "monthly" | "quarterly";
export const PERIODS: PeriodType[] = ["daily", "weekly", "monthly", "quarterly"];

const PERIOD_FRAMING: Record<PeriodType, string> = {
  daily: "Today's growth focus: what moved, what to watch, and the single most important growth action now.",
  weekly: "This week's growth: traffic, leads, content, and the priorities for the next 7 days.",
  monthly: "This month's growth: acquisition trends, lead quality, content cadence, and strategic adjustments.",
  quarterly: "This quarter's growth strategy: channel bets, audience expansion, and what Elevate360 should scale next.",
};

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

export async function generateGrowthReport(period: PeriodType): Promise<GrowthAutoReport> {
  const snap = await buildGrowthSnapshot();
  const leads = computeLeadScoring(snap);
  const seo = discoverSeoOpportunities(snap);
  const forecast = computeConversionForecast(snap.series.map((p) => ({ date: p.date, visits: p.visits, conversions: p.conversions })));
  const items = deriveGrowthOpportunities(snap);

  const opportunities = items.filter((d) => ["seo", "content", "campaign", "lead", "social"].includes(d.kind ?? "")).slice(0, 5);
  const risks = items.filter((d) => d.kind === "conversion" || d.area === "funnel").slice(0, 5);
  const actions = items.filter((d) => ["campaign", "content", "social"].includes(d.kind ?? "")).slice(0, 5);

  const payload = {
    period,
    traffic: { totalViews: snap.traffic.totalViews, topPages: snap.traffic.topPages.slice(0, 3).map((p) => `${p.page} (${p.views})`) },
    leadScoring: {
      total: leads.total, hot: leads.hot, qualified: leads.qualified,
      captureRate: leads.captureRate, qualifyRate: leads.qualifyRate, readiness: leads.readinessScore,
      topIntent: leads.topIntent,
    },
    seo: { blogCount: seo.blogCount, cadence: seo.cadenceHealth, daysSinceLastPost: seo.daysSinceLastPost, topOpportunity: seo.opportunities[0]?.title ?? null },
    content: { recentTitles: snap.seo.recentTitles.slice(0, 4) },
    sources: snap.sources.slice(0, 3).map((s) => ({ source: s.source, quality: s.qualityScore, leads: s.chatLeads })),
    funnel: { stages: snap.funnel.stages.map((s) => ({ name: s.name, rate: s.rate })) },
    conversionForecast: forecast.horizons.map((h) => ({ horizon: h.label, projected: `${h.projected}%`, trend: h.trend, confidence: h.confidence })),
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
            "You are the Chief Growth Officer to the founder of Elevate360Official. Write a crisp executive growth briefing. " +
            PERIOD_FRAMING[period] +
            " Structure: (1) State of growth in 2 sentences. (2) Biggest growth opportunity. (3) Biggest growth risk. (4) The single most important growth action right now. " +
            "Be specific to the data. Recommendation-only — never instruct to publish autonomously, spend money, change pricing, send autonomous emails, or take destructive/irreversible action; frame execution as proposals for founder approval. Plain prose, no markdown headers, no JSON. Max 220 words.",
        },
        { role: "user", content: scrub(JSON.stringify(payload), 5000) },
      ],
      temperature: 0.4, maxTokens: 600,
    }, { providerOverride: "openai" });
    summary = scrub(r.content, 2400).trim();
    providerMeta = { provider: r.provider, model: r.model, latencyMs: r.latencyMs };
  } catch (e: any) {
    console.warn("[growth-automation] report synthesis failed:", scrub(e?.message, 160));
    summary = "Executive growth synthesis is temporarily unavailable. The structured growth intelligence below reflects your current state.";
  }

  const title = `${period.charAt(0).toUpperCase() + period.slice(1)} Growth Briefing — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const sections = deepScrub({
    traffic: payload.traffic,
    leadScoring: payload.leadScoring,
    seo: payload.seo,
    content: payload.content,
    sources: payload.sources,
    funnel: payload.funnel,
    conversionForecast: payload.conversionForecast,
    opportunities: opportunities.map((o) => ({ title: o.title, detail: o.detail, priority: o.priority, confidence: o.confidence })),
    risks: risks.map((r) => ({ title: r.title, detail: r.detail, priority: r.priority, confidence: r.confidence })),
    actions: actions.map((a) => ({ title: a.title, detail: a.detail, priority: a.priority, confidence: a.confidence })),
  });

  return storage.createGrowthAutoReport({
    periodType: period,
    title: scrub(title, 240),
    summary: scrub(summary, 2400),
    sections: sections as any,
    providerMetadata: providerMeta,
    source: providerMeta.provider ?? "openai",
  });
}
