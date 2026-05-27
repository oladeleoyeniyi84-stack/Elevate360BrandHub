// Phase 59 — AI Revenue Command Center
//
// Unified monetization intelligence layer.
// HARD SAFETY CONTRACT (non-negotiable):
//   - Recommendation-only. No autonomous mutations to Stripe, prices, refunds,
//     emails, charges, or any financial state.
//   - No raw Stripe payloads logged. All free text scrubbed before any LLM call.
//   - DeepSeek hard-locked for diagnostics; OpenAI hard-locked for executive copy.
//   - All admin routes calling this engine are PIN-gated upstream.
//   - All numeric estimates are best-effort — engine surfaces uncertainty.

import { storage } from "../storage";
import { getStripeClient, isStripeConfigured } from "../stripeClient";
import { runTask } from "../ai/modelRouter";
import type {
  RevenueCommandReport, InsertRevenueCommandReport,
  RevenueAlert, InsertRevenueAlert,
} from "@shared/schema";

const SCRUB_PATTERNS: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];
function scrub(s: any, maxLen = 2000): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB_PATTERNS) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

export type RevenueDailyPoint = { date: string; gross: number; orders: number };
export type RevenueSnapshot = {
  stripeConfigured: boolean;
  windowDays: number;
  grossRevenueCents: number;
  netRevenueCents: number;
  refundedCents: number;
  successfulPayments: number;
  failedPayments: number;
  refundCount: number;
  avgOrderValueCents: number;
  activeSubscriptions: number;
  daily: RevenueDailyPoint[];
  trailingAverages: { day7: number; day30: number };
  growthSlopePerDay: number;
  forecastNext7Cents: number;
  forecastConfidence: number; // 0..100
  volatility: number;         // coefficient of variation (0..1+)
  anomalyScore: number;       // 0..100
  asOf: string;
};

export type GrowthSnapshot = {
  topRecommendations: Array<{ id: number; title: string; expectedImpact: string; status: string }>;
  totalOpenRecommendations: number;
};

export type ExperimentSnapshot = {
  running: number;
  completed: number;
  winners: Array<{ experimentKey: string; name: string; winnerVariantKey: string; confidence: number; liftPct: number | null }>;
  topUnderperformers: Array<{ experimentKey: string; name: string; reason: string }>;
};

export type PersonalizationSnapshot = {
  activeRules: number;
  pendingRules: number;
  topSegments: Array<{ surface: string; segmentKey: string; cvr: number; ctr: number; views: number }>;
  underperformingSegments: Array<{ surface: string; segmentKey: string; cvr: number; views: number }>;
};

export type RevenueRecommendation = {
  kind: "pricing" | "cta" | "funnel" | "segment" | "experiment" | "retention" | "general";
  title: string;
  rationale: string;
  confidence: number; // 0..100
};

export type RevenueOverview = {
  report: RevenueCommandReport | null;
  alerts: RevenueAlert[];
};

// ─── Aggregation ─────────────────────────────────────────────────────────────

async function fetchStripeSnapshot(windowDays: number): Promise<{
  stripeConfigured: boolean;
  grossCents: number; refundedCents: number; failedPayments: number;
  refundCount: number; successfulPayments: number;
  activeSubscriptions: number;
}> {
  const client = getStripeClient();
  const configured = !!client;
  if (!client) {
    return { stripeConfigured: false, grossCents: 0, refundedCents: 0, failedPayments: 0, refundCount: 0, successfulPayments: 0, activeSubscriptions: 0 };
  }
  const since = Math.floor((Date.now() - windowDays * 86400_000) / 1000);
  let grossCents = 0, refundedCents = 0, failedPayments = 0, refundCount = 0, successfulPayments = 0, activeSubscriptions = 0;
  try {
    // Charges (cap to 100 most recent to bound latency; sufficient for early-stage)
    const charges = await client.charges.list({ limit: 100, created: { gte: since } });
    for (const ch of charges.data) {
      if (ch.status === "succeeded") {
        successfulPayments += 1;
        grossCents += ch.amount ?? 0;
        if (ch.amount_refunded) { refundedCents += ch.amount_refunded; refundCount += 1; }
      } else if (ch.status === "failed") {
        failedPayments += 1;
      }
    }
  } catch (e: any) {
    console.warn(`[revenue] stripe charges fetch failed: ${scrub(e?.message, 200)}`);
  }
  try {
    const subs = await client.subscriptions.list({ limit: 100, status: "active" });
    activeSubscriptions = subs.data.length;
  } catch (e: any) {
    // Likely no subscription product configured — non-fatal.
    if (!/no such (resource|product)/i.test(String(e?.message))) {
      console.warn(`[revenue] stripe subs fetch failed: ${scrub(e?.message, 200)}`);
    }
  }
  return { stripeConfigured: configured, grossCents, refundedCents, failedPayments, refundCount, successfulPayments, activeSubscriptions };
}

