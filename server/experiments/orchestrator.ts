// Phase 57 — AI Experiment Orchestrator
//
// A controlled A/B experiment lifecycle:
//   draft → proposed → approved → running → completed (or → rolled_back)
//
// Safety contract:
//   - Never auto-deploys code. Variants are content-config only (copy/cta/banner).
//   - Never mutates pricing, payments, orders, or email queue.
//   - assignVariant is deterministic per subject (sticky), respects trafficAllocation.
//   - Only "running" experiments serve assignments; rolled_back / draft / proposed do not.
//   - Founder approval required to transition proposed → approved → running.
//   - DeepSeek for diagnostics + experiment generation; OpenAI for executive narrative.
//   - Free-text scrubber before any LLM call; logs are summary-only (no PII/keys).

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { createHash } from "crypto";
import type {
  Experiment,
  ExperimentVariant,
  GrowthRecommendation,
  InsertExperiment,
} from "@shared/schema";

export type ExperimentStatus =
  | "draft" | "proposed" | "approved" | "running" | "completed" | "rolled_back";

const VALID_TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
  draft: ["proposed", "rolled_back"],
  proposed: ["approved", "rolled_back"],
  approved: ["running", "rolled_back"],
  running: ["completed", "rolled_back"],
  completed: ["rolled_back"],
  rolled_back: [],
};

const SCRUB_PATTERNS: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/DASHBOARD_PIN[^\s]*/gi, "[redacted:pin]"],
  [/(OPENAI|DEEPSEEK|RESEND|STRIPE)_[A-Z_]*KEY[^\s]*/g, "[redacted:key]"],
];
function scrub(s: any, maxLen = 1000): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB_PATTERNS) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

// ── Deterministic variant assignment via SHA-256 hash bucketing ──────────────
function hashBucket(seed: string): number {
  const h = createHash("sha256").update(seed).digest();
  // first 4 bytes → [0..1)
  const n = h.readUInt32BE(0);
  return n / 0x1_0000_0000;
}

function pickVariant(experiment: Experiment, subjectKey: string): { variantKey: string; included: boolean } {
  const variants = (experiment.variants as unknown as ExperimentVariant[]) ?? [];
  const valid = variants.filter(v => v && typeof v.key === "string" && Number.isFinite(v.weight));
  if (valid.length === 0) return { variantKey: "control", included: false };

  // gate by trafficAllocation
  const allocBucket = hashBucket(`alloc:${experiment.experimentKey}:${subjectKey}`);
  const alloc = Math.max(0, Math.min(100, experiment.trafficAllocation ?? 100));
  if (allocBucket * 100 >= alloc) return { variantKey: "control", included: false };

  // weighted selection
  const totalWeight = valid.reduce((s, v) => s + Math.max(0, v.weight), 0);
  if (totalWeight <= 0) return { variantKey: valid[0].key, included: true };
  const bucket = hashBucket(`variant:${experiment.experimentKey}:${subjectKey}`) * totalWeight;
  let acc = 0;
  for (const v of valid) {
    acc += Math.max(0, v.weight);
    if (bucket < acc) return { variantKey: v.key, included: true };
  }
  return { variantKey: valid[valid.length - 1].key, included: true };
}

export async function assignVariant(experimentKey: string, subjectKey: string): Promise<{
  experimentKey: string;
  variantKey: string;
  status: ExperimentStatus;
  served: boolean;
}> {
  const exp = await storage.getExperimentByKey(experimentKey);
  if (!exp) return { experimentKey, variantKey: "control", status: "draft", served: false };
  if (exp.status !== "running") {
    return { experimentKey, variantKey: "control", status: exp.status as ExperimentStatus, served: false };
  }
  const existing = await storage.getExperimentAssignment(exp.id, subjectKey);
  if (existing) {
    return { experimentKey, variantKey: existing.variantKey, status: "running", served: true };
  }
  const picked = pickVariant(exp, subjectKey);
  if (!picked.included) {
    // Excluded by traffic allocation — do not write assignment row.
    return { experimentKey, variantKey: "control", status: "running", served: false };
  }
  const row = await storage.getOrCreateExperimentAssignment(exp.id, subjectKey, picked.variantKey);
  return { experimentKey, variantKey: row.variantKey, status: "running", served: true };
}

