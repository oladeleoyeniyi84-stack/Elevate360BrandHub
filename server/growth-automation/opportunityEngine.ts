// Phase 66 — Growth Automation: opportunity engine.
//
// Derives growth Opportunities / Risks / Recommended Actions from the growth
// snapshot using deterministic rules (priority + confidence), then optionally
// enriches the single top item with a DeepSeek diagnostic (hard-locked, no
// fallback). Persists the batch atomically with a final scrub pass.
// Recommendation-only — never publishes, launches, or mutates anything.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { buildGrowthSnapshot, scrub, type GrowthSnapshot } from "./aggregator";
import { computeLeadScoring } from "./leadScoring";
import { discoverSeoOpportunities } from "./seoEngine";
import { computeConversionForecast } from "./conversionForecast";
import type { InsertGrowthAutoOpportunity, GrowthAutoOpportunity } from "@shared/schema";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Pure rule layer — turns a snapshot into growth opportunity items.
export function deriveGrowthOpportunities(snap: GrowthSnapshot): InsertGrowthAutoOpportunity[] {
  const items: InsertGrowthAutoOpportunity[] = [];
  const leads = computeLeadScoring(snap);
  const seo = discoverSeoOpportunities(snap);
  const forecast = computeConversionForecast(
    snap.series.map((p) => ({ date: p.date, visits: p.visits, conversions: p.conversions })),
  );
  const f30 = forecast.horizons.find((h) => h.horizonDays === 30);

  // ── SEO opportunities (from the deterministic SEO engine) ───────────────────
  for (const o of seo.opportunities.slice(0, 4)) {
    items.push({
      kind: "seo", area: "seo",
      title: o.title, detail: o.detail,
      priority: clamp(o.priority), confidence: clamp(o.confidence), source: "rules",
    });
  }

  // ── Lead scoring ────────────────────────────────────────────────────────────
  if (leads.total > 0 && leads.captureRate < 25) {
    items.push({
      kind: "lead", area: "leads",
      title: `Low email capture rate (${leads.captureRate}%)`,
      detail: `Only ${leads.emailCaptured} of ${leads.total} visitors shared an email. A stronger lead magnet or better-timed capture prompt converts existing traffic into a reachable audience — the cheapest growth lever you have.`,
      priority: clamp(70 + (25 - leads.captureRate)), confidence: 74, source: "rules",
    });
  }
  if (leads.hot > 0) {
    items.push({
      kind: "lead", area: "leads",
      title: `${leads.hot} hot lead(s) ready to convert`,
      detail: `You have ${leads.hot} hot lead(s) in the pipeline. Prioritising personal follow-up while intent is high is the fastest path to new revenue from work already done.`,
      priority: clamp(72 + leads.hot * 3), confidence: 82, source: "rules",
    });
  }
  if (leads.total >= 5 && leads.qualifyRate < 20) {
    items.push({
      kind: "lead", area: "leads",
      title: `Lead qualification is low (${leads.qualifyRate}%)`,
      detail: `Few captured leads reach "qualified". Tightening concierge qualification questions and routing improves the quality of every downstream conversion.`,
      priority: clamp(58 + (20 - leads.qualifyRate)), confidence: 66, source: "rules",
    });
  }

  // ── Conversion forecast ─────────────────────────────────────────────────────
  if (f30 && f30.trend === "up" && f30.confidence >= 30) {
    items.push({
      kind: "conversion", area: "forecast",
      title: `Conversion rate trending up (+${f30.changePct}%, 30d)`,
      detail: `The 30-day conversion trend is rising (toward ~${f30.projected}%). Pour fuel on what's working — a timely campaign captures the momentum before it cools.`,
      priority: clamp(60 + f30.changePct), confidence: clamp(f30.confidence), source: "forecast",
    });
  }
  if (f30 && f30.trend === "down" && f30.confidence >= 25) {
    items.push({
      kind: "conversion", area: "forecast",
      title: `Conversion rate trending down (${f30.changePct}%, 30d)`,
      detail: `The 30-day conversion trend is declining (toward ~${f30.projected}%). Investigate funnel friction, offer relevance, and traffic quality before the slide compounds.`,
      priority: clamp(78 + Math.abs(f30.changePct)), confidence: clamp(f30.confidence), source: "forecast",
    });
  }

  // ── Funnel ──────────────────────────────────────────────────────────────────
  const stages = snap.funnel.stages;
  let biggestLeak: { from: string; to: string; dropOff: number } | null = null;
  for (let i = 0; i < stages.length - 1; i++) {
    const a = stages[i], b = stages[i + 1];
    if (a.count > 0) {
      const dropOff = Math.round((1 - b.count / a.count) * 100);
      if (!biggestLeak || dropOff > biggestLeak.dropOff) biggestLeak = { from: a.name, to: b.name, dropOff };
    }
  }
  if (biggestLeak && biggestLeak.dropOff >= 50) {
    items.push({
      kind: "conversion", area: "funnel",
      title: `Biggest funnel leak: ${biggestLeak.from} → ${biggestLeak.to} (${biggestLeak.dropOff}% drop-off)`,
      detail: `This is your largest conversion leak. Fixing this single step — clearer CTA, less friction, stronger proof — has the highest growth payoff in the funnel.`,
      priority: clamp(68 + biggestLeak.dropOff / 3), confidence: 74, source: "rules",
    });
  }

  // ── Traffic / sources ───────────────────────────────────────────────────────
  if (snap.traffic.totalViews === 0) {
    items.push({
      kind: "campaign", area: "traffic",
      title: `No tracked traffic yet — prioritise acquisition`,
      detail: `There is little or no recorded page traffic. The first growth priority is consistent acquisition: publish content, activate your social channels, and drive referral traffic to start the data flywheel.`,
      priority: 80, confidence: 78, source: "rules",
    });
  } else {
    const bestSource = [...snap.sources].sort((a, b) => b.qualityScore - a.qualityScore)[0];
    if (bestSource && bestSource.qualityScore > 0) {
      items.push({
        kind: "campaign", area: "traffic",
        title: `Scale your highest-quality source: ${bestSource.source}`,
        detail: `"${bestSource.source}" has your best quality score (${bestSource.qualityScore}) with ${bestSource.chatLeads} chat lead(s). Concentrating campaign effort on this channel compounds returns faster than spreading thin.`,
        priority: clamp(60 + Math.min(20, bestSource.qualityScore / 5)), confidence: 68, source: "rules",
      });
    }
  }

  // ── Content / social ────────────────────────────────────────────────────────
  items.push({
    kind: "content", area: "content",
    title: `Generate this period's content ideas`,
    detail: `Open the Content tab to produce search-worthy content ideas grounded in your top intents and SEO gaps, then draft the highest-priority piece for review.`,
    priority: 50, confidence: 70, source: "rules",
  });
  items.push({
    kind: "social", area: "social",
    title: `Draft a social publishing workflow`,
    detail: `Activate your social channels (${snap.socialChannels.map((c) => c.label).join(", ")}) with a batch of on-brand drafts in the Social tab — recommendation-only, ready for your approval before posting.`,
    priority: 46, confidence: 66, source: "rules",
  });
  items.push({
    kind: "campaign", area: "campaign",
    title: `Plan a growth campaign for your top objective`,
    detail: `Use the Campaigns tab to generate a structured, approval-gated campaign plan around your strongest converting path. Nothing launches without your explicit approval.`,
    priority: 48, confidence: 68, source: "rules",
  });

  if (snap.aiOps.openai !== "configured" || snap.aiOps.deepseek !== "configured") {
    items.push({
      kind: "general", area: "general",
      title: `AI provider not fully configured`,
      detail: `One or more AI providers is not "configured". Content research, campaign planning, and the growth copilot degrade without both providers healthy.`,
      priority: 62, confidence: 90, source: "rules",
    });
  }

  return items
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, 20);
}

