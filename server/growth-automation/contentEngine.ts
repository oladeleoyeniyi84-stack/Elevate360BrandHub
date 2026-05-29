// Phase 66 — Growth Automation: content opportunity generation.
//
// Uses DeepSeek (hard-locked, no fallback) to research content ideas grounded in
// the brand's top intents, offers, and SEO gaps. Returns recommendation-only
// content ideas — nothing is published. A deterministic fallback guarantees ideas
// even when the provider is unavailable.

import { runTask } from "../ai/modelRouter";
import { buildGrowthSnapshot, scrub, type GrowthSnapshot } from "./aggregator";
import { discoverSeoOpportunities } from "./seoEngine";

export type ContentIdea = {
  title: string;
  angle: string;
  targetIntent: string;
  channel: string;
};

export type ContentOpportunities = {
  ideas: ContentIdea[];
  provider: string;
  model: string;
  generatedAt: string;
};

function fallbackIdeas(snap: GrowthSnapshot): ContentIdea[] {
  const intent = snap.leadScoring.topIntent ?? "brand";
  return [
    { title: `The story behind Elevate360: building products that elevate`, angle: "Brand narrative + mission", targetIntent: intent, channel: "blog" },
    { title: `How our apps solve real problems (Bondedlove, Healthwise, Video Crafter)`, angle: "Product education", targetIntent: "apps", channel: "blog" },
    { title: `Inside Elevate360 Art Studio: from concept to canvas`, angle: "Behind-the-scenes", targetIntent: "art", channel: "blog" },
    { title: `What our books teach about growth and resilience`, angle: "Thought leadership", targetIntent: "books", channel: "blog" },
  ];
}

export async function generateContentOpportunities(): Promise<ContentOpportunities> {
  const snap = await buildGrowthSnapshot();
  const seo = discoverSeoOpportunities(snap);

  const payload = {
    topIntent: snap.leadScoring.topIntent,
    topPaths: snap.attribution.topPaths.slice(0, 4).map((p) => `${p.intent} → ${p.offer}`),
    topOffers: snap.attribution.byOffer.slice(0, 4).map((o) => o.name),
    recentTitles: snap.seo.recentTitles,
    seoGaps: seo.opportunities.slice(0, 4).map((o) => o.title),
    channels: snap.socialChannels.map((c) => c.channel),
  };

  let ideas: ContentIdea[] = [];
  let provider = "none", model = "none";
  try {
    const r = await runTask("diagnostics", {
      messages: [
        {
          role: "system",
          content:
            "You are an SEO content strategist for Elevate360Official (mobile apps, Amazon KDP books, art studio, music). " +
            "Propose 6 specific, search-worthy content ideas grounded ONLY in the data provided. Avoid duplicating recent titles. " +
            "Return STRICT JSON: an array of objects with keys title, angle, targetIntent, channel (one of: blog, instagram, youtube, email). No prose, no markdown.",
        },
        { role: "user", content: scrub(JSON.stringify(payload), 3000) },
      ],
      temperature: 0.6, maxTokens: 700,
    }, { providerOverride: "deepseek" });

    const text = scrub(r.content, 4000).trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      ideas = parsed.slice(0, 8).map((x: any) => ({
        title: scrub(x?.title, 160),
        angle: scrub(x?.angle, 200),
        targetIntent: scrub(x?.targetIntent, 60),
        channel: scrub(x?.channel, 30) || "blog",
      })).filter((x: ContentIdea) => x.title);
    }
    provider = r.provider; model = r.model;
  } catch (e: any) {
    console.warn("[growth-automation] content ideas failed:", scrub(e?.message, 160));
  }

  if (ideas.length === 0) ideas = fallbackIdeas(snap);

  return { ideas, provider, model, generatedAt: new Date().toISOString() };
}