export async function recordEvent(
  experimentKey: string,
  subjectKey: string,
  eventType: string,
  value?: number | null
): Promise<{ ok: boolean }> {
  const exp = await storage.getExperimentByKey(experimentKey);
  if (!exp || exp.status !== "running") return { ok: false };
  const assignment = await storage.getExperimentAssignment(exp.id, subjectKey);
  if (!assignment) return { ok: false };
  await storage.recordExperimentEvent(
    exp.id,
    assignment.variantKey,
    subjectKey,
    eventType.slice(0, 40),
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null
  );
  return { ok: true };
}

// ── Statistical analysis: two-proportion z-test vs control ───────────────────
function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26 approximation
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}
function pValueTwoSidedZ(z: number): number {
  const p = 1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2));
  return Math.max(0, Math.min(1, 2 * p));
}

export type VariantStats = {
  variantKey: string;
  isControl: boolean;
  assignments: number;
  conversions: number;
  revenueCents: number;
  conversionRate: number; // 0..1
  liftPct: number | null;
  zScore: number | null;
  pValue: number | null;
  confidence: number; // 0..1 (1 - pValue), null treated as 0
};

export function computeAnalysis(
  variants: ExperimentVariant[],
  stats: Array<{ variantKey: string; assignments: number; conversions: number; revenueCents: number }>
): { variants: VariantStats[]; winner: string | null; minConfidence: number } {
  const byKey = new Map(stats.map(s => [s.variantKey, s]));
  const enriched = variants.map(v => {
    const s = byKey.get(v.key) ?? { variantKey: v.key, assignments: 0, conversions: 0, revenueCents: 0 };
    const rate = s.assignments > 0 ? s.conversions / s.assignments : 0;
    return {
      variantKey: v.key,
      isControl: !!v.isControl,
      assignments: s.assignments,
      conversions: s.conversions,
      revenueCents: s.revenueCents,
      conversionRate: rate,
      liftPct: null as number | null,
      zScore: null as number | null,
      pValue: null as number | null,
      confidence: 0,
    } as VariantStats;
  });

  const control = enriched.find(v => v.isControl) ?? enriched[0];
  if (!control) return { variants: [], winner: null, minConfidence: 0 };

  for (const v of enriched) {
    if (v.variantKey === control.variantKey) {
      v.confidence = 0;
      continue;
    }
    // two-proportion z-test
    const n1 = control.assignments, x1 = control.conversions;
    const n2 = v.assignments, x2 = v.conversions;
    if (n1 < 5 || n2 < 5) { v.confidence = 0; continue; }
    const p1 = x1 / n1, p2 = x2 / n2;
    const pPool = (x1 + x2) / (n1 + n2);
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
    if (se === 0) { v.confidence = 0; continue; }
    const z = (p2 - p1) / se;
    const p = pValueTwoSidedZ(z);
    v.liftPct = control.conversionRate > 0
      ? Math.round(((p2 - p1) / p1) * 1000) / 10
      : null;
    v.zScore = Math.round(z * 1000) / 1000;
    v.pValue = Math.round(p * 10000) / 10000;
    v.confidence = Math.round((1 - p) * 100) / 100;
  }

  // winner: highest CR among variants whose FULL-PRECISION (1 - pValue) >= 0.9 and lift > 0.
  // Note: we intentionally use raw pValue (not the rounded `confidence` display field) to avoid boundary bias.
  const significant = enriched.filter(v =>
    !v.isControl
    && v.pValue != null
    && (1 - v.pValue) >= 0.9
    && (v.liftPct ?? 0) > 0
  );
  const winner = significant.sort((a, b) => b.conversionRate - a.conversionRate)[0]?.variantKey ?? null;
  const minConfidence = Math.min(...enriched.filter(v => !v.isControl).map(v => v.confidence), 1);
  return { variants: enriched, winner, minConfidence: Number.isFinite(minConfidence) ? minConfidence : 0 };
}