function linearRegressionSlope(values: number[]): number {
  // Returns slope (units per index step). Empty/short returns 0.
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i];
    sumXY += i * values[i]; sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function trailingAverage(values: number[], window: number): number {
  if (!values.length) return 0;
  const slice = values.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export async function buildRevenueSnapshot(windowDays = 30): Promise<RevenueSnapshot> {
  // Local orders are the ground-truth for daily revenue series (Stripe historic
  // pagination is expensive). Stripe call enriches with refunds/failures/subs.
  const orders = await storage.listRecentOrders(windowDays);
  const buckets = new Map<string, { gross: number; orders: number }>();
  // Pre-seed all days (so chart has zeros, not gaps)
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { gross: 0, orders: 0 });
  }
  for (const o of orders) {
    if (o.status !== "paid" && o.status !== "completed") continue;
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (!buckets.has(key)) continue;
    const b = buckets.get(key)!;
    b.gross += o.amountPaid ?? 0;
    b.orders += 1;
  }
  const daily: RevenueDailyPoint[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, gross: v.gross, orders: v.orders }));
  const dailyGross = daily.map(d => d.gross);

  const stripe = await fetchStripeSnapshot(windowDays);
  const localGrossCents = dailyGross.reduce((a, b) => a + b, 0);
  // Prefer Stripe gross if configured & non-zero; fall back to local order sum.
  const grossRevenueCents = stripe.stripeConfigured && stripe.grossCents > 0 ? stripe.grossCents : localGrossCents;
  const refundedCents = stripe.refundedCents;
  const netRevenueCents = Math.max(0, grossRevenueCents - refundedCents);
  const successfulPayments = stripe.successfulPayments || daily.reduce((a, b) => a + b.orders, 0);
  const avgOrderValueCents = successfulPayments > 0 ? Math.round(grossRevenueCents / successfulPayments) : 0;

  const day7 = Math.round(trailingAverage(dailyGross, 7));
  const day30 = Math.round(trailingAverage(dailyGross, 30));
  const slope = linearRegressionSlope(dailyGross);
  const forecastBase = day7 > 0 ? day7 : day30;
  const forecastNext7Cents = Math.max(0, Math.round((forecastBase + slope * 3.5) * 7));
  const volatility = coefficientOfVariation(dailyGross);
  // Forecast confidence shrinks with volatility and short windows.
  const sampleConfidence = Math.min(100, Math.round((daily.length / 30) * 100));
  const volPenalty = Math.min(70, Math.round(volatility * 100));
  const forecastConfidence = Math.max(0, sampleConfidence - volPenalty);
  // Anomaly score: today vs trailing-7 deviation.
  const today = dailyGross[dailyGross.length - 1] ?? 0;
  const ref = day7 || day30 || 0;
  const deviationRatio = ref > 0 ? Math.abs(today - ref) / ref : 0;
  const anomalyScore = Math.min(100, Math.round(deviationRatio * 100));

  return {
    stripeConfigured: stripe.stripeConfigured,
    windowDays,
    grossRevenueCents, netRevenueCents, refundedCents,
    successfulPayments, failedPayments: stripe.failedPayments,
    refundCount: stripe.refundCount,
    avgOrderValueCents,
    activeSubscriptions: stripe.activeSubscriptions,
    daily,
    trailingAverages: { day7, day30 },
    growthSlopePerDay: Math.round(slope),
    forecastNext7Cents,
    forecastConfidence,
    volatility: Math.round(volatility * 1000) / 1000,
    anomalyScore,
    asOf: new Date().toISOString(),
  };
}

