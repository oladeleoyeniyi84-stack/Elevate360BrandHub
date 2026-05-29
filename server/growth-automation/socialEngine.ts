// Phase 66 — Growth Automation: social publishing workflows.
//
// Drafts channel-specific social posts as a recommendation-only workflow using
// OpenAI (hard-locked, no fallback). The draft is persisted as a campaign with
// source="social" and status="draft" — NOTHING is published. Publishing requires
// explicit founder approval downstream and is never performed autonomously.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { buildGrowthSnapshot, scrub } from "./aggregator";
import { CHANNELS, type Channel } from "./campaignPlanner";
import type { GrowthAutoCampaign } from "@shared/schema";

export const SOCIAL_CHANNELS = ["instagram", "youtube", "email", "blog"] as const;

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

export type SocialPost = {
  hook: string;
  body: string;
  hashtags: string[];
  cta: string;
};

export async function draftSocialWorkflow(input: { channel: Channel; topic: string }): Promise<GrowthAutoCampaign> {
  const channel: Channel = (CHANNELS.includes(input.channel) ? input.channel : "instagram") as Channel;
  const topic = scrub(input.topic, 200).trim();
  const snap = await buildGrowthSnapshot();

  const context = {
    channel,
    topic,
    brand: "Elevate360Official — mobile apps, KDP books, art studio, music",
    brandQuote: "Elevate the world, one product at a time.",
    topIntent: snap.leadScoring.topIntent,
    topOffers: snap.attribution.byOffer.slice(0, 3).map((o) => o.name),
  };

  let posts: SocialPost[] = [];
  let providerMeta: any = { provider: "none", model: "none" };

  try {
    const r = await runTask("executive_copy", {
      messages: [
        {
          role: "system",
          content:
            `You are a social media manager for Elevate360Official. Draft 3 ready-to-review ${channel} posts about the given topic, on-brand and grounded ONLY in the data provided. ` +
            "Recommendation-only: these are drafts for the founder to review and approve before any posting — never imply they will be auto-published. " +
            "Return STRICT JSON: an array of 3 objects with keys hook (string), body (string), hashtags (string[]), cta (string). No prose, no markdown.",
        },
        { role: "user", content: scrub(JSON.stringify(context), 3000) },
      ],
      temperature: 0.6, maxTokens: 900,
    }, { providerOverride: "openai" });

    const text = scrub(r.content, 6000).trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      posts = parsed.slice(0, 5).map((x: any) => ({
        hook: scrub(x?.hook, 240),
        body: scrub(x?.body, 800),
        hashtags: Array.isArray(x?.hashtags) ? x.hashtags.slice(0, 12).map((h: any) => scrub(h, 40)) : [],
        cta: scrub(x?.cta, 160),
      })).filter((p: SocialPost) => p.hook || p.body);
    }
    providerMeta = { provider: r.provider, model: r.model, latencyMs: r.latencyMs };
  } catch (e: any) {
    console.warn("[growth-automation] social draft failed:", scrub(e?.message, 160));
  }

  const title = scrub(`${channel.charAt(0).toUpperCase() + channel.slice(1)} social drafts: ${topic}`, 200);
  const campaignKey = `social_${channel}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return storage.createGrowthAutoCampaign({
    campaignKey,
    channel,
    objective: scrub(`Social workflow: ${topic}`, 200),
    title,
    plan: deepScrub({ summary: `Recommendation-only ${channel} social drafts.`, posts }) as any,
    providerMetadata: providerMeta,
    status: "draft",
    approvalRequestId: null,
    source: "social",
  });
}
