// Phase 58 — Autonomous Personalization Engine
//
// Safe adaptive personalization layered on top of the Experiment Orchestrator (Phase 57).
//
// SAFETY CONTRACT (hard-enforced, not optional):
//   - SAFE_SURFACES is a closed whitelist; anything outside is rejected.
//   - BLOCKED_SURFACES double-bans price / checkout / payment / discount / email body.
//   - SIGNAL_ALLOWLIST gates which behavioral signals can persist or reach an LLM.
//   - PROTECTED_SIGNAL_DENYLIST blocks any inference key that hints at protected class
//     (age, gender, race, religion, sexual orientation, disability, national origin,
//     income, geo-precise location, IP, full name, email, phone).
//   - All free-text scrubbed before any LLM call. Logs are summary-only.
//   - Rule activation requires founder approval (pending → active).
//   - Engine never deploys code, never mutates pricing, payments, orders, or email.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import type {
  PersonalizationSegment,
  PersonalizationProfile,
  PersonalizationRule,
  InsertPersonalizationSegment,
  InsertPersonalizationRule,
} from "@shared/schema";

export const SAFE_SURFACES = [
  "hero",
  "cta_primary",
  "cta_secondary",
  "banner",
  "chat_prompt",
  "newsletter_copy",
  "popup_headline",
] as const;
export type SafeSurface = typeof SAFE_SURFACES[number];

export const BLOCKED_SURFACES = new Set([
  "price", "pricing", "checkout", "payment", "discount", "discount_amount",
  "email_body", "email_subject", "billing", "invoice", "refund",
]);

// Only these behavioral signal keys are allowed to be persisted or sent to the LLM.
// These are aggregate / non-sensitive interaction signals.
export const SIGNAL_ALLOWLIST = new Set([
  "visit_count", "session_count", "time_on_site_bucket",
  "page_categories", "interacted_with_chat", "chat_message_count",
  "days_since_first_visit", "referrer_category", "device_class",
  "viewed_apps", "viewed_books", "viewed_art", "viewed_pricing",
  "newsletter_subscribed", "scrolled_deep",
]);

// Hard denylist — protected-class proxies and PII.
export const PROTECTED_SIGNAL_DENYLIST = new Set([
  "age", "birthday", "birthdate", "dob", "gender", "sex", "race", "ethnicity",
  "religion", "religious", "orientation", "sexual_orientation", "disability",
  "national_origin", "nationality", "marital_status", "pregnancy",
  "income", "salary", "credit_score", "wealth",
  "ip", "ip_address", "geo", "latitude", "longitude", "city", "country",
  "address", "postal_code", "zip", "name", "full_name", "email", "phone",
  "ssn", "tax_id", "payment_method", "card_last4", "bank_account",
]);

export const INTENTS = ["awareness", "research", "compare", "ready_to_buy", "support", "unknown"] as const;
export type Intent = typeof INTENTS[number];

export const FUNNEL_STAGES = ["awareness", "interest", "consideration", "decision", "advocacy"] as const;
export type FunnelStage = typeof FUNNEL_STAGES[number];

const SCRUB_PATTERNS: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];
function scrub(s: any, maxLen = 1000): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB_PATTERNS) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

/** Drops any key not on SIGNAL_ALLOWLIST or that appears on PROTECTED_SIGNAL_DENYLIST. */
export function sanitizeSignals(raw: any): Record<string, any> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, any> = {};
  for (const [k, vRaw] of Object.entries(raw)) {
    const key = String(k).toLowerCase().slice(0, 40);
    if (PROTECTED_SIGNAL_DENYLIST.has(key)) continue;
    if (!SIGNAL_ALLOWLIST.has(key)) continue;
    let v: any = vRaw;
    if (typeof v === "string") v = scrub(v, 80);
    if (typeof v === "number" && Number.isFinite(v)) v = Math.max(-1e6, Math.min(1e6, v));
    if (Array.isArray(v)) v = v.slice(0, 20).map(x => typeof x === "string" ? scrub(x, 40) : x);
    if (typeof v === "object" && v !== null && !Array.isArray(v)) continue; // no nested objects
    out[key] = v;
  }
  return out;
}

export function isSafeSurface(surface: string): surface is SafeSurface {
  const s = String(surface || "").toLowerCase();
  if (BLOCKED_SURFACES.has(s)) return false;
  return (SAFE_SURFACES as readonly string[]).includes(s);
}