async function buildGrowthSnapshot(): Promise<GrowthSnapshot> {
  let topRecs: any[] = [];
  let totalOpen = 0;
  try {
    const all = await storage.listGrowthRecommendations(undefined, 50);
    totalOpen = all.filter(r => r.status === "open" || r.status === "approved").length;
    topRecs = all.slice(0, 5).map(r => ({
      id: r.id, title: scrub(r.title, 120),
      expectedImpact: scrub(r.expectedImpact ?? "", 80),
      status: r.status,
    }));
  } catch (e: any) {
    console.warn(`[revenue] growth fetch failed: ${scrub(e?.message, 200)}`);
  }
  return { topRecommendations: topRecs, totalOpenRecommendations: totalOpen };
}

async function buildExperimentSnapshot(): Promise<ExperimentSnapshot> {
  const snap: ExperimentSnapshot = { running: 0, completed: 0, winners: [], topUnderperformers: [] };
  try {
    const all = await storage.listExperiments(undefined, 100);
    snap.running = all.filter(e => e.status === "running").length;
    snap.completed = all.filter(e => e.status === "completed").length;
    for (const e of all) {
      if (e.winnerVariantKey) {
        snap.winners.push({
          experimentKey: e.experimentKey, name: scrub(e.name, 80),
          winnerVariantKey: e.winnerVariantKey,
          confidence: Math.round((e.confidence ?? 0) * 100),
          liftPct: null,
        });
      }
      if (e.status === "rolled_back") {
        snap.topUnderperformers.push({
          experimentKey: e.experimentKey, name: scrub(e.name, 80),
          reason: scrub(e.rollbackReason ?? "rolled back", 120),
        });
      }
    }
    snap.winners = snap.winners.slice(0, 5);
    snap.topUnderperformers = snap.topUnderperformers.slice(0, 5);
  } catch (e: any) {
    console.warn(`[revenue] experiment snapshot failed: ${scrub(e?.message, 200)}`);
  }
  return snap;
}

async function buildPersonalizationSnapshot(): Promise<PersonalizationSnapshot> {
  const snap: PersonalizationSnapshot = { activeRules: 0, pendingRules: 0, topSegments: [], underperformingSegments: [] };
  try {
    const rules = await storage.listPersonalizationRules();
    snap.activeRules = rules.filter(r => r.status === "active").length;
    snap.pendingRules = rules.filter(r => r.status === "pending").length;
    const stats = await storage.getPersonalizationEventStats();
    const enriched = stats
      .filter(s => s.views >= 5) // require minimum sample
      .sort((a, b) => b.cvr - a.cvr);
    snap.topSegments = enriched.slice(0, 5).map(s => ({
      surface: s.surface, segmentKey: s.segmentKey, cvr: s.cvr, ctr: s.ctr, views: s.views,
    }));
    snap.underperformingSegments = enriched.slice(-3).reverse().map(s => ({
      surface: s.surface, segmentKey: s.segmentKey, cvr: s.cvr, views: s.views,
    }));
  } catch (e: any) {
    console.warn(`[revenue] personalization snapshot failed: ${scrub(e?.message, 200)}`);
  }
  return snap;
}

// ─── Alert generation ───────────────────────────────────────────────────────

