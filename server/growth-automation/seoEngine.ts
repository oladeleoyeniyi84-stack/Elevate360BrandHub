// Phase 66 — Growth Automation: SEO opportunity discovery.
//
// Deterministic SEO analysis over content inventory + traffic. Surfaces concrete,
// recommendation-only SEO opportunities (publishing cadence gaps, thin content,
// high-traffic pages to reinforce, topic coverage). No LLM. Never mutates.

import type { GrowthSnapshot } from "./aggregator";

export type SeoOpportunity = {
  title: string;
  detail: string;
  priority: number;   // 0-100
  confidence: number; // 0-100
};

export type SeoAnalysis = {
  blogCount: number;
  daysSinceLastPost: number | null;
  cadenceHealth: "healthy" | "slowing" | "stalled" | "none";
  topPages: Array<{ page: string; views: number }>;
  opportunities: SeoOpportunity[];
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function discoverSeoOpportunities(snap: GrowthSnapshot): SeoAnalysis {
  const opps: SeoOpportunity[] = [];
  const { blogCount, daysSinceLastPost, pages } = snap.seo;

  let cadenceHealth: SeoAnalysis["cadenceHealth"] = "none";
  if (blogCount === 0) {
    cadenceHealth = "none";
    opps.push({
      title: "Publish your first SEO content cluster",
      detail: "There are no published blog posts yet. A foundational cluster (3–5 posts) around your core intents — apps, books, art, music — builds the organic surface area search engines and AI assistants can index and cite.",
      priority: 82, confidence: 80,
    });
  } else if (daysSinceLastPost == null) {
    cadenceHealth = "slowing";
  } else if (daysSinceLastPost <= 14) {
    cadenceHealth = "healthy";
  } else if (daysSinceLastPost <= 45) {
    cadenceHealth = "slowing";
    opps.push({
      title: `Revive publishing cadence (${daysSinceLastPost} days since last post)`,
      detail: `Your last blog post was ${daysSinceLastPost} days ago. Search visibility compounds with consistency — a steady cadence (every 1–2 weeks) protects rankings and keeps the brand surfacing in AI answers.`,
      priority: 64, confidence: 72,
    });
  } else {
    cadenceHealth = "stalled";
    opps.push({
      title: `Content has stalled (${daysSinceLastPost} days since last post)`,
      detail: `It has been ${daysSinceLastPost} days since your last published post. Long gaps erode organic momentum. Schedule a recovery batch of 2–3 posts targeting your highest-intent topics.`,
      priority: 76, confidence: 76,
    });
  }

  if (blogCount > 0 && blogCount < 5) {
    opps.push({
      title: `Thin content library (${blogCount} post${blogCount === 1 ? "" : "s"})`,
      detail: `A library of ${blogCount} post(s) gives search engines little to rank. Expanding to 8–12 cornerstone pieces across your product lines materially widens organic reach and internal linking opportunities.`,
      priority: 60, confidence: 70,
    });
  }

  const topPage = pages[0];
  if (topPage && topPage.views > 0) {
    opps.push({
      title: `Reinforce your highest-traffic page (${topPage.page})`,
      detail: `"${topPage.page}" draws the most traffic (${topPage.views} views). Adding supporting blog content, internal links, and clear CTAs to this page converts existing attention into leads and SEO authority.`,
      priority: clamp(56 + Math.min(20, topPage.views / 5)), confidence: 66,
    });
  }

  // Topic coverage gap: top converting intent with no obvious content match.
  const topIntent = snap.leadScoring.topIntent;
  if (topIntent && blogCount < 8) {
    opps.push({
      title: `Create content for your top intent: "${topIntent}"`,
      detail: `"${topIntent}" is your most common visitor intent but is likely under-served by content. A dedicated guide or landing piece for this intent captures high-quality organic search demand.`,
      priority: 58, confidence: 64,
    });
  }

  return {
    blogCount,
    daysSinceLastPost,
    cadenceHealth,
    topPages: pages.slice(0, 8),
    opportunities: opps.sort((a, b) => b.priority - a.priority).slice(0, 8),
  };
}
