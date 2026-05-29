// Phase 66 — Growth Automation: Growth Copilot.
//
// Answers strategic growth questions ("How do I get more traffic?", "Which
// channel should I focus on?", "Why aren't leads converting?", "What should I
// publish next?") grounded in the live growth snapshot, analytics, and forecast.
// OpenAI synthesis is hard-locked (no fallback). Recommendation-only.

import { runTask } from "../ai/modelRouter";
import { buildGrowthSnapshot, scrub } from "./aggregator";
import { computeLeadScoring } from "./leadScoring";
import { discoverSeoOpportunities } from "./seoEngine";
import { computeConversionForecast } from "./conversionForecast";
import { deriveGrowthOpportunities } from "./opportunityEngine";

export const SUGGESTED_QUESTIONS = [
  "How do I get more traffic?",
  "Which channel should I focus on?",
  "Why aren't my leads converting?",
  "What should I publish next?",
];

export type GrowthCopilotAnswer = {
  question: string;
  answer: string;
  grounding: { opportunities: string[]; risks: string[]; actions: string[] };
  provider: string;
  model: string;
  generatedAt: string;
};

export async function askGrowthCopilot(question: string): Promise<GrowthCopilotAnswer> {
  const q = scrub(question, 500).trim().slice(0, 500);
  const snap = await buildGrowthSnapshot();
  const leads = computeLeadScoring(snap);
  const seo = discoverSeoOpportunities(snap);
  const forecast = computeConversionForecast(snap.series.map((p) => ({ date: p.date, visits: p.visits, conversions: p.conversions })));
  const items = deriveGrowthOpportunities(snap);

  const opportunities = items.filter((d) => ["seo", "content", "campaign", "lead", "social"].includes(d.kind ?? "")).slice(0, 5);
  const risks = items.filter((d) => d.kind === "conversion" || d.area === "funnel").slice(0, 5);
  const actions = items.filter((d) => ["campaign", "content", "social"].includes(d.kind ?? "")).slice(0, 5);

  const payload = {
    question: q,
    traffic: { totalViews: snap.traffic.totalViews, topPages: snap.traffic.topPages.slice(0, 3).map((p) => p.page) },
    leadScoring: { total: leads.total, hot: leads.hot, qualified: leads.qualified, captureRate: leads.captureRate, readiness: leads.readinessScore, topIntent: leads.topIntent },
    seo: { blogCount: seo.blogCount, cadence: seo.cadenceHealth, topOpportunity: seo.opportunities[0]?.title ?? null },
    sources: snap.sources.slice(0, 3).map((s) => ({ source: s.source, quality: s.qualityScore })),
    funnel: { stages: snap.funnel.stages.map((s) => ({ name: s.name, rate: s.rate })) },
    conversionForecast: forecast.horizons.map((h) => ({ horizon: h.label, projected: `${h.projected}%`, trend: h.trend })),
    channels: snap.socialChannels.map((c) => c.label),
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
            "You are the Growth Copilot for Elevate360Official — a sharp Chief Growth Officer. Answer the founder's growth question directly and specifically using ONLY the data provided. " +
            "Lead with the answer, then 2-4 concrete reasons grounded in the numbers. End with one clear next step. " +
            "Recommendation-only: never instruct to publish autonomously, spend money, change pricing, modify infrastructure, send autonomous emails, or take destructive/irreversible action — frame those as suggestions for the founder to approve. " +
            "Plain prose, no markdown headers, no JSON. Max 180 words.",
        },
        { role: "user", content: scrub(JSON.stringify(payload), 5000) },
      ],
      temperature: 0.45, maxTokens: 500,
    }, { providerOverride: "openai" });
    answer = scrub(r.content, 1800).trim();
    provider = r.provider; model = r.model;
  } catch (e: any) {
    console.warn("[growth-automation] copilot failed:", scrub(e?.message, 160));
    answer = "The growth copilot is temporarily unavailable. Based on your current data, prioritise the top-ranked growth opportunity and risk shown in your Opportunities tab.";
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