// ── Behavioral scoring (0..100) + intent + stage inference ───────────────────
export function scoreBehavior(signals: Record<string, any>): {
  score: number; intent: Intent; funnelStage: FunnelStage;
} {
  let score = 0;
  const visits = Number(signals.visit_count) || 0;
  const sessions = Number(signals.session_count) || 0;
  const days = Number(signals.days_since_first_visit) || 0;
  const chatMsgs = Number(signals.chat_message_count) || 0;
  const interactedChat = !!signals.interacted_with_chat;
  const scrolledDeep = !!signals.scrolled_deep;
  const newsletter = !!signals.newsletter_subscribed;
  const viewedPricing = !!signals.viewed_pricing;
  const viewedApps = !!signals.viewed_apps;
  const viewedBooks = !!signals.viewed_books;
  const viewedArt = !!signals.viewed_art;

  score += Math.min(20, visits * 2);
  score += Math.min(10, sessions * 3);
  score += Math.min(10, days);
  score += interactedChat ? 10 : 0;
  score += Math.min(15, chatMsgs * 3);
  score += scrolledDeep ? 8 : 0;
  score += newsletter ? 12 : 0;
  score += viewedPricing ? 15 : 0;
  score += (viewedApps || viewedBooks || viewedArt) ? 5 : 0;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let intent: Intent = "unknown";
  if (chatMsgs >= 3 || viewedPricing) intent = "ready_to_buy";
  else if (interactedChat || scrolledDeep) intent = "compare";
  else if (visits >= 2 || newsletter) intent = "research";
  else if (visits >= 1) intent = "awareness";

  let funnelStage: FunnelStage = "awareness";
  if (score >= 70) funnelStage = "decision";
  else if (score >= 45) funnelStage = "consideration";
  else if (score >= 20) funnelStage = "interest";
  else funnelStage = "awareness";

  return { score, intent, funnelStage };
}

/** Classify subject into a segment based on score/intent + segment rule expressions. */
export function pickSegment(
  segments: PersonalizationSegment[],
  signals: Record<string, any>,
  score: number,
  intent: Intent,
  stage: FunnelStage
): string {
  const candidates = segments
    .filter(s => s.status === "active" && s.segmentKey !== "default")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  for (const seg of candidates) {
    const rules = Array.isArray(seg.rules) ? (seg.rules as any[]) : [];
    let matched = rules.length === 0; // no rules → only as fallback after sorting
    for (const rule of rules) {
      try {
        if (!rule || typeof rule !== "object") continue;
        const field = String(rule.field || "");
        const op = String(rule.op || "eq");
        const val = rule.value;
        let actual: any;
        if (field === "score") actual = score;
        else if (field === "intent") actual = intent;
        else if (field === "funnel_stage") actual = stage;
        else if (SIGNAL_ALLOWLIST.has(field)) actual = (signals as any)[field];
        else continue;
        if (op === "eq" && actual === val) { matched = true; continue; }
        if (op === "neq" && actual !== val) { matched = true; continue; }
        if (op === "gte" && Number(actual) >= Number(val)) { matched = true; continue; }
        if (op === "lte" && Number(actual) <= Number(val)) { matched = true; continue; }
        if (op === "in" && Array.isArray(val) && val.includes(actual)) { matched = true; continue; }
        if (op === "truthy" && !!actual) { matched = true; continue; }
        matched = false; break;
      } catch {
        matched = false; break;
      }
    }
    if (matched && rules.length > 0) return seg.segmentKey;
  }
  return "default";
}

export async function classifySubject(
  subjectKey: string,
  rawSignals: any
): Promise<{ profile: PersonalizationProfile }> {
  const signals = sanitizeSignals(rawSignals);
  const { score, intent, funnelStage } = scoreBehavior(signals);
  const segments = await storage.listPersonalizationSegments();
  const segmentKey = pickSegment(segments, signals, score, intent, funnelStage);
  const profile = await storage.upsertPersonalizationProfile({
    subjectKey: subjectKey.slice(0, 120),
    segmentKey,
    behavioralScore: score,
    intent,
    funnelStage,
    signals,
  });
  return { profile };
}

export async function getPersonalizedContent(
  surface: string,
  subjectKey: string
): Promise<{
  surface: string; segmentKey: string; ruleId: number | null;
  variant: Record<string, any>; isDefault: boolean;
}> {
  if (!isSafeSurface(surface)) {
    return { surface, segmentKey: "default", ruleId: null, variant: {}, isDefault: true };
  }
  const profile = await storage.getPersonalizationProfile(subjectKey);
  const segmentKey = profile?.segmentKey ?? "default";
  const rule = await storage.findActivePersonalizationRule(surface, segmentKey);
  if (rule) {
    return {
      surface, segmentKey, ruleId: rule.id,
      variant: (rule.contentVariant as any) ?? {}, isDefault: false,
    };
  }
  // Fallback: try default segment
  if (segmentKey !== "default") {
    const fb = await storage.findActivePersonalizationRule(surface, "default");
    if (fb) return { surface, segmentKey: "default", ruleId: fb.id, variant: (fb.contentVariant as any) ?? {}, isDefault: true };
  }
  return { surface, segmentKey, ruleId: null, variant: {}, isDefault: true };
}

