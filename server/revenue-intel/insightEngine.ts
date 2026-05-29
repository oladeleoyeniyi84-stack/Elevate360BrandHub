// Phase 65 — Revenue Intelligence: insight engine.
//
// Derives revenue Opportunities / Risks / Recommended Actions from the revenue
// snapshot using deterministic rules (priority + confidence), then optionally
// enriches the single top risk with a DeepSeek diagnostic (hard-locked, no
// fallback). Persists the batch atomically. Recommendation-only — never mutates
// money, pricing, refunds, infrastructure, or email.

import { storage } from "./../storage";
import { runTask } from "../ai/modelRouter";
import { buildRevenueSnapshot, scrub, type RevenueSnapshot } from "./aggregator";
import { computeRevenueForecast } from "./revenueForecast";
import { computeClvAnalytics } from "./clvEngine";
import { computeOfferAnalytics } from "./offerAnalytics";
import { analyzeFunnel } from "./funnelIntel";
import type { InsertRevenueInsight, RevenueInsight } from "@shared/schema";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);

// Pure rule layer — turns a snapshot into revenue insight items.
export function deriveRevenueInsights(snap: RevenueSnapshot): InsertRevenueInsight[] {
  const items: InsertRevenueInsight[] = [];
  const forecast = computeRevenueForecast(snap.series.map((p) => ({ date: p.date, revenueCents: p.revenueCents })));
  const clv = computeClvAnalytics(snap);
  const offers = computeOfferAnalytics(snap);
  const funnel = analyzeFunnel(snap);
  const f30 = forecast.horizons.find((h) => h.horizonDays === 30);

  // ── Opportunities ──────────────────────────────────────────────────────────
  if (offers.bestSeller && offers.bestSeller.revenueCents > 0) {
    items.push({
      kind: "opportunity", area: "offers",
      title: `Scale your best-selling offer: "${offers.bestSeller.name}"`,
      detail: `"${offers.bestSeller.name}" has driven ${usd(offers.bestSeller.revenueCents)} across ${offers.bestSeller.units} sale(s) — ${offers.bestSeller.revenueSharePct}% of attributed offer revenue. Concentrating concierge routing and content toward it is your highest-leverage revenue move.`,
      priority: clamp(76 + Math.min(14, offers.bestSeller.units)), confidence: clamp(70 + Math.min(20, offers.bestSeller.units * 2)),
      source: "rules",
    });
  }
  if (offers.bestAcceptance && offers.bestAcceptance.acceptanceRate >= 40 && offers.bestAcceptance.revenueSharePct < 25) {
    items.push({
      kind: "opportunity", area: "offers",
      title: `Promote high-converting offer "${offers.bestAcceptance.name}"`,
      detail: `"${offers.bestAcceptance.name}" is accepted ${offers.bestAcceptance.acceptanceRate}% of the time when recommended but only ${offers.bestAcceptance.revenueSharePct}% of offer revenue. Surfacing it more widely should lift conversion.`,
      priority: clamp(64 + offers.bestAcceptance.acceptanceRate / 4), confidence: 68, source: "rules",
    });
  }
  if (snap.attribution.topPaths.length > 0 && snap.attribution.topPaths[0].count > 0) {
    const top = snap.attribution.topPaths[0];
    items.push({
      kind: "opportunity", area: "attribution",
      title: `Double down on "${top.intent} → ${top.offer}"`,
      detail: `This intent-to-offer path has produced ${top.count} conversion(s) and ${usd(top.revenue)} in attributed revenue — your strongest converting path. Reinforce it across concierge prompts and landing content.`,
      priority: clamp(74 + Math.min(12, top.count)), confidence: clamp(68 + Math.min(20, top.count * 3)),
      source: "rules",
    });
  }
  if (clv.totalCustomers >= 3 && clv.repeatRate < 20) {
    items.push({
      kind: "opportunity", area: "clv",
      title: `Unlock repeat revenue (repeat rate only ${clv.repeatRate}%)`,
      detail: `Just ${clv.repeatCustomers} of ${clv.totalCustomers} customers have purchased more than once. A post-purchase follow-up sequence or complementary offer is the cheapest path to lifting lifetime value (currently avg ${usd(clv.avgLtvCents)}).`,
      priority: clamp(66 + (20 - clv.repeatRate)), confidence: 70, source: "rules",
    });
  }
  if (f30 && f30.trend === "up" && f30.confidence >= 30) {
    items.push({
      kind: "opportunity", area: "forecast",
      title: `Revenue momentum building (+${f30.changePct}% projected, 30d)`,
      detail: `The 30-day revenue trend is pointing up (expected ${usd(f30.projected)}, range ${usd(f30.low)}–${usd(f30.high)}). Capture the momentum with a timely campaign before it cools.`,
      priority: clamp(60 + f30.changePct), confidence: clamp(f30.confidence), source: "forecast",
    });
  }

  // ── Risks ──────────────────────────────────────────────────────────────────
  if (f30 && f30.trend === "down" && f30.confidence >= 25) {
    items.push({
      kind: "risk", area: "forecast",
      title: `Revenue trending down (${f30.changePct}% projected, 30d)`,
      detail: `The 30-day revenue trend line is declining (expected ${usd(f30.projected)} vs ${usd(f30.current)} trailing). Investigate funnel drop-off, offer mix, and traffic quality before the gap widens.`,
      priority: clamp(80 + Math.abs(f30.changePct)), confidence: clamp(f30.confidence), source: "forecast",
    });
  }
  if (funnel.biggestLeak && funnel.biggestLeak.dropOffPct >= 50) {
    const l = funnel.biggestLeak;
    items.push({
      kind: "risk", area: "funnel",
      title: `Biggest funnel leak: ${l.from} → ${l.to} (${l.dropOffPct}% drop-off)`,
      detail: `Only ${l.conversionPct}% of "${l.from}" (${l.fromCount}) advance to "${l.to}" (${l.toCount}). This is your largest conversion leak — tightening this single step has the highest revenue payoff.`,
      priority: clamp(70 + l.dropOffPct / 3), confidence: 76, source: "rules",
    });
  }
  if (clv.totalCustomers >= 5 && clv.top20RevenueSharePct >= 70) {
    items.push({
      kind: "risk", area: "clv",
      title: `Revenue concentration risk (${clv.top20RevenueSharePct}% from top 20%)`,
      detail: `A large share of revenue depends on a small group of customers. Losing one materially dents the business — broaden acquisition and nurture mid-tier customers to de-risk.`,
      priority: clamp(58 + clv.top20RevenueSharePct / 4), confidence: 66, source: "rules",
    });
  }
  if (snap.bookings.pending > 0) {
    items.push({
      kind: "risk", area: "bookings",
      title: `${snap.bookings.pending} pending booking(s) awaiting confirmation`,
      detail: `Pending consultations are warm, high-intent revenue waiting on a reply. Confirming them quickly protects close probability — each day idle lowers show-up and conversion.`,
      priority: clamp(60 + snap.bookings.pending * 5), confidence: 80, source: "rules",
    });
  }
  if (snap.urgency.overdueHotLeads > 0) {
    items.push({
      kind: "risk", area: "leads",
      title: `${snap.urgency.overdueHotLeads} hot lead(s) going cold`,
      detail: `Overdue hot leads decay fast. Each day without contact materially lowers close probability — this is revenue you already paid to acquire leaking away.`,
      priority: clamp(82 + snap.urgency.overdueHotLeads * 3), confidence: 85, source: "rules",
    });
  }
  if (snap.aiOps.openai !== "configured" || snap.aiOps.deepseek !== "configured") {
    items.push({
      kind: "risk", area: "general",
      title: `AI provider not fully configured`,
      detail: `One or more AI providers is not reporting "configured". Revenue diagnostics, executive synthesis, and the copilot degrade without both providers healthy.`,
      priority: 64, confidence: 90, source: "rules",
    });
  }

  // ── Recommended actions ─────────────────────────────────────────────────────
  if (snap.pipeline.emailCaptured > 0 && snap.bookings.last30Days === 0) {
    items.push({
      kind: "action", area: "bookings",
      title: `Send a booking nudge to captured leads`,
      detail: `You captured ${snap.pipeline.emailCaptured} email(s) but booked no consultations in the last 30 days. A single consultation-invite touch is the cheapest path to booked, high-value revenue.`,
      priority: 66, confidence: 72, source: "rules",
    });
  }
  if (offers.highestAvgValue && offers.bestSeller && offers.highestAvgValue.name !== offers.bestSeller.name) {
    items.push({
      kind: "action", area: "offers",
      title: `Test upselling "${offers.highestAvgValue.name}" to recent buyers`,
      detail: `"${offers.highestAvgValue.name}" has your highest average order value (${usd(offers.highestAvgValue.avgValueCents)}). Offering it as an upsell to customers of lower-value offers is a clear margin opportunity — present it for founder approval.`,
      priority: 58, confidence: 64, source: "rules",
    });
  }
  if (clv.totalCustomers > 0 && clv.topCustomers.length > 0) {
    items.push({
      kind: "action", area: "clv",
      title: `Personally re-engage your top customers`,
      detail: `Your top customers account for outsized revenue. A personal thank-you or early access to your next launch deepens loyalty and repeat purchases — review the CLV tab for the shortlist.`,
      priority: 52, confidence: 66, source: "rules",
    });
  }
  items.push({
    kind: "action", area: "general",
    title: `Review the executive revenue briefing`,
    detail: `Open today's AI revenue briefing for the synthesized state of attribution, offers, CLV, funnel, bookings, and forecast — then action the single highest-priority item above first.`,
    priority: 45, confidence: 80, source: "rules",
  });

  return items
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, 18);
}