function deriveAlerts(rev: RevenueSnapshot, exp: ExperimentSnapshot, pers: PersonalizationSnapshot): InsertRevenueAlert[] {
  const alerts: InsertRevenueAlert[] = [];
  if (rev.anomalyScore >= 40 && rev.trailingAverages.day7 > 0) {
    const today = rev.daily[rev.daily.length - 1]?.gross ?? 0;
    const dropped = today < rev.trailingAverages.day7;
    alerts.push({
      severity: rev.anomalyScore >= 70 ? "critical" : "warning",
      alertType: dropped ? "conversion_drop" : "revenue_spike",
      title: dropped
        ? `Today's revenue is ${rev.anomalyScore}% below the 7-day average`
        : `Today's revenue is ${rev.anomalyScore}% above the 7-day average`,
      description: dropped
        ? "Daily revenue deviates downward from the trailing 7-day mean."
        : "Daily revenue deviates upward from the trailing 7-day mean.",
      recommendation: dropped
        ? "Verify traffic sources, payment funnel, and any active experiments for regressions."
        : "Investigate the source — confirm it's organic (not duplicate orders or test traffic).",
      status: "open",
    } as InsertRevenueAlert);
  }
  if (rev.failedPayments >= 5) {
    alerts.push({
      severity: "warning",
      alertType: "failed_payment_spike",
      title: `${rev.failedPayments} failed payments in the last ${rev.windowDays} days`,
      description: "Elevated payment failure rate detected.",
      recommendation: "Check Stripe Radar rules and confirm the live key + webhook are healthy.",
      status: "open",
    } as InsertRevenueAlert);
  }
  if (rev.refundCount >= 3 && rev.grossRevenueCents > 0) {
    const refundRate = rev.refundedCents / rev.grossRevenueCents;
    if (refundRate >= 0.1) {
      alerts.push({
        severity: refundRate >= 0.2 ? "critical" : "warning",
        alertType: "refund_spike",
        title: `Refund rate is ${(refundRate * 100).toFixed(1)}%`,
        description: "Refund volume exceeds healthy threshold.",
        recommendation: "Review product quality signals, dispute reasons, and onboarding clarity.",
        status: "open",
      } as InsertRevenueAlert);
    }
  }
  if (exp.topUnderperformers.length >= 2) {
    alerts.push({
      severity: "info",
      alertType: "experiment_underperformance",
      title: `${exp.topUnderperformers.length} experiments rolled back recently`,
      description: "Multiple experiment rollbacks may indicate weak hypotheses.",
      recommendation: "Pause new variant proposals and re-baseline the funnel before more tests.",
      status: "open",
    } as InsertRevenueAlert);
  }
  if (pers.underperformingSegments.some(s => s.cvr === 0 && s.views >= 20)) {
    alerts.push({
      severity: "info",
      alertType: "personalization_degradation",
      title: "One or more personalization segments are converting at 0%",
      description: "A targeted segment is showing zero conversions despite traffic.",
      recommendation: "Review the variant copy — it may not match segment intent. Deactivate or revise.",
      status: "open",
    } as InsertRevenueAlert);
  }
  return alerts;
}

// ─── AI synthesis ───────────────────────────────────────────────────────────

async function generateAiRecommendations(payload: any): Promise<{ recommendations: RevenueRecommendation[]; provider: string }> {
  const sys = "You are a Senior Monetization Strategist. Given a revenue/growth/experiment/personalization snapshot, " +
    "respond ONLY with JSON: { \"recommendations\": [{ \"kind\": \"pricing|cta|funnel|segment|experiment|retention|general\", " +
    "\"title\": string, \"rationale\": string, \"confidence\": 0-100 }] }. " +
    "Recommendation-only — do NOT propose autonomous mutations, price changes, refunds, or email blasts. " +
    "Max 6 items. Keep titles <80 chars, rationales <240 chars.";
  let recommendations: RevenueRecommendation[] = [];
  let provider = "deepseek";
  try {
    const r = await runTask("diagnostics",
      {
        messages: [
          { role: "system", content: sys },
          { role: "user", content: scrub(JSON.stringify(payload), 4000) },
        ],
        temperature: 0.4, maxTokens: 900, jsonMode: true,
      },
      { providerOverride: "deepseek" }
    );
    provider = r.provider;
    try {
      const parsed = JSON.parse(r.content);
      const arr = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
      const valid = new Set(["pricing", "cta", "funnel", "segment", "experiment", "retention", "general"]);
      recommendations = arr.slice(0, 6).map((x: any) => ({
        kind: valid.has(String(x?.kind)) ? x.kind : "general",
        title: scrub(x?.title, 80),
        rationale: scrub(x?.rationale, 240),
        confidence: Math.max(0, Math.min(100, Number(x?.confidence) || 0)),
      })).filter((x: RevenueRecommendation) => x.title);
    } catch { /* malformed JSON — skip */ }
  } catch (e: any) {
    console.warn(`[revenue] recs failed: ${scrub(e?.message, 200)}`);
  }
  return { recommendations, provider };
}

async function generateExecutive(payload: any): Promise<{ summary: string; provider: string }> {
  try {
    const r = await runTask("executive_copy",
      {
        messages: [
          { role: "system", content: "You are the Chief Revenue Officer briefing the founder in 4-6 tight bullets. Cover: (1) headline state, (2) the single biggest opportunity, (3) the single biggest risk, (4) one safe next action. Inclusive tone. No JSON, no markdown headers — bullets only." },
          { role: "user", content: scrub(JSON.stringify(payload), 4000) },
        ],
        temperature: 0.4, maxTokens: 500,
      },
      { providerOverride: "openai" }
    );
    return { summary: scrub(r.content, 2000), provider: r.provider };
  } catch (e: any) {
    console.warn(`[revenue] exec failed: ${scrub(e?.message, 200)}`);
    return { summary: "", provider: "openai" };
  }
}