export async function recordPersonalizationEvent(input: {
  subjectKey: string;
  surface: string;
  eventType: string;
  ruleId?: number | null;
  value?: number | null;
}): Promise<{ ok: boolean }> {
  if (!isSafeSurface(input.surface)) return { ok: false };
  const profile = await storage.getPersonalizationProfile(input.subjectKey);
  const segmentKey = profile?.segmentKey ?? "default";
  await storage.recordPersonalizationEvent({
    subjectKey: input.subjectKey.slice(0, 120),
    segmentKey,
    surface: input.surface,
    ruleId: input.ruleId ?? null,
    eventType: String(input.eventType).slice(0, 40),
    value: typeof input.value === "number" && Number.isFinite(input.value)
      ? Math.max(0, Math.round(input.value)) : null,
  });
  return { ok: true };
}

// ── Founder-side workflows ───────────────────────────────────────────────────

export async function proposeRulesForSurface(input: {
  surface: string;
  hypothesis?: string;
}): Promise<{ rules: PersonalizationRule[] }> {
  if (!isSafeSurface(input.surface)) {
    throw new Error(`Surface "${input.surface}" is not on the safe list.`);
  }
  const segments = await storage.listPersonalizationSegments();
  const activeSegments = segments.filter(s => s.status === "active");

  const sys = "You are a Senior Personalization Designer. Given a list of visitor segments and a target surface, " +
    "return ONLY JSON: { \"rules\": [{ \"segmentKey\": string, \"contentVariant\": { ...content-only fields... }, " +
    "\"rationale\": string }] }. " +
    "contentVariant must be content-only — copy, headline, subheadline, ctaLabel, ctaHref (relative paths only), bannerText. " +
    "Strictly forbidden: prices, discounts, payment-related fields, email triggers, or any sensitive demographic targeting. " +
    "Tone must be inclusive and respectful. Keep each variant <=300 chars total.";
  const payload = {
    surface: input.surface,
    hypothesis: scrub(input.hypothesis ?? "Adapt copy per behavioral segment to lift conversion.", 400),
    segments: activeSegments.map(s => ({
      key: s.segmentKey, name: scrub(s.name, 80), description: scrub(s.description, 200),
    })),
  };

  let parsed: any = {};
  let provider = "deepseek";
  try {
    const r = await runTask(
      "diagnostics",
      {
        messages: [{ role: "system", content: sys }, { role: "user", content: JSON.stringify(payload) }],
        temperature: 0.5, maxTokens: 900, jsonMode: true,
      },
      { providerOverride: "deepseek" }
    );
    provider = r.provider;
    try { parsed = JSON.parse(r.content); } catch { parsed = {}; }
  } catch (e: any) {
    console.warn(`[personalization] propose failed: ${scrub(e?.message, 200)}`);
  }

  const created: PersonalizationRule[] = [];
  const proposed = Array.isArray(parsed?.rules) ? parsed.rules : [];
  for (const r of proposed) {
    const segmentKey = String(r?.segmentKey || "").toLowerCase().slice(0, 80);
    if (!segmentKey || !activeSegments.some(s => s.segmentKey === segmentKey)) continue;
    const cv = sanitizeContentVariant(r?.contentVariant);
    const insert: InsertPersonalizationRule = {
      surface: input.surface,
      segmentKey,
      contentVariant: cv as any,
      rationale: scrub(r?.rationale, 500),
      status: "pending",
      priority: 0,
      decidedBy: null,
      diagnosticsProvider: provider,
      diagnosticsSummary: "",
      executiveSummary: "",
      executiveProvider: null,
    } as InsertPersonalizationRule;
    const row = await storage.createPersonalizationRule(insert);
    created.push(row);
  }
  console.log(`[personalization] proposed surface=${input.surface} count=${created.length}`);
  return { rules: created };
}

const BLOCKED_VARIANT_KEYS = new Set([
  "price", "amount", "cents", "currency", "discount", "discount_pct", "coupon",
  "payment", "card", "stripe", "email", "to_email", "send_email", "ssn", "tax",
]);