// Full generation: build snapshot, derive items, enrich top risk, persist atomically.
export async function generateRevenueInsights(): Promise<RevenueInsight[]> {
  const snap = await buildRevenueSnapshot();
  const items = deriveRevenueInsights(snap);

  // Best-effort DeepSeek diagnostic enrichment of the single top risk (no fallback).
  try {
    const topRisk = items.find((i) => i.kind === "risk");
    if (topRisk) {
      const r = await runTask("diagnostics", {
        messages: [
          { role: "system", content: "You are a Senior Revenue Operations Analyst. In ONE short sentence (max 30 words), give a concrete, safe next step for the founder. Recommendation-only — never instruct to change pricing, charge customers, or take irreversible action. No JSON, no preamble." },
          { role: "user", content: scrub(`Revenue risk: ${topRisk.title}. Context: ${topRisk.detail}`, 600) },
        ],
        temperature: 0.3, maxTokens: 80,
      }, { providerOverride: "deepseek" });
      const tip = scrub(r.content, 240).trim();
      if (tip) topRisk.detail = `${topRisk.detail}\n\nDiagnostic: ${tip}`;
    }
  } catch (e: any) {
    console.warn("[revenue-intel] insight enrichment failed:", scrub(e?.message, 160));
  }

  // Final scrub pass on EVERY persisted string field (mirrors reportEngine.deepScrub).
  const scrubbed: InsertRevenueInsight[] = items.map((i) => ({
    ...i,
    title: scrub(i.title, 200),
    detail: scrub(i.detail, 2000),
    area: scrub(i.area, 40),
    source: scrub(i.source, 40),
  }));

  return storage.replaceRevenueInsights(scrubbed);
}
