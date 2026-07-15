// Phase 56 — Autonomous AI Growth Engine
//
// Aggregates growth telemetry (visits, funnel, conversions, revenue), asks the
// AI router for diagnostics (DeepSeek) + executive summary (OpenAI hard-locked),
// produces a strictly advisory recommendation set + simple linear revenue
// forecast. Founder must approve every recommendation; nothing here mutates
// pricing, orders, ads, or sends email.
//
// Safety contract:
//   - never auto-applies recommendations (status defaults to "pending")
//   - never mutates orders, prices, ads, or email queue
//   - free-text fields from prior reports are scrubbed before forwarding to LLM
//   - logging: single-line summary, no PII/secrets/prompts/PIN

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { db } from "../db";
import { sql } from "drizzle-orm";
import type {
  GrowthIntelligenceReport,
  GrowthRecommendation,
  InsertGrowthIntelligenceReport,
  InsertGrowthRecommendation,
} from "@shared/schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const REC_CATEGORIES = new Set([
  "funnel",
  "conversion",
  "engagement",
  "offer",
  "content",
  "retention",
  "acquisition",
]);
const REC_SEVERITIES = new Set(["info", "warning", "critical"]);

const SCRUB_PATTERNS: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/https?:\/\/\S*\?\S+/g, "[redacted:url-with-query]"],
  [/DASHBOARD_PIN[^\s]*/gi, "[redacted:pin]"],
  [/(OPENAI|DEEPSEEK|RESEND|STRIPE)_[A-Z_]*KEY[^\s]*/g, "[redacted:key]"],
];
function scrub(s: any, maxLen = 500): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB_PATTERNS) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

export type GrowthContext = {
  windowDays: number;
  visits: {
    total: number;
    daily: Array<{ date: string; count: number }>;
    topPages: Array<{ page: string; count: number }>;
    trend: { direction: "up" | "down" | "flat"; pctChange: number };
  };
  funnel: {
    visits: number;
    chatStarted: number;
    leadsCaptured: number; // chat conversations with captured email/name
    leadsQualified: number; // hot/warm leadTemperature
    ordersInitiated: number;
    ordersPaid: number;
    rates: {
      visitToChat: number;
      chatToLead: number;
      leadToQualified: number;
      qualifiedToInitiated: number;
      initiatedToPaid: number;
      visitToPaid: number;
    };
  };
  revenue: {
    totalCents: number;
    paidOrders: number;
    avgOrderCents: number;
    dailyCents: Array<{ date: string; cents: number }>;
  };
  engagement: {
    newSubscribers: number;
    newContacts: number;
    chatSessions: number;
    avgLeadScore: number;
    hotLeads: number;
  };
};

