// Phase 60 — Workflow & Agent registrations.
//
// Each agent is a thin adapter over existing Phase-53→59 engines. They never
// perform mutations beyond persisting reports/recommendations to their own
// tables; governance still vetoes anything else.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { runRevenueCommandCenter } from "../revenue/commandCenter";
import { registerAgent, registerWorkflow, rememberFact, type AgentDefinition } from "./core";

const SCRUB: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];
function scrub(s: any, maxLen = 2000): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

async function deepseekDiagnosis(label: string, payload: any): Promise<{ summary: string; provider: string }> {
  try {
    const r = await runTask("diagnostics",
      {
        messages: [
          { role: "system", content: `You are a Senior ${label} Analyst. In 3-5 short bullets diagnose what's happening, the strongest signal, and one safe next step. Plain English, no JSON.` },
          { role: "user", content: scrub(JSON.stringify(payload), 3000) },
        ],
        temperature: 0.3, maxTokens: 380,
      },
      { providerOverride: "deepseek" },
    );
    return { summary: scrub(r.content, 1200), provider: r.provider };
  } catch (e: any) {
    return { summary: `(diagnostics unavailable: ${scrub(e?.message, 80)})`, provider: "deepseek" };
  }
}

// ─── Agents ────────────────────────────────────────────────────────────────

const REVENUE_AGENT: AgentDefinition = {
  key: "revenue_agent",
  description: "Reads revenue snapshots, forecasts, and surfaces monetization opportunities.",
  allowedCapabilities: ["analyze.revenue", "analyze.forecast", "recommend.revenue"],
  restrictedCapabilities: ["pricing.set", "stripe.*", "refund.*", "payment.*"],
  providerPreference: "deepseek",
  cooldownMinutes: 30, executionTimeoutMs: 90_000, retryLimit: 2,
  run: async (ctx) => {
    const latest = await storage.getLatestRevenueCommandReport();
    const payload = latest ? {
      gross: (latest.revenueSnapshot as any)?.grossRevenueCents,
      forecast: (latest.revenueSnapshot as any)?.forecastNext7Cents,
      anomaly: (latest.revenueSnapshot as any)?.anomalyScore,
      recs: (latest.recommendations as any)?.length ?? 0,
    } : { note: "no_report" };
    const diag = await deepseekDiagnosis("Revenue", payload);
    await rememberFact("snapshot", "revenue", "latest", payload, latest ? 80 : 30);
    return {
      output: { latestReportId: latest?.id ?? null, payload, diagnosis: diag.summary, provider: diag.provider },
      confidence: latest ? 75 : 25,
      summary: `revenue_agent → report=${latest?.id ?? "none"}`,
    };
  },
};

const GROWTH_AGENT: AgentDefinition = {
  key: "growth_agent",
  description: "Reads Growth Engine recommendations and prioritises opportunities.",
  allowedCapabilities: ["analyze.growth", "analyze.funnel", "recommend.growth"],
  restrictedCapabilities: ["email.send_campaign", "publish.outbound"],
  providerPreference: "deepseek",
  cooldownMinutes: 30, executionTimeoutMs: 60_000, retryLimit: 2,
  run: async () => {
    const recs = await storage.listGrowthRecommendations(undefined, 20).catch(() => []);
    const open = recs.filter(r => r.status === "open" || r.status === "approved");
    const payload = { open: open.length, top: open.slice(0, 5).map(r => ({ id: r.id, title: scrub(r.title, 80) })) };
    const diag = await deepseekDiagnosis("Growth", payload);
    await rememberFact("snapshot", "growth", "open_recs", { count: open.length }, 70);
    return {
      output: { payload, diagnosis: diag.summary },
      confidence: open.length > 0 ? 70 : 40,
      summary: `growth_agent → ${open.length} open recs`,
    };
  },
};