export async function analyzeExperiment(experimentId: number): Promise<{
  experiment: Experiment;
  analysis: ReturnType<typeof computeAnalysis>;
}> {
  const exp = await storage.getExperiment(experimentId);
  if (!exp) throw new Error("Experiment not found");
  const stats = await storage.getExperimentVariantStats(experimentId);
  const variants = (exp.variants as unknown as ExperimentVariant[]) ?? [];
  const analysis = computeAnalysis(variants, stats);

  // Optional AI narrative — only if there's at least some data and an actionable picture
  const totalAssign = analysis.variants.reduce((s, v) => s + v.assignments, 0);
  if (totalAssign >= 10) {
    const ai = await generateNarrative(exp, analysis);
    await storage.updateExperiment(experimentId, {
      diagnosticsSummary: ai.diagnostics,
      executiveSummary: ai.executive,
      diagnosticsProvider: ai.diagnosticsProvider,
      executiveProvider: ai.executiveProvider,
      confidence: Math.round(analysis.minConfidence * 100),
      winnerVariantKey: analysis.winner ?? exp.winnerVariantKey ?? null,
    } as any);
    const refreshed = await storage.getExperiment(experimentId);
    return { experiment: refreshed!, analysis };
  }
  return { experiment: exp, analysis };
}

async function generateNarrative(exp: Experiment, analysis: ReturnType<typeof computeAnalysis>): Promise<{
  diagnostics: string; executive: string; diagnosticsProvider: string; executiveProvider: string;
}> {
  const payload = {
    experiment: {
      key: exp.experimentKey,
      name: scrub(exp.name, 200),
      hypothesis: scrub(exp.hypothesis, 600),
      surface: exp.surface,
      targetMetric: exp.targetMetric,
      trafficAllocation: exp.trafficAllocation,
      status: exp.status,
    },
    analysis,
  };

  let diagnostics = "", diagnosticsProvider = "deepseek";
  try {
    const d = await runTask(
      "diagnostics",
      {
        messages: [
          { role: "system", content: "You are a Senior Experimentation Analyst. Given an A/B test snapshot, write 3–5 short bullets covering: sample size adequacy, statistical significance, lift magnitude, risk of false positive, and one clear next action. Plain English, <= 500 chars total. No JSON." },
          { role: "user", content: JSON.stringify(payload, null, 2) },
        ],
        temperature: 0.3,
        maxTokens: 500,
      },
      { providerOverride: "deepseek" }
    );
    diagnostics = scrub(d.content, 1500);
    diagnosticsProvider = d.provider;
  } catch (e: any) {
    console.warn(`[experiments] diagnostics failed: ${scrub(e?.message, 200)}`);
  }

  let executive = "", executiveProvider = "openai";
  try {
    const e = await runTask(
      "executive_copy",
      {
        messages: [
          { role: "system", content: "You are Chief Experimentation Officer briefing the founder. In 3–5 tight bullets, give a calm, decisive verdict: keep running, declare a winner, or kill. Anchor on conversion lift, confidence, and revenue impact. No JSON." },
          { role: "user", content: JSON.stringify(payload, null, 2) },
        ],
        temperature: 0.4,
        maxTokens: 500,
      },
      { providerOverride: "openai" }
    );
    executive = scrub(e.content, 2000);
    executiveProvider = e.provider;
  } catch (e: any) {
    console.warn(`[experiments] exec summary failed: ${scrub(e?.message, 200)}`);
  }

  console.log(`[experiments] analyzed id=${exp.id} winner=${analysis.winner ?? "none"} minConfidence=${analysis.minConfidence.toFixed(2)}`);
  return { diagnostics, executive, diagnosticsProvider, executiveProvider };
}