export type RevenueForecast = {
  horizonDays: number;
  history: Array<{ date: string; cents: number }>;
  projection: Array<{ date: string; cents: number }>;
  slopeCentsPerDay: number;
  projectedTotalCents: number;
  confidence: number; // 0..1
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDailyBuckets(
  rows: Array<{ createdAt: Date | string }>,
  days: number,
  valueOf?: (r: any) => number
): Array<{ date: string; count: number }> {
  const cutoffMs = Date.now() - days * DAY_MS;
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    map.set(isoDate(new Date(Date.now() - i * DAY_MS)), 0);
  }
  for (const r of rows) {
    const t = new Date((r as any).createdAt).getTime();
    if (t < cutoffMs) continue;
    const k = isoDate(new Date(t));
    if (!map.has(k)) continue;
    map.set(k, (map.get(k) ?? 0) + (valueOf ? valueOf(r) : 1));
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

function pctChange(prev: number, curr: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function direction(pct: number): "up" | "down" | "flat" {
  if (pct > 5) return "up";
  if (pct < -5) return "down";
  return "flat";
}

function safeRate(num: number, denom: number): number {
  if (!denom) return 0;
  return Math.round((num / denom) * 1000) / 10; // %, 1 decimal
}

// Simple ordinary least squares on daily revenue for forecast.
function forecastRevenue(
  dailyCents: Array<{ date: string; cents: number }>,
  horizonDays: number
): RevenueForecast {
  const n = dailyCents.length;
  if (n < 3) {
    return {
      horizonDays,
      history: dailyCents,
      projection: [],
      slopeCentsPerDay: 0,
      projectedTotalCents: 0,
      confidence: 0,
    };
  }
  // OLS y = a + b*x where x is day index 0..n-1
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += dailyCents[i].cents;
    sumXY += i * dailyCents[i].cents;
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX || 1;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;

  // R² for confidence
  const meanY = sumY / n;
  let ssTot = 0,
    ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yi = dailyCents[i].cents;
    const pred = a + b * i;
    ssTot += (yi - meanY) ** 2;
    ssRes += (yi - pred) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  const projection: Array<{ date: string; cents: number }> = [];
  let projTotal = 0;
  for (let i = 1; i <= horizonDays; i++) {
    const x = n - 1 + i;
    const cents = Math.max(0, Math.round(a + b * x));
    const d = isoDate(new Date(Date.now() + i * DAY_MS));
    projection.push({ date: d, cents });
    projTotal += cents;
  }

  return {
    horizonDays,
    history: dailyCents,
    projection,
    slopeCentsPerDay: Math.round(b),
    projectedTotalCents: projTotal,
    confidence: Math.round(r2 * 100) / 100,
  };
}

export async function gatherGrowthContext(windowDays = 14): Promise<GrowthContext> {
  const sinceMs = Date.now() - windowDays * DAY_MS;
  const prevSinceMs = sinceMs - windowDays * DAY_MS;

  const [visits, contacts, subs, chats, orders] = await Promise.all([
    // Only the current + previous comparison windows are needed — never the
    // whole (unbounded) table.
    storage.getPageViews(windowDays * 2).catch(() => []),
    storage.getContactMessages().catch(() => []),
    storage.getNewsletterSubscribers().catch(() => []),
    storage.getAllChatConversations().catch(() => []),
    storage.getAllOrders().catch(() => []),
  ]);

  // ── Visits aggregation
  const visitsInWindow = visits.filter((v: any) => new Date(v.createdAt).getTime() >= sinceMs);
  const visitsPrev = visits.filter(
    (v: any) =>
      new Date(v.createdAt).getTime() >= prevSinceMs &&
      new Date(v.createdAt).getTime() < sinceMs
  );
  const daily = buildDailyBuckets(visitsInWindow as any, windowDays);
  const topPagesMap = new Map<string, number>();
  for (const v of visitsInWindow as any[]) {
    const page = (v.page ?? "/").slice(0, 80);
    topPagesMap.set(page, (topPagesMap.get(page) ?? 0) + 1);
  }
  const topPages = Array.from(topPagesMap.entries())
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const trendPct = pctChange(visitsPrev.length, visitsInWindow.length);

  // ── Funnel
  const chatsInWindow = (chats as any[]).filter(
    (c) => new Date(c.createdAt).getTime() >= sinceMs
  );
  const leadsCaptured = chatsInWindow.filter(
    (c) => c.capturedEmail || c.capturedName || c.leadEmail
  ).length;
  const leadsQualified = chatsInWindow.filter(
    (c) => c.leadTemperature === "hot" || c.leadTemperature === "warm"
  ).length;
  const ordersInWindow = (orders as any[]).filter(
    (o) => new Date(o.createdAt).getTime() >= sinceMs
  );
  const ordersInitiated = ordersInWindow.length;
  const ordersPaid = ordersInWindow.filter((o) => o.status === "paid").length;

  const funnel = {
    visits: visitsInWindow.length,
    chatStarted: chatsInWindow.length,
    leadsCaptured,
    leadsQualified,
    ordersInitiated,
    ordersPaid,
    rates: {
      visitToChat: safeRate(chatsInWindow.length, visitsInWindow.length),
      chatToLead: safeRate(leadsCaptured, chatsInWindow.length),
      leadToQualified: safeRate(leadsQualified, leadsCaptured),
      qualifiedToInitiated: safeRate(ordersInitiated, leadsQualified),
      initiatedToPaid: safeRate(ordersPaid, ordersInitiated),
      visitToPaid: safeRate(ordersPaid, visitsInWindow.length),
    },
  };

  // ── Revenue
  const paid = ordersInWindow.filter((o) => o.status === "paid");
  const totalCents = paid.reduce((s, o) => s + (o.amountPaid ?? 0), 0);
  const dailyCents = buildDailyBuckets(
    paid as any,
    windowDays,
    (o) => o.amountPaid ?? 0
  ).map((d) => ({ date: d.date, cents: d.count }));

  // ── Engagement
  const subsInWindow = (subs as any[]).filter((s) => new Date(s.subscribedAt ?? s.createdAt).getTime() >= sinceMs);
  const contactsInWindow = (contacts as any[]).filter(
    (c) => new Date(c.createdAt).getTime() >= sinceMs
  );
  const totalScores = chatsInWindow.reduce((s, c) => s + (c.leadScore ?? 0), 0);
  const avgLeadScore =
    chatsInWindow.length > 0 ? Math.round(totalScores / chatsInWindow.length) : 0;
  const hotLeads = chatsInWindow.filter((c) => c.leadTemperature === "hot").length;

  return {
    windowDays,
    visits: {
      total: visitsInWindow.length,
      daily,
      topPages,
      trend: { direction: direction(trendPct), pctChange: trendPct },
    },
    funnel,
    revenue: {
      totalCents,
      paidOrders: paid.length,
      avgOrderCents: paid.length > 0 ? Math.round(totalCents / paid.length) : 0,
      dailyCents,
    },
    engagement: {
      newSubscribers: subsInWindow.length,
      newContacts: contactsInWindow.length,
      chatSessions: chatsInWindow.length,
      avgLeadScore,
      hotLeads,
    },
  };
}

type RawRec = {
  category: string;
  severity: string;
  title: string;
  rationale: string;
  proposedExperiment?: string;
  expectedImpact?: string;
};

async function askDiagnostics(ctx: GrowthContext): Promise<{
  status: "healthy" | "warning" | "critical";
  diagnosticsSummary: string;
  recommendations: RawRec[];
  confidence: number;
  provider: string;
}> {
  const sys =
    "You are a Senior Growth SRE for Elevate360Official. Given a safety-scrubbed growth " +
    "snapshot, return ONLY JSON: " +
    '{ "status":"healthy"|"warning"|"critical", ' +
    '"diagnosticsSummary": string (<= 600 chars, plain English), ' +
    '"recommendations":[{"category":"funnel"|"conversion"|"engagement"|"offer"|"content"|"retention"|"acquisition",' +
    '"severity":"info"|"warning"|"critical","title": string (<= 120 chars),"rationale": string (<= 400 chars),' +
    '"proposedExperiment"?: string (<= 400 chars),"expectedImpact"?: string (<= 100 chars)}], ' +
    '"confidence": number (0..1) }. ' +
    "Never recommend price changes, ad spend changes, or sending emails. All recommendations are advisory.";
  const user = "Growth snapshot:\n" + JSON.stringify(ctx, null, 2);

  try {
    const result = await runTask(
      "diagnostics",
      {
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        maxTokens: 1500,
        jsonMode: true,
      },
      { providerOverride: "deepseek" }
    );
    let parsed: any = null;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      return { status: "warning", diagnosticsSummary: "", recommendations: [], confidence: 0, provider: result.provider };
    }
    const statusRaw = String(parsed?.status ?? "").toLowerCase();
    const status: "healthy" | "warning" | "critical" =
      statusRaw === "critical" || statusRaw === "warning" || statusRaw === "healthy"
        ? (statusRaw as any)
        : "warning";
    const recs: RawRec[] = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations
          .filter(
            (r: any) =>
              r &&
              typeof r === "object" &&
              REC_CATEGORIES.has(String(r.category)) &&
              typeof r.title === "string" &&
              r.title.trim().length > 0
          )
          .map((r: any) => ({
            category: String(r.category),
            severity: REC_SEVERITIES.has(String(r.severity)) ? String(r.severity) : "info",
            title: scrub(r.title, 200),
            rationale: scrub(r.rationale, 400),
            proposedExperiment: r.proposedExperiment ? scrub(r.proposedExperiment, 400) : undefined,
            expectedImpact: r.expectedImpact ? scrub(r.expectedImpact, 100) : undefined,
          }))
          .slice(0, 12)
      : [];
    const conf = typeof parsed?.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
    return {
      status,
      diagnosticsSummary: scrub(parsed?.diagnosticsSummary, 600),
      recommendations: recs,
      confidence: conf,
      provider: result.provider,
    };
  } catch (e: any) {
    console.warn(`[growthEngine] diagnostics failed: ${scrub(e?.message, 200)}`);
    return { status: "warning", diagnosticsSummary: "", recommendations: [], confidence: 0, provider: "deepseek" };
  }
}

async function askExecutiveSummary(
  ctx: GrowthContext,
  diagnostics: { status: string; diagnosticsSummary: string; recommendations: RawRec[] },
  forecast: RevenueForecast
): Promise<{ executiveSummary: string; provider: string }> {
  const sys =
    "You are Chief Growth Officer for Elevate360Official's founder. Write a tight executive " +
    "summary in 4–6 short bullets covering: state of the funnel, top conversion levers, the " +
    "revenue forecast headline, and the single highest-ROI experiment to greenlight first. " +
    "Plain English. Confident, calm, decisive. No JSON, no code.";
  const payload = {
    snapshot: ctx,
    diagnostics,
    forecast: {
      horizonDays: forecast.horizonDays,
      slopeCentsPerDay: forecast.slopeCentsPerDay,
      projectedTotalCents: forecast.projectedTotalCents,
      confidence: forecast.confidence,
    },
  };
  try {
    // Hard-lock OpenAI for premium executive reasoning — never fall back to DeepSeek.
    const result = await runTask(
      "executive_copy",
      {
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(payload, null, 2) },
        ],
        temperature: 0.4,
        maxTokens: 600,
      },
      { providerOverride: "openai" }
    );
    return { executiveSummary: result.content.trim().slice(0, 4000), provider: result.provider };
  } catch (e: any) {
    console.warn(`[growthEngine] executive summary failed: ${scrub(e?.message, 200)}`);
    return { executiveSummary: "", provider: "openai" };
  }
}

