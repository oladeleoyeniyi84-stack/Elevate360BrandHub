// Phase 67 — Cognitive OS: priority engine (leaf module).
//
// Pure, deterministic ranking + PII scrub utility shared by the other cognitive
// engines. No I/O, no mutation.

import type { CognitiveSignal, RankedSignal, SystemSummary } from "@shared/types/cognitive";

const SCRUB: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];

export function scrub(s: any, maxLen = 4000): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

// Recursively scrub every string in a structure before persistence.
export function deepScrub<T>(v: T): T {
  if (typeof v === "string") return scrub(v, 2400) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => deepScrub(x)) as unknown as T;
  if (v && typeof v === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(v as any)) out[k] = deepScrub(val);
    return out;
  }
  return v;
}

export function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Cognitive priority score weights raw priority more than confidence.
export function scoreSignal(s: CognitiveSignal): number {
  return clamp(s.priority * 0.65 + s.confidence * 0.35);
}

export function rankSignals(signals: CognitiveSignal[]): RankedSignal[] {
  return signals
    .map((s) => ({ ...s, score: scoreSignal(s) }))
    .sort((a, b) => b.score - a.score);
}

// Weighted pressure across all open signals (0-100). More high-priority,
// high-confidence signals → higher cognitive load.
export function cognitiveLoad(signals: CognitiveSignal[]): number {
  if (signals.length === 0) return 0;
  const ranked = signals.map(scoreSignal).sort((a, b) => b - a);
  // Emphasise the top of the stack — that's where attention actually goes.
  const top = ranked.slice(0, 12);
  const avg = top.reduce((s, v) => s + v, 0) / top.length;
  const volumeBoost = Math.min(20, signals.length);
  return clamp(avg * 0.85 + volumeBoost);
}

export function summarizeSystems(signals: CognitiveSignal[]): SystemSummary[] {
  const groups = new Map<string, CognitiveSignal[]>();
  for (const s of signals) {
    const arr = groups.get(s.system) ?? [];
    arr.push(s);
    groups.set(s.system, arr);
  }
  const out: SystemSummary[] = [];
  for (const [system, arr] of Array.from(groups.entries())) {
    const areaCounts = new Map<string, number>();
    for (const s of arr) areaCounts.set(s.area, (areaCounts.get(s.area) ?? 0) + 1);
    const topArea = Array.from(areaCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    out.push({
      system,
      signals: arr.length,
      avgPriority: clamp(arr.reduce((s, x) => s + x.priority, 0) / arr.length),
      avgConfidence: clamp(arr.reduce((s, x) => s + x.confidence, 0) / arr.length),
      topArea,
    });
  }
  return out.sort((a, b) => b.signals - a.signals);
}
