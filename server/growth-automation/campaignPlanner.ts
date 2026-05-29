// Phase 66 — Growth Automation: campaign planning.
//
// Generates a structured, recommendation-only growth campaign plan using OpenAI
// (hard-locked, no fallback) grounded in the growth snapshot. The plan is
// persisted as a DRAFT campaign — nothing is launched or published. Execution
// (launch / publish) always requires explicit founder approval downstream.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { buildGrowthSnapshot, scrub } from "./aggregator";
import type { GrowthAutoCampaign } from "@shared/schema";

export const CHANNELS = ["blog", "instagram", "youtube", "email", "etsy", "audiomack", "multi"] as const;
export type Channel = (typeof CHANNELS)[number];

// Recursively scrub every string before persistence.
function deepScrub<T>(v: T): T {
  if (typeof v === "string") return scrub(v, 1200) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => deepScrub(x)) as unknown as T;
  if (v && typeof v === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(v as any)) out[k] = deepScrub(val);
    return out;
  }
  return v;
}

export type CampaignPlan = {
  summary: string;
  audience: string;
  steps: string[];
  schedule: string[];
  copy: string[];
  kpis: string[];
};

export async function planCampaign(input: { objective: string; channel: Channel }): Promise<GrowthAutoCampaign> {
  const objective = scrub(input.objective, 200).trim();
  const channel: Channel = (CHANNELS.includes(input.channel) ? input.channel : "multi") as Channel;
  const snap = await buildGrowthSnapshot();

  const context = {
    objective,
    channel,
    topIntent: snap.leadScoring.topIntent,
    topOffers: snap.attribution.byOffer.slice(0, 4).map((o) => o.name),
    topPaths: snap.attribution.topPaths.slice(0, 3).map((p) => `${p.intent} → ${p.offer}`),
    leadScoring: { total: snap.leadScoring.total, qualified: snap.leadScoring.qualified, hot: snap.leadScoring.hot },
    funnelStages: snap.funnel.stages.map((s) => ({ name: s.name, rate: s.rate })),
    channels: snap.socialChannels.map((c) => c.label),
  };

  let plan: CampaignPlan = {
    summary: `Recommendation-only ${channel} campaign for: ${objective}.`,
    audience: snap.leadScoring.topIntent ? `Visitors with "${snap.leadScoring.topIntent}" intent` : "Brand audience",
    steps: [], schedule: [], copy: [], kpis: [],
  };
  let providerMeta: any = { provider: "none", model: "none" };

  try {
    const r = await runTask("executive_copy", {
      messages: [
        {
          role: "system",
          content:
            "You are a senior growth marketer for Elevate360Official. Design a concrete, recommendation-only campaign plan for the given objective and channel, grounded ONLY in the data provided. " +
            "Recommendation-only: the plan is a proposal for the founder to approve — never assume autonomous publishing, paid spend, pricing changes, or email broadcasts will happen automatically. " +
            "Return STRICT JSON with keys: summary (string), audience (string), steps (string[] 3-6 items), schedule (string[] 3-6 items), copy (string[] 2-4 short ready-to-use lines), kpis (string[] 2-4 measurable metrics). No prose, no markdown.",
        },
        { role: "user", content: scrub(JSON.stringify(context), 4000) },
      ],
      temperature: 0.5, maxTokens: 900,
    }, { providerOverride: "openai" });

    const text = scrub(r.content, 6000).trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text);
    plan = {
      summary: scrub(parsed?.summary, 600) || plan.summary,
      audience: scrub(parsed?.audience, 300) || plan.audience,
      steps: Array.isArray(parsed?.steps) ? parsed.steps.slice(0, 8).map((s: any) => scrub(s, 300)) : [],
      schedule: Array.isArray(parsed?.schedule) ? parsed.schedule.slice(0, 8).map((s: any) => scrub(s, 200)) : [],
      copy: Array.isArray(parsed?.copy) ? parsed.copy.slice(0, 6).map((s: any) => scrub(s, 400)) : [],
      kpis: Array.isArray(parsed?.kpis) ? parsed.kpis.slice(0, 6).map((s: any) => scrub(s, 200)) : [],
    };
    providerMeta = { provider: r.provider, model: r.model, latencyMs: r.latencyMs };
  } catch (e: any) {
    console.warn("[growth-automation] campaign plan failed:", scrub(e?.message, 160));
  }

  const title = scrub(`${channel.charAt(0).toUpperCase() + channel.slice(1)} campaign: ${objective}`, 200);
  const campaignKey = `camp_${channel}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return storage.createGrowthAutoCampaign({
    campaignKey,
    channel,
    objective,
    title,
    plan: deepScrub(plan) as any,
    providerMetadata: providerMeta,
    status: "draft",
    approvalRequestId: null,
    source: "campaign",
  });
}
