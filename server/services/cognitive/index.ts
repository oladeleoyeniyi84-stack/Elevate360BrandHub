// Phase 67 — Cognitive Operating System: composer + scan orchestrator.
//
// buildCognitiveOverview composes the /cognitive-os dashboard payload (read-only).
// runCognitiveScan regenerates decisions + conflicts + the daily briefing and is
// invoked by the phase67_cognitive_os job and the manual POST /run route.
// Recommendation-only — never mutates money / pricing / email / infra / secrets.

import { storage } from "../../storage";
import { rankSignals, summarizeSystems, cognitiveLoad } from "./priorityEngine";
import { generateCognitiveDecisions } from "./decisionEngine";
import { generateCognitiveConflicts } from "./conflictEngine";
import { generateCognitiveBriefing } from "./briefingEngine";
import type { CognitiveOverview, CognitiveScanResult } from "@shared/types/cognitive";

export { PERIODS } from "./briefingEngine";
export type { PeriodType } from "./briefingEngine";

export async function buildCognitiveOverview(): Promise<CognitiveOverview> {
  const [signals, decisions, conflicts, briefings] = await Promise.all([
    storage.getAllCognitiveSignals(),
    storage.getCognitiveDecisions({ status: "open", limit: 100 }),
    storage.getCognitiveConflicts({ status: "open", limit: 50 }),
    storage.getCognitiveBriefings(undefined, 8),
  ]);

  const ranked = rankSignals(signals);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      signals: signals.length,
      decisions: decisions.length,
      conflicts: conflicts.length,
      cognitiveLoad: cognitiveLoad(signals),
    },
    systems: summarizeSystems(signals),
    topSignals: ranked.slice(0, 10),
    decisions: {
      opportunities: decisions.filter((d) => d.kind === "opportunity").slice(0, 6),
      risks: decisions.filter((d) => d.kind === "risk").slice(0, 6),
      actions: decisions.filter((d) => d.kind === "action").slice(0, 6),
    },
    conflicts,
    latestBriefings: briefings.map((b) => ({ id: b.id, periodType: b.periodType, title: b.title, createdAt: b.createdAt })),
  };
}

export async function runCognitiveScan(): Promise<CognitiveScanResult> {
  const decisions = await generateCognitiveDecisions();
  const conflicts = await generateCognitiveConflicts();
  let briefingId: number | null = null;
  try {
    const briefing = await generateCognitiveBriefing("daily");
    briefingId = briefing.id;
  } catch (e: any) {
    console.warn("[cognitive-os] daily briefing during scan failed:", e?.message);
  }
  const signals = await storage.getAllCognitiveSignals();
  return {
    signals: signals.length,
    decisions: decisions.length,
    conflicts: conflicts.length,
    briefingId,
  };
}
