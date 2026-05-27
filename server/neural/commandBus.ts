// Phase 61 — Command Bus
//
// Single ingress for all neural signals. Severity is normalised, summary is
// scrubbed, and high/critical open signals are deduped at the DB level via
// `neural_signals_open_dedup_idx` (partial unique on source+signal_type).

import { storage } from "../storage";
import type { InsertNeuralSignal, NeuralSignal, InsertCommandBusEvent, CommandBusEvent } from "@shared/schema";

const SCRUB: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];
function scrub(s: any, maxLen = 600): string {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out.slice(0, maxLen);
}

const SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export type Severity = typeof SEVERITIES[number];
export function normalizeSeverity(s: any): Severity {
  const v = String(s ?? "info").toLowerCase();
  return (SEVERITIES as readonly string[]).includes(v) ? (v as Severity) : "info";
}
const PRIORITY: Record<Severity, number> = { info: 10, low: 25, medium: 50, high: 80, critical: 95 };
export function prioritizeSignal(severity: Severity, confidence: number): number {
  const base = PRIORITY[severity];
  return Math.max(0, Math.min(100, Math.round(base * 0.7 + confidence * 0.3)));
}

export type IngestInput = {
  signalType: string; source: string;
  severity?: any; confidence?: number;
  summary?: string; metadata?: Record<string, any>;
};

/**
 * Single ingress: normalises severity, scrubs free text, dedupes open
 * high/critical signals (DB partial unique index). Returns null if the
 * signal collided with an existing open high/critical entry.
 */
export async function ingestSignal(input: IngestInput): Promise<NeuralSignal | null> {
  const severity = normalizeSeverity(input.severity);
  const confidence = Math.max(0, Math.min(100, Math.round(input.confidence ?? 50)));
  const row: InsertNeuralSignal = {
    signalType: scrub(input.signalType, 60),
    source: scrub(input.source, 60),
    severity, confidence,
    summary: scrub(input.summary ?? "", 600),
    metadata: (input.metadata ?? {}) as any,
    status: "open",
  };
  const created = await storage.createNeuralSignal(row);
  if (created) {
    await createCommandBusEvent({
      eventType: "signal.ingested", source: row.source,
      priority: prioritizeSignal(severity, confidence),
      payload: { signalId: created.id, severity, signalType: row.signalType } as any,
    } as InsertCommandBusEvent);
  }
  return created;
}

export async function listSignals(opts: { severity?: string; status?: string; limit?: number } = {}): Promise<NeuralSignal[]> {
  return storage.listNeuralSignals(opts);
}

export async function createCommandBusEvent(input: InsertCommandBusEvent): Promise<CommandBusEvent> {
  return storage.createCommandBusEvent(input);
}
