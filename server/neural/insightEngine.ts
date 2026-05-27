// Phase 61 — Insight Engine
//
// Reads the current cognitive snapshot + open signals, asks DeepSeek for a
// diagnostic interpretation and OpenAI for an executive-grade insight. Both
// are hard-locked via providerOverride (no silent fallback).

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { latestCognitiveState } from "./cognitiveState";
import type { InsertInsightStreamEntry, InsightStreamEntry } from "@shared/schema";

const SCRUB: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];
function scrub(s: any, maxLen = 3000): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

export async function generateInsightStream(): Promise<InsightStreamEntry[]> {
  const out: InsightStreamEntry[] = [];
  const snap = await latestCognitiveState();
  const signals = await storage.listNeuralSignals({ status: "open", limit: 20 });

  const payload = {
    healthScore: snap?.healthScore ?? null, globalStatus: snap?.globalStatus ?? "unknown",
    categories: (snap?.rawState as any)?.categories ?? [],
    signals: signals.slice(0, 10).map(s => ({
      source: s.source, type: s.signalType, severity: s.severity, conf: s.confidence,
    })),
  };

  // DeepSeek — diagnostic interpretation
  try {
    const r = await runTask("diagnostics", {
      messages: [
        { role: "system", content: "You are a Senior Reliability Analyst. In 3-5 short bullets diagnose the current state of the system, the strongest signal, and one safe next step. Plain English, no JSON, no markdown headers." },
        { role: "user", content: scrub(JSON.stringify(payload)) },
      ],
      temperature: 0.3, maxTokens: 380,
    }, { providerOverride: "deepseek" });
    out.push(await storage.createInsightStreamEntry({
      insightType: "diagnostic",
      title: `Diagnostic ${new Date().toISOString().slice(0, 16)}`,
      body: scrub(r.content, 1400),
      source: "deepseek",
      confidence: snap?.healthScore ?? 50,
      providerMetadata: { provider: r.provider, model: r.model, latencyMs: r.latencyMs } as any,
      status: "new",
    } as InsertInsightStreamEntry));
  } catch (e: any) {
    console.warn("[insightEngine] diagnostic failed:", scrub(e?.message, 200));
  }

  // OpenAI — executive-grade synthesis
  try {
    const r = await runTask("executive_copy", {
      messages: [
        { role: "system", content: "You are the CEO Chief of Staff. In 4-6 tight bullets: the state of the business right now, the single strongest opportunity, the single biggest risk, and one safe next action. No JSON, no markdown headers." },
        { role: "user", content: scrub(JSON.stringify(payload)) },
      ],
      temperature: 0.35, maxTokens: 480,
    }, { providerOverride: "openai" });
    out.push(await storage.createInsightStreamEntry({
      insightType: "executive",
      title: `Executive briefing ${new Date().toISOString().slice(0, 16)}`,
      body: scrub(r.content, 1600),
      source: "openai",
      confidence: snap?.healthScore ?? 50,
      providerMetadata: { provider: r.provider, model: r.model, latencyMs: r.latencyMs } as any,
      status: "new",
    } as InsertInsightStreamEntry));
  } catch (e: any) {
    console.warn("[insightEngine] executive failed:", scrub(e?.message, 200));
  }

  return out;
}

export async function listInsights(limit = 30): Promise<InsightStreamEntry[]> {
  return storage.listInsightStreamEntries(limit);
}
