// Phase 61 — Escalation Engine
//
// Converts open high/critical neural signals into founder-visible
// escalations. Recommendation-only. DB partial unique index dedupes open
// escalations by title; `onConflictDoNothing` makes inserts idempotent.

import { storage } from "../storage";
import type { ExecutiveEscalation, InsertExecutiveEscalation, NeuralSignal } from "@shared/schema";

function recommendationFor(sig: NeuralSignal): string {
  switch (sig.signalType) {
    case "revenue.drop":         return "Review the latest Revenue Command Center report and consider a pricing experiment.";
    case "qa.failure":           return "Inspect QA Sentinel logs; do not deploy until the failing check is restored.";
    case "orchestration.failed": return "Open the Orchestrator Center, inspect the failed workflow's trace, and decide whether to rerun.";
    case "growth.opportunity":   return "Review Growth Engine recommendations and approve the highest-impact one.";
    case "experiment.outlier":   return "Open the Experiment Lab and validate the assignment + conversion data.";
    default:                     return "Open the Command Grid for full context, then decide a next step manually.";
  }
}

export async function evaluateEscalations(): Promise<{ created: number; skipped: number }> {
  const openSignals = await storage.listNeuralSignals({ status: "open", limit: 100 });
  const candidates = openSignals.filter(s => s.severity === "high" || s.severity === "critical");
  let created = 0, skipped = 0;

  for (const sig of candidates) {
    // Title is the dedup key. Same source + signal_type collapses into one
    // open escalation even if many signal rows trigger it.
    const title = `${sig.source}: ${sig.signalType} (${sig.severity})`.slice(0, 200);
    const row: InsertExecutiveEscalation = {
      severity: sig.severity,
      title,
      description: (sig.summary || "").slice(0, 1200),
      recommendation: recommendationFor(sig),
      sourceSignalId: sig.id,
      status: "open",
      requiresFounderAction: true,
    };
    const inserted = await storage.createExecutiveEscalation(row);
    if (inserted) created += 1; else skipped += 1;
  }
  return { created, skipped };
}

export async function listEscalations(status?: string, limit = 50): Promise<ExecutiveEscalation[]> {
  return storage.listExecutiveEscalations(status, limit);
}

export async function resolveEscalation(id: number, by: string): Promise<ExecutiveEscalation> {
  return storage.resolveExecutiveEscalation(id, by);
}