function sanitizeContentVariant(raw: any): Record<string, any> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, any> = {};
  for (const [k, vRaw] of Object.entries(raw)) {
    const key = String(k).toLowerCase().slice(0, 40);
    if (BLOCKED_VARIANT_KEYS.has(key)) continue;
    let v: any = vRaw;
    if (typeof v === "string") {
      v = scrub(v, 280);
      // Block external URLs in any href-ish field; allow only relative paths or anchor links.
      if (/href|url|link/.test(key)) {
        if (!/^\/[A-Za-z0-9_/?&=#.-]*$/.test(v) && !/^#/.test(v)) continue;
      }
    } else if (typeof v === "number" && Number.isFinite(v)) {
      v = Math.max(-1e6, Math.min(1e6, v));
    } else if (Array.isArray(v)) {
      v = v.slice(0, 10).map(x => typeof x === "string" ? scrub(x, 120) : x);
    } else if (typeof v === "boolean") {
      // ok
    } else {
      continue;
    }
    out[key] = v;
  }
  return out;
}

export async function decideRule(
  id: number,
  action: "approve" | "reject" | "activate" | "deactivate",
  decidedBy: string
): Promise<PersonalizationRule> {
  const rule = await storage.getPersonalizationRule(id);
  if (!rule) throw new Error("Rule not found");
  const from = rule.status;
  const map: Record<typeof action, { to: string; from: string[] }> = {
    approve: { to: "approved", from: ["pending"] },
    reject: { to: "rejected", from: ["pending", "approved", "active"] },
    activate: { to: "active", from: ["approved", "inactive"] },
    deactivate: { to: "inactive", from: ["active"] },
  };
  const t = map[action];
  if (!t.from.includes(from)) throw new Error(`Invalid transition: ${from} → ${t.to}`);
  // Only one ACTIVE rule per (surface, segment) at a time.
  if (t.to === "active") {
    await storage.deactivateOtherPersonalizationRules(rule.surface, rule.segmentKey, rule.id);
  }
  const updated = await storage.updatePersonalizationRule(id, {
    status: t.to, decidedBy, decidedAt: new Date(),
  });
  console.log(`[personalization] rule=${id} ${from}→${t.to} by=${decidedBy}`);
  return updated;
}

export async function analyzePerformance(surface?: string): Promise<{
  perSegment: Array<{
    surface: string; segmentKey: string; views: number; clicks: number; conversions: number;
    ctr: number; cvr: number; revenueCents: number;
  }>;
  diagnostics: string;
  executive: string;
  diagnosticsProvider: string;
  executiveProvider: string;
}> {
  const safeSurface = surface && isSafeSurface(surface) ? surface : undefined;
  const rows = await storage.getPersonalizationEventStats(safeSurface);

  let diagnostics = "", diagnosticsProvider = "deepseek";
  let executive = "", executiveProvider = "openai";
  const totalEvents = rows.reduce((s, r) => s + r.views + r.clicks + r.conversions, 0);
  if (totalEvents >= 10) {
    const payload = { surface: safeSurface ?? "all", perSegment: rows };
    try {
      const d = await runTask(
        "diagnostics",
        {
          messages: [
            { role: "system", content: "You are a Senior Personalization Analyst. In 3–5 short bullets, diagnose per-segment CTR/CVR, sample-size adequacy, and one safe optimization. Plain English, no JSON." },
            { role: "user", content: JSON.stringify(payload) },
          ],
          temperature: 0.3, maxTokens: 500,
        },
        { providerOverride: "deepseek" }
      );
      diagnostics = scrub(d.content, 1500);
      diagnosticsProvider = d.provider;
    } catch (e: any) { console.warn(`[personalization] diag failed: ${scrub(e?.message, 200)}`); }
    try {
      const e = await runTask(
        "executive_copy",
        {
          messages: [
            { role: "system", content: "You are Chief Experience Officer briefing the founder. 3–5 tight bullets: which segment to prioritize, which copy is winning, one risk to watch. Inclusive tone. No JSON." },
            { role: "user", content: JSON.stringify(payload) },
          ],
          temperature: 0.4, maxTokens: 500,
        },
        { providerOverride: "openai" }
      );
      executive = scrub(e.content, 2000);
      executiveProvider = e.provider;
    } catch (e: any) { console.warn(`[personalization] exec failed: ${scrub(e?.message, 200)}`); }
  }
  console.log(`[personalization] analyzed surface=${safeSurface ?? "all"} segments=${rows.length} events=${totalEvents}`);
  return { perSegment: rows, diagnostics, executive, diagnosticsProvider, executiveProvider };
}

export async function upsertSegment(input: InsertPersonalizationSegment): Promise<PersonalizationSegment> {
  // Sanitize: ensure rules only reference allowed signal fields.
  const rules = Array.isArray((input as any).rules) ? (input as any).rules : [];
  const safeRules = rules.filter((r: any) => {
    if (!r || typeof r !== "object") return false;
    const field = String(r.field || "");
    if (["score", "intent", "funnel_stage"].includes(field)) return true;
    return SIGNAL_ALLOWLIST.has(field);
  }).slice(0, 20);
  const safe: InsertPersonalizationSegment = {
    ...input,
    segmentKey: String(input.segmentKey).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 60),
    name: scrub(input.name, 160),
    description: scrub(input.description ?? "", 600),
    rules: safeRules as any,
    priority: Math.max(0, Math.min(100, Number(input.priority) || 0)),
    status: input.status === "inactive" ? "inactive" : "active",
  };
  return storage.upsertPersonalizationSegment(safe);
}