async function generateDiagnostics(payload: any): Promise<{ summary: string; provider: string }> {
  try {
    const r = await runTask("diagnostics",
      {
        messages: [
          { role: "system", content: "You are a Senior Revenue Analyst. In 4-6 short bullets, diagnose the trend, volatility, the strongest signal, and any data-quality caveat. Plain English, no JSON." },
          { role: "user", content: scrub(JSON.stringify(payload), 4000) },
        ],
        temperature: 0.3, maxTokens: 500,
      },
      { providerOverride: "deepseek" }
    );
    return { summary: scrub(r.content, 2000), provider: r.provider };
  } catch (e: any) {
    console.warn(`[revenue] diag failed: ${scrub(e?.message, 200)}`);
    return { summary: "", provider: "deepseek" };
  }
}

// ─── Top-level run ──────────────────────────────────────────────────────────

export async function runRevenueCommandCenter(windowDays = 30): Promise<{
  report: RevenueCommandReport;
  alerts: RevenueAlert[];
}> {
  const [revenue, growth, experiments, personalization] = await Promise.all([
    buildRevenueSnapshot(windowDays),
    buildGrowthSnapshot(),
    buildExperimentSnapshot(),
    buildPersonalizationSnapshot(),
  ]);
  // Operational confidence: blend forecast confidence with experiment activity
  // and Stripe presence — soft proxy for how much we can trust the picture.
  const opConfidence = Math.round(
    0.6 * revenue.forecastConfidence +
    (revenue.stripeConfigured ? 20 : 0) +
    Math.min(20, experiments.completed * 5)
  );
  const synthesisPayload = {
    revenue: {
      grossRevenueCents: revenue.grossRevenueCents,
      netRevenueCents: revenue.netRevenueCents,
      refundedCents: revenue.refundedCents,
      successfulPayments: revenue.successfulPayments,
      failedPayments: revenue.failedPayments,
      avgOrderValueCents: revenue.avgOrderValueCents,
      day7: revenue.trailingAverages.day7,
      day30: revenue.trailingAverages.day30,
      slope: revenue.growthSlopePerDay,
      forecastNext7Cents: revenue.forecastNext7Cents,
      forecastConfidence: revenue.forecastConfidence,
      volatility: revenue.volatility,
      anomalyScore: revenue.anomalyScore,
    },
    growth, experiments, personalization,
  };
  const [recs, exec, diag] = await Promise.all([
    generateAiRecommendations(synthesisPayload),
    generateExecutive(synthesisPayload),
    generateDiagnostics(synthesisPayload),
  ]);

  const insert: InsertRevenueCommandReport = {
    status: "ready",
    revenueSnapshot: revenue as any,
    growthSnapshot: growth as any,
    experimentSnapshot: experiments as any,
    personalizationSnapshot: personalization as any,
    recommendations: recs.recommendations as any,
    executiveSummary: exec.summary,
    diagnosticsSummary: diag.summary,
    providerMetadata: {
      recommendations: recs.provider,
      executive: exec.provider,
      diagnostics: diag.provider,
    } as any,
    confidence: Math.max(0, Math.min(100, opConfidence)),
  };
  const report = await storage.createRevenueCommandReport(insert);

  // Emit alerts. Dedup is enforced atomically by the DB via the partial unique
  // index `revenue_alerts_open_dedup_idx` on (alert_type, title) WHERE status='open'.
  // createRevenueAlert uses ON CONFLICT DO NOTHING and returns null on duplicate.
  const alertsToCreate = deriveAlerts(revenue, experiments, personalization);
  const created: RevenueAlert[] = [];
  for (const a of alertsToCreate) {
    const row = await storage.createRevenueAlert(a);
    if (row) created.push(row);
  }
  console.log(`[revenue] report=${report.id} conf=${report.confidence} recs=${recs.recommendations.length} new_alerts=${created.length}`);
  return { report, alerts: created };
}

export async function getRevenueOverview(): Promise<RevenueOverview> {
  const [report, alerts] = await Promise.all([
    storage.getLatestRevenueCommandReport(),
    storage.listRevenueAlerts("open", 50),
  ]);
  return { report, alerts };
}

export async function acknowledgeAlert(id: number, ackedBy: string): Promise<RevenueAlert> {
  return storage.acknowledgeRevenueAlert(id, ackedBy);
}

// Re-export so consumers don't need to import directly.
export { isStripeConfigured };