// Full generation: build snapshot, derive items, enrich top item, persist atomically.
export async function generateGrowthOpportunities(): Promise<GrowthAutoOpportunity[]> {
  const snap = await buildGrowthSnapshot();
  const items = deriveGrowthOpportunities(snap);

  // Best-effort DeepSeek diagnostic enrichment of the single top item (no fallback).
  try {
    const top = items[0];
    if (top) {
      const r = await runTask("diagnostics", {
        messages: [
          { role: "system", content: "You are a Senior Growth Analyst. In ONE short sentence (max 30 words), give a concrete, safe next step for the founder. Recommendation-only — never instruct to publish autonomously, spend money, change pricing, or take irreversible action. No JSON, no preamble." },
          { role: "user", content: scrub(`Growth opportunity: ${top.title}. Context: ${top.detail}`, 600) },
        ],
        temperature: 0.3, maxTokens: 80,
      }, { providerOverride: "deepseek" });
      const tip = scrub(r.content, 240).trim();
      if (tip) top.detail = `${top.detail}\n\nDiagnostic: ${tip}`;
    }
  } catch (e: any) {
    console.warn("[growth-automation] opportunity enrichment failed:", scrub(e?.message, 160));
  }

  // Final scrub pass on EVERY persisted string field before persistence.
  const scrubbed: InsertGrowthAutoOpportunity[] = items.map((i) => ({
    ...i,
    title: scrub(i.title, 200),
    detail: scrub(i.detail, 2000),
    area: scrub(i.area, 40),
    kind: scrub(i.kind, 20),
    source: scrub(i.source, 40),
  }));

  return storage.replaceGrowthAutoOpportunities(scrubbed);
}