export async function runGrowthEngine(opts: { windowDays?: number; forecastDays?: number } = {}): Promise<{
  report: GrowthIntelligenceReport;
  recommendations: GrowthRecommendation[];
  summary: string;
}> {
  const windowDays = Math.max(3, Math.min(opts.windowDays ?? 14, 90));
  const forecastDays = Math.max(3, Math.min(opts.forecastDays ?? 14, 60));

  const ctx = await gatherGrowthContext(windowDays);
  const forecast = forecastRevenue(ctx.revenue.dailyCents, forecastDays);
  const diagnostics = await askDiagnostics(ctx);
  const exec = await askExecutiveSummary(ctx, diagnostics, forecast);

  const insert: InsertGrowthIntelligenceReport = {
    status: diagnostics.status,
    funnel: ctx.funnel as any,
    trends: {
      visits: ctx.visits,
      engagement: ctx.engagement,
      revenue: { totalCents: ctx.revenue.totalCents, paidOrders: ctx.revenue.paidOrders, avgOrderCents: ctx.revenue.avgOrderCents, dailyCents: ctx.revenue.dailyCents },
    } as any,
    forecast: forecast as any,
    diagnosticsSummary: diagnostics.diagnosticsSummary,
    executiveSummary: exec.executiveSummary,
    diagnosticsProvider: diagnostics.provider,
    executiveProvider: exec.provider,
    confidence: Math.round(diagnostics.confidence * 100),
  };
  const report = await storage.createGrowthReport(insert);

  // Persist each recommendation as pending — founder must approve.
  const created: GrowthRecommendation[] = [];
  for (const r of diagnostics.recommendations) {
    const rec = await storage.createGrowthRecommendation({
      reportId: report.id,
      category: r.category,
      severity: r.severity,
      title: r.title,
      rationale: r.rationale,
      proposedExperiment: r.proposedExperiment ?? null,
      expectedImpact: r.expectedImpact ?? null,
      status: "pending",
    } as InsertGrowthRecommendation);
    created.push(rec);
  }

  const summary = `status=${diagnostics.status} recs=${created.length} forecastCents=${forecast.projectedTotalCents} slope=${forecast.slopeCentsPerDay} confidence=${diagnostics.confidence.toFixed(2)}`;
  console.log(`[growthEngine] ${summary}`);

  return { report, recommendations: created, summary };
}