const EXPERIMENT_AGENT: AgentDefinition = {
  key: "experiment_agent",
  description: "Reads experiment state and proposes new tests (recommendation-only).",
  allowedCapabilities: ["propose.experiment", "evaluate.experiment"],
  restrictedCapabilities: ["activate.experiment.high_traffic"],
  providerPreference: "deepseek",
  cooldownMinutes: 60, executionTimeoutMs: 60_000, retryLimit: 2,
  run: async () => {
    const list = await storage.listExperiments(undefined, 50).catch(() => []);
    const running = list.filter(e => e.status === "running").length;
    const winners = list.filter(e => e.winnerVariantKey).length;
    const payload = { running, winners, total: list.length };
    const diag = await deepseekDiagnosis("Experiment", payload);
    await rememberFact("snapshot", "experiments", "state", payload, 70);
    return { output: { payload, diagnosis: diag.summary }, confidence: 65, summary: `experiment_agent → running=${running} winners=${winners}` };
  },
};

const PERSONALIZATION_AGENT: AgentDefinition = {
  key: "personalization_agent",
  description: "Analyses personalization segments and surfaces opportunities.",
  allowedCapabilities: ["analyze.segments", "propose.personalization"],
  restrictedCapabilities: ["activate.personalization.high_traffic"],
  providerPreference: "deepseek",
  cooldownMinutes: 60, executionTimeoutMs: 60_000, retryLimit: 2,
  run: async () => {
    const stats = await storage.getPersonalizationEventStats().catch(() => []);
    const enriched = stats.filter(s => s.views >= 5);
    const top = enriched.slice().sort((a, b) => b.cvr - a.cvr).slice(0, 3);
    const payload = { segments: enriched.length, topCvr: top.map(t => ({ surface: t.surface, segment: t.segmentKey, cvr: t.cvr })) };
    const diag = await deepseekDiagnosis("Personalization", payload);
    await rememberFact("snapshot", "personalization", "top_cvr", payload, 65);
    return { output: { payload, diagnosis: diag.summary }, confidence: enriched.length > 0 ? 65 : 30, summary: `personalization_agent → ${enriched.length} segments` };
  },
};

const RELIABILITY_AGENT: AgentDefinition = {
  key: "reliability_agent",
  description: "Reads QA/recovery reports and flags reliability risks.",
  allowedCapabilities: ["analyze.health", "analyze.errors"],
  restrictedCapabilities: ["deploy.execute", "infra.scale"],
  providerPreference: "deepseek",
  cooldownMinutes: 30, executionTimeoutMs: 45_000, retryLimit: 2,
  run: async () => {
    const job = await storage.getAutomationJob("phase53_deepseek_qa_sentinel").catch(() => null);
    const payload = { qaLastRun: job?.lastFinishedAt ?? null, qaStatus: job?.status ?? "unknown", qaFailureCount: (job as any)?.failureCount ?? 0 };
    const diag = await deepseekDiagnosis("Reliability", payload);
    await rememberFact("snapshot", "reliability", "qa_state", payload, 60);
    return { output: { payload, diagnosis: diag.summary }, confidence: 60, summary: `reliability_agent → qa=${payload.qaStatus}` };
  },
};

const CONTENT_AGENT: AgentDefinition = {
  key: "content_agent",
  description: "Reads recent blog posts and surfaces content opportunities (recommendation-only).",
  allowedCapabilities: ["analyze.content", "propose.content"],
  restrictedCapabilities: ["publish.outbound"],
  providerPreference: "deepseek",
  cooldownMinutes: 120, executionTimeoutMs: 45_000, retryLimit: 1,
  run: async () => {
    const posts = await storage.getBlogPosts(true).catch(() => [] as any[]);
    const payload = { totalPublished: Array.isArray(posts) ? posts.length : 0 };
    const diag = await deepseekDiagnosis("Content", payload);
    await rememberFact("snapshot", "content", "blog_posts", payload, 55);
    return { output: { payload, diagnosis: diag.summary }, confidence: 55, summary: `content_agent → posts=${payload.totalPublished}` };
  },
};

