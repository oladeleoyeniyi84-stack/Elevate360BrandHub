// Phase 64 — Founder Intelligence: Decision Center.
//
// Derives Top Opportunities / Top Risks / Recommended Actions from the
// cross-system snapshot using deterministic rules (priority + confidence),
// then optionally enriches with a DeepSeek diagnostic summary (hard-locked,
// recommendation-only). Persists the batch atomically. Mutates nothing else.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { buildIntelSnapshot, scrub, type IntelSnapshot } from "./aggregator";
import { computeForecasts } from "./forecastEngine";
import type { InsertFounderDecisionItem, FounderDecisionItem } from "@shared/schema";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Pure rule layer — turns a snapshot into decision items.
export function deriveDecisionItems(snap: IntelSnapshot): InsertFounderDecisionItem[] {
  const items: InsertFounderDecisionItem[] = [];
  const forecasts = computeForecasts(snap.series);
  const revF = forecasts.find((f) => f.metric === "revenue");
  const leadF = forecasts.find((f) => f.metric === "leads");
  const trafficF = forecasts.find((f) => f.metric === "traffic");

  // ── Opportunities ──────────────────────────────────────────────────────────
  if (snap.revenue.topPaths.length > 0) {
    const top = snap.revenue.topPaths[0];
    items.push({
      kind: "opportunity", area: "revenue",
      title: `Double down on "${top.intent} → ${top.offer}"`,
      detail: `This path has produced ${top.count} conversion(s) and your strongest attributed revenue. Concentrating concierge routing and content toward it is your highest-leverage growth move.`,
      priority: clamp(78 + Math.min(12, top.count)), confidence: clamp(70 + Math.min(20, top.count * 3)),
      source: "rules",
    });
  }
  if (snap.pipeline.hot > 0) {
    items.push({
      kind: "opportunity", area: "concierge",
      title: `${snap.pipeline.hot} hot lead(s) ready to close`,
      detail: `You have ${snap.pipeline.hot} hot and ${snap.pipeline.qualified} qualified leads in pipeline. Prioritising personal follow-up here converts the warmest demand you already paid to acquire.`,
      priority: clamp(70 + snap.pipeline.hot * 4), confidence: 80, source: "rules",
    });
  }
  if (leadF && leadF.trend === "up" && leadF.confidence >= 30) {
    items.push({
      kind: "opportunity", area: "growth",
      title: `Lead momentum is building (+${leadF.changePct}% projected)`,
      detail: `Lead inflow is trending up. Capturing this with a timely offer or campaign compounds the momentum before it cools.`,
      priority: clamp(60 + leadF.changePct), confidence: clamp(leadF.confidence), source: "forecast",
    });
  }
  if (snap.growth.topRecommendation) {
    items.push({
      kind: "opportunity", area: "growth",
      title: `Act on growth recommendation`,
      detail: scrub(snap.growth.topRecommendation, 400),
      priority: 64, confidence: 62, source: "growth",
    });
  }

  // ── Risks ────────────────────────────────────────────────────────────────
  if (snap.urgency.overdueHotLeads > 0) {
    items.push({
      kind: "risk", area: "concierge",
      title: `${snap.urgency.overdueHotLeads} hot lead(s) going cold`,
      detail: `Overdue hot leads decay fast. Each day without contact materially lowers close probability — this is leaking revenue you already earned.`,
      priority: clamp(82 + snap.urgency.overdueHotLeads * 3), confidence: 85, source: "rules",
    });
  }
  if (snap.urgency.unrepliedContacts > 0) {
    items.push({
      kind: "risk", area: "concierge",
      title: `${snap.urgency.unrepliedContacts} unreplied contact message(s)`,
      detail: `Unanswered inbound erodes trust and conversion. Clearing this backlog protects brand reputation and recovers warm intent.`,
      priority: clamp(60 + snap.urgency.unrepliedContacts * 5), confidence: 78, source: "rules",
    });
  }
  if (revF && revF.trend === "down" && revF.confidence >= 25) {
    items.push({
      kind: "risk", area: "revenue",
      title: `Revenue trending down (${revF.changePct}% projected)`,
      detail: `The revenue trend line is pointing down for the coming week. Investigate funnel drop-off, offer mix, and traffic quality before the gap widens.`,
      priority: clamp(80 + Math.abs(revF.changePct)), confidence: clamp(revF.confidence), source: "forecast",
    });
  }
  if (trafficF && trafficF.trend === "down" && trafficF.confidence >= 25) {
    items.push({
      kind: "risk", area: "growth",
      title: `Traffic softening (${trafficF.changePct}% projected)`,
      detail: `Projected visits are declining. Top-of-funnel attention is your leading indicator — refresh content cadence and distribution channels.`,
      priority: clamp(65 + Math.abs(trafficF.changePct)), confidence: clamp(trafficF.confidence), source: "forecast",
    });
  }
  if (snap.aiOps.openai !== "configured" || snap.aiOps.deepseek !== "configured") {
    items.push({
      kind: "risk", area: "ai_ops",
      title: `AI provider not fully configured`,
      detail: `One or more AI providers is not reporting "configured". Concierge quality, automation, and these intelligence reports degrade without both providers healthy.`,
      priority: 72, confidence: 90, source: "rules",
    });
  }
  if (snap.memory.total > 0 && snap.memory.embeddingCoverage < 80) {
    items.push({
      kind: "risk", area: "memory",
      title: `Memory embedding coverage at ${snap.memory.embeddingCoverage}%`,
      detail: `A share of cognitive memories lack embeddings, weakening semantic recall for returning visitors. Verify the embeddings provider is reachable.`,
      priority: 50, confidence: 70, source: "rules",
    });
  }

  // ── Recommended actions ───────────────────────────────────────────────────
  if (snap.pipeline.emailCaptured > 0 && snap.pipeline.bookedThisWeek === 0) {
    items.push({
      kind: "action", area: "concierge",
      title: `Send a booking nudge to captured leads`,
      detail: `You captured ${snap.pipeline.emailCaptured} email(s) but booked none this week. A single consultation-invite touch is the cheapest path to a booked call.`,
      priority: 68, confidence: 72, source: "rules",
    });
  }
  if (snap.experiments.running === 0) {
    items.push({
      kind: "action", area: "experiments",
      title: `Launch one growth experiment`,
      detail: `No experiments are currently running. Even a single hero or offer A/B test restarts your learning loop and compounds over time.`,
      priority: 55, confidence: 65, source: "rules",
    });
  }
  if (snap.personalization.segments > 0 && snap.personalization.avgCvr < 1) {
    items.push({
      kind: "action", area: "personalization",
      title: `Tune personalization for low-converting segments`,
      detail: `Average segment conversion is under 1%. Review the worst-performing segment's offer match and CTA copy.`,
      priority: 52, confidence: 60, source: "rules",
    });
  }
  items.push({
    kind: "action", area: "revenue",
    title: `Review the daily executive briefing`,
    detail: `Open today's AI briefing for the synthesized state of revenue, growth, and risk, then pick the single highest-priority item above to action first.`,
    priority: 45, confidence: 80, source: "rules",
  });

  return items
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, 18);
}

// Full generation: build snapshot, derive items, persist atomically.
export async function generateDecisionCenter(): Promise<FounderDecisionItem[]> {
  const snap = await buildIntelSnapshot();
  const items = deriveDecisionItems(snap);

  // Best-effort DeepSeek diagnostic enrichment of the single top risk (no fallback).
  try {
    const topRisk = items.find((i) => i.kind === "risk");
    if (topRisk) {
      const r = await runTask("diagnostics", {
        messages: [
          { role: "system", content: "You are a Senior Reliability Analyst. In ONE short sentence (max 30 words), give a concrete, safe next step for the founder. No JSON, no preamble." },
          { role: "user", content: scrub(`Risk: ${topRisk.title}. Context: ${topRisk.detail}`, 600) },
        ],
        temperature: 0.3, maxTokens: 80,
      }, { providerOverride: "deepseek" });
      const tip = scrub(r.content, 240).trim();
      if (tip) topRisk.detail = `${topRisk.detail}\n\nDiagnostic: ${tip}`;
    }
  } catch (e: any) {
    console.warn("[founder-intel] decision enrichment failed:", scrub(e?.message, 160));
  }

  return storage.replaceFounderDecisionItems(items);
}
