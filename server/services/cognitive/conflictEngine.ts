// Phase 67 — Cognitive OS: conflict engine.
//
// Detects contradictions between signals from different subsystems — e.g. one
// engine pushing expansion in an area while another flags a risk in the same
// area. Pure deterministic heuristics; persisted atomically. Recommendation-only.

import { storage } from "../../storage";
import { scrub, clamp } from "./priorityEngine";
import type { CognitiveSignal } from "@shared/types/cognitive";
import type { InsertCognitiveConflict, CognitiveConflict } from "@shared/schema";

const SYSTEM_LABEL: Record<string, string> = {
  founder: "Founder Intelligence",
  revenue: "Revenue Intelligence",
  growth: "Growth Automation",
};

const NEGATIVE = /\b(down|declin|drop|cold|risk|leak|stall|soften|churn|loss|losing|fail|overdue|unreplied)\b/i;
const EXPANSION = /\b(double|scale|expand|increase|launch|invest|spend|grow|push|ramp|campaign)\b/i;

// Pure rule layer — find contradicting signal pairs in the same area.
export function detectConflicts(signals: CognitiveSignal[]): InsertCognitiveConflict[] {
  const byArea = new Map<string, CognitiveSignal[]>();
  for (const s of signals) {
    const arr = byArea.get(s.area) ?? [];
    arr.push(s);
    byArea.set(s.area, arr);
  }

  const conflicts: InsertCognitiveConflict[] = [];

  for (const [area, arr] of byArea.entries()) {
    if (arr.length < 2) continue;

    const opportunities = arr.filter(
      (s) => s.kind === "opportunity" || EXPANSION.test(`${s.title} ${s.detail}`),
    );
    const risks = arr.filter(
      (s) => s.kind === "risk" || NEGATIVE.test(`${s.title} ${s.detail}`),
    );

    for (const opp of opportunities) {
      const risk = risks.find((r) => r.system !== opp.system);
      if (!risk) continue;
      const severity = clamp((opp.priority + risk.priority) / 2 + 6);
      conflicts.push({
        area,
        title: scrub(`Tension in ${area}: expansion vs. risk`, 180),
        detail: scrub(
          `${SYSTEM_LABEL[opp.system] ?? opp.system} is recommending an expansion move in ${area} while ${SYSTEM_LABEL[risk.system] ?? risk.system} is flagging a risk in the same area. Reconcile these before acting — pursuing both blindly can waste spend or compound the downside.`,
          1400,
        ),
        severity,
        leftSignal: scrub(`[${SYSTEM_LABEL[opp.system] ?? opp.system}] ${opp.title}`, 280),
        rightSignal: scrub(`[${SYSTEM_LABEL[risk.system] ?? risk.system}] ${risk.title}`, 280),
        source: "rules",
      });
      break; // one conflict per area is enough signal
    }
  }

  return conflicts
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
    .slice(0, 12);
}

export async function generateCognitiveConflicts(): Promise<CognitiveConflict[]> {
  const signals = await storage.getAllCognitiveSignals();
  const items = detectConflicts(signals);
  return storage.replaceCognitiveConflicts(items);
}