// ── Proposal generation from a Phase 56 growth recommendation ─────────────────
export async function proposeFromRecommendation(input: {
  recommendationId?: number;
  hypothesis?: string;
  surface?: string;
  targetMetric?: string;
}): Promise<{ experiment: Experiment }> {
  let rec: GrowthRecommendation | null = null;
  if (input.recommendationId) {
    rec = await storage.getGrowthRecommendation(input.recommendationId);
    if (!rec) throw new Error("Recommendation not found");
  }
  const hypothesis = scrub(input.hypothesis ?? rec?.rationale ?? rec?.title ?? "Improve target metric", 600);
  const surface = (input.surface ?? rec?.category ?? "generic").slice(0, 60);
  const targetMetric = (input.targetMetric ?? "conversion").slice(0, 60);

  const sys = "You are a Senior Experimentation Designer. Given a hypothesis, return ONLY JSON: " +
    '{ "name": string (<=100), "experimentKey": string (slug, <=80, lowercase-with-dashes), ' +
    '"variants": [{"key":"control","name":"Control","weight":50,"isControl":true,"description":string,"config":object},' +
    '{"key":"variant_a","name":string,"weight":50,"isControl":false,"description":string,"config":object}] } ' +
    "config holds content-only fields (copy, cta, banner text). No pricing, no payments, no email triggers. " +
    "Weights must sum to 100. Exactly one control. 2–3 variants total.";
  const user = `Hypothesis: ${hypothesis}\nSurface: ${surface}\nTarget metric: ${targetMetric}`;

  let parsed: any = {};
  let provider = "deepseek";
  try {
    const r = await runTask(
      "diagnostics",
      {
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        temperature: 0.5,
        maxTokens: 800,
        jsonMode: true,
      },
      { providerOverride: "deepseek" }
    );
    provider = r.provider;
    try { parsed = JSON.parse(r.content); } catch { parsed = {}; }
  } catch (e: any) {
    console.warn(`[experiments] propose failed: ${scrub(e?.message, 200)}`);
  }

  const name = scrub(parsed?.name ?? (rec?.title ?? "Untitled experiment"), 200);
  const rawKey = String(parsed?.experimentKey ?? "")
    .toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
    || `exp-${Date.now().toString(36)}`;
  const experimentKey = `${rawKey}-${Date.now().toString(36).slice(-4)}`;

  // Validate variants
  let variants: ExperimentVariant[] = Array.isArray(parsed?.variants) ? parsed.variants : [];
  variants = variants
    .filter((v: any) => v && typeof v.key === "string" && typeof v.name === "string")
    .map((v: any) => ({
      key: String(v.key).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40) || "v",
      name: scrub(v.name, 80),
      description: v.description ? scrub(v.description, 300) : undefined,
      weight: Math.max(0, Math.min(100, Number(v.weight) || 0)),
      isControl: !!v.isControl,
      config: typeof v.config === "object" && v.config !== null ? v.config : {},
    }));
  // Fallback: ensure a usable default
  if (variants.length < 2 || !variants.some(v => v.isControl)) {
    variants = [
      { key: "control", name: "Control", weight: 50, isControl: true, config: {}, description: "Baseline experience" },
      { key: "variant_a", name: "Variant A", weight: 50, isControl: false, config: {}, description: "Proposed change" },
    ];
  }
  // Normalize weights to sum to 100
  const total = variants.reduce((s, v) => s + v.weight, 0) || 1;
  variants = variants.map(v => ({ ...v, weight: Math.round((v.weight / total) * 100) }));

  const insert: InsertExperiment = {
    experimentKey,
    name,
    hypothesis,
    surface,
    targetMetric,
    variants: variants as any,
    trafficAllocation: 50, // safe default; founder can raise
    status: "proposed",
    recommendationId: rec?.id ?? null,
    diagnosticsProvider: provider,
    diagnosticsSummary: "",
    executiveSummary: "",
    executiveProvider: null,
    confidence: 0,
    decidedBy: null,
    winnerVariantKey: null,
    rollbackReason: null,
  } as InsertExperiment;

  const experiment = await storage.createExperiment(insert);
  console.log(`[experiments] proposed id=${experiment.id} key=${experiment.experimentKey} variants=${variants.length}`);
  return { experiment };
}

export async function decideExperiment(
  id: number,
  action: "approve" | "reject" | "start" | "complete" | "rollback",
  decidedBy: string,
  rollbackReason?: string
): Promise<Experiment> {
  const exp = await storage.getExperiment(id);
  if (!exp) throw new Error("Experiment not found");
  const from = exp.status as ExperimentStatus;
  const toMap: Record<typeof action, ExperimentStatus> = {
    approve: "approved",
    reject: "rolled_back",
    start: "running",
    complete: "completed",
    rollback: "rolled_back",
  };
  const to = toMap[action];
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
  const patch: Partial<Experiment> = {
    status: to,
    decidedBy,
    decidedAt: new Date(),
  };
  if (to === "running" && !exp.startedAt) patch.startedAt = new Date();
  if (to === "completed") patch.completedAt = new Date();
  if (to === "rolled_back") {
    patch.completedAt = exp.completedAt ?? new Date();
    patch.rollbackReason = scrub(rollbackReason ?? "Founder rollback", 500);
  }
  const updated = await storage.updateExperiment(id, patch);
  console.log(`[experiments] decision id=${id} ${from}→${to} by=${decidedBy}`);
  return updated;
}
