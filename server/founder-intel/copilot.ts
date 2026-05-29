// Phase 64 — Founder Intelligence: Founder Copilot.
//
// Answers strategic founder questions ("What should I focus on today?",
// "What is hurting growth?", "What opportunity is biggest?", "What should
// Elevate360 launch next?") grounded in the live cross-system snapshot,
// forecasts, decision items, and founder/brand memory. OpenAI synthesis is
// hard-locked (no fallback). Recommendation-only.

import { runTask } from "../ai/modelRouter";
import { buildIntelSnapshot, scrub } from "./aggregator";
import { computeForecasts } from "./forecastEngine";
import { deriveDecisionItems } from "./decisionEngine";
import { searchMemory } from "../memory/memoryEngine";

export const SUGGESTED_QUESTIONS = [
  "What should I focus on today?",
  "What is hurting growth?",
  "What opportunity is biggest?",
  "What should Elevate360 launch next?",
];

const fmtUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);

export type CopilotAnswer = {
  question: string;
  answer: string;
  grounding: { opportunities: string[]; risks: string[]; actions: string[] };
  provider: string;
  model: string;
  generatedAt: string;
};

export async function askCopilot(question: string): Promise<CopilotAnswer> {
  const q = scrub(question, 500).trim().slice(0, 500);
  const snap = await buildIntelSnapshot();
  const forecasts = computeForecasts(snap.series);
  const decisions = deriveDecisionItems(snap);

  const opportunities = decisions.filter((d) => d.kind === "opportunity").slice(0, 5);
  const risks = decisions.filter((d) => d.kind === "risk").slice(0, 5);
  const actions = decisions.filter((d) => d.kind === "action").slice(0, 5);

  // Pull strategic founder/brand memory relevant to the question.
  let memoryNotes: string[] = [];
  try {
    const founderMem = await searchMemory({ query: q, scope: "founder", limit: 4 });
    const brandMem = await searchMemory({ query: q, scope: "brand_knowledge", limit: 3 });
    memoryNotes = [...founderMem, ...brandMem].map((m) => scrub(m.content, 300));
  } catch { /* memory optional */ }

  const payload = {
    question: q,
    revenue: { combined: fmtUSD(snap.revenue.combinedRevenueCents), avgOrderValue: fmtUSD(snap.revenue.avgOrderValueCents), topOffers: snap.revenue.byOffer.slice(0, 3).map((o) => o.name) },
    pipeline: { totalLeads: snap.pipeline.totalLeads, hot: snap.pipeline.hot, qualified: snap.pipeline.qualified, topIntent: snap.pipeline.topIntent, topRecommendedOffer: snap.pipeline.topRecommendedOffer },
    growth: { recommendations: snap.growth.recommendations, top: snap.growth.topRecommendation },
    experiments: { running: snap.experiments.running },
    personalization: { segments: snap.personalization.segments, avgCvr: snap.personalization.avgCvr },
    forecasts: forecasts.map((f) => ({ metric: f.metric, trend: f.trend, changePct: f.changePct, confidence: f.confidence })),
    opportunities: opportunities.map((o) => o.title),
    risks: risks.map((r) => r.title),
    actions: actions.map((a) => a.title),
    memoryNotes,
  };

  let answer = "";
  let provider = "none", model = "none";
  try {
    const r = await runTask("executive_copy", {
      messages: [
        {
          role: "system",
          content:
            "You are the Founder Copilot for Elevate360Official — a sharp, strategic chief of staff. Answer the founder's question directly and specifically using ONLY the data provided. " +
            "Lead with the answer, then 2-4 concrete reasons grounded in the numbers. End with one clear next step. " +
            "Recommendation-only: never instruct to change pricing, charge customers, modify infrastructure, send autonomous emails, or take destructive/irreversible action — frame those as suggestions for the founder to approve. " +
            "Plain prose, no markdown headers, no JSON. Max 180 words.",
        },
        { role: "user", content: scrub(JSON.stringify(payload), 5000) },
      ],
      temperature: 0.45, maxTokens: 500,
    }, { providerOverride: "openai" });
    answer = scrub(r.content, 1800).trim();
    provider = r.provider; model = r.model;
  } catch (e: any) {
    console.warn("[founder-intel] copilot failed:", scrub(e?.message, 160));
    answer = "The copilot is temporarily unavailable. Based on your current data, prioritise the top-ranked opportunity and risk shown in your Decision Center.";
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