const FOUNDER_AGENT: AgentDefinition = {
  key: "founder_agent",
  description: "Synthesises an executive briefing from prior agent outputs.",
  allowedCapabilities: ["synthesize.executive", "summarize.workflow"],
  restrictedCapabilities: ["publish.outbound", "email.send_campaign"],
  providerPreference: "openai",
  cooldownMinutes: 30, executionTimeoutMs: 60_000, retryLimit: 2,
  run: async (ctx) => {
    const payload = {
      workflowKey: ctx.workflowKey,
      upstream: Object.fromEntries(
        Object.entries(ctx.input).map(([k, v]) => [k, (v as any)?.payload ?? v])
      ),
    };
    try {
      const r = await runTask("executive_copy",
        {
          messages: [
            { role: "system", content: "You are the CEO Chief of Staff. In 4-6 tight bullets: state of the business, the strongest opportunity, the strongest risk, one safe next action. No JSON, no headers." },
            { role: "user", content: scrub(JSON.stringify(payload), 3500) },
          ],
          temperature: 0.35, maxTokens: 480,
        },
        { providerOverride: "openai" },
      );
      const summary = scrub(r.content, 1400);
      await rememberFact("briefing", "founder", "latest", { summary, provider: r.provider }, 75);
      return { output: { summary, provider: r.provider }, confidence: 75, summary: `founder_agent → ${summary.length}c` };
    } catch (e: any) {
      return { output: { summary: "", error: scrub(e?.message, 200) }, confidence: 0, summary: "founder_agent failed" };
    }
  },
};

// ─── Workflow definitions ─────────────────────────────────────────────────

export function registerOrchestratorRegistry() {
  for (const a of [REVENUE_AGENT, GROWTH_AGENT, EXPERIMENT_AGENT, PERSONALIZATION_AGENT, RELIABILITY_AGENT, CONTENT_AGENT, FOUNDER_AGENT]) {
    registerAgent(a);
  }

  // 1. Daily operational scan (multi-agent, no approval needed)
  registerWorkflow({
    workflowKey: "daily_operational_scan",
    description: "All read-only agents survey their domain and the founder agent synthesises.",
    defaultPriority: 60,
    cooldownMinutes: 60,
    steps: [
      { agentKey: "revenue_agent",         capability: "analyze.revenue" },
      { agentKey: "growth_agent",          capability: "analyze.growth" },
      { agentKey: "experiment_agent",      capability: "evaluate.experiment" },
      { agentKey: "personalization_agent", capability: "analyze.segments" },
      { agentKey: "reliability_agent",     capability: "analyze.health" },
      { agentKey: "founder_agent",         capability: "synthesize.executive" },
    ],
  });

  // 2. Traffic-drop response (multi-agent, no approval needed for analysis)
  registerWorkflow({
    workflowKey: "traffic_drop_detected",
    description: "Analyse the drop across growth, experiments, personalization; brief founder.",
    defaultPriority: 85,
    cooldownMinutes: 60,
    steps: [
      { agentKey: "growth_agent",          capability: "analyze.funnel" },
      { agentKey: "experiment_agent",      capability: "propose.experiment" },
      { agentKey: "personalization_agent", capability: "propose.personalization" },
      { agentKey: "revenue_agent",         capability: "analyze.forecast" },
      { agentKey: "founder_agent",         capability: "synthesize.executive" },
    ],
  });

  // 3. Pricing review — REQUIRES FOUNDER APPROVAL before any pricing capability
  registerWorkflow({
    workflowKey: "pricing_opportunity_review",
    description: "Revenue agent drafts a pricing hypothesis; workflow pauses for founder approval.",
    defaultPriority: 70,
    cooldownMinutes: 24 * 60,
    steps: [
      { agentKey: "revenue_agent", capability: "analyze.revenue" },
      // Approval gate — engine will park workflow as pending_founder_approval here.
      { agentKey: "revenue_agent", capability: "propose.pricing" },
      { agentKey: "founder_agent", capability: "synthesize.executive" },
    ],
  });

  // 4. Content cadence scan
  registerWorkflow({
    workflowKey: "content_cadence_scan",
    description: "Content agent checks publishing cadence; founder briefed.",
    defaultPriority: 40,
    cooldownMinutes: 24 * 60,
    steps: [
      { agentKey: "content_agent", capability: "analyze.content" },
      { agentKey: "founder_agent", capability: "summarize.workflow" },
    ],
  });
}
