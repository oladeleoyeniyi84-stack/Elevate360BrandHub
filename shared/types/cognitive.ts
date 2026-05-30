// Phase 67 — Cognitive Operating System: shared types.
//
// Used by both the server (services + storage) and the client dashboard so the
// unified cognitive layer has one canonical contract.

import type {
  CognitiveDecision,
  CognitiveBriefing,
  CognitiveConflict,
} from "../schema";

export type { CognitiveDecision, CognitiveBriefing, CognitiveConflict };

// A normalized signal emitted by any upstream intelligence engine.
export type CognitiveSignal = {
  system: "founder" | "revenue" | "growth";
  kind: string;
  area: string;
  title: string;
  detail: string;
  priority: number;
  confidence: number;
};

// A signal with its computed cognitive priority score.
export type RankedSignal = CognitiveSignal & { score: number };

// Per-system contribution to the cognitive layer.
export type SystemSummary = {
  system: string;
  signals: number;
  avgPriority: number;
  avgConfidence: number;
  topArea: string | null;
};

// Composed payload for the /cognitive-os dashboard.
export type CognitiveOverview = {
  generatedAt: string;
  totals: {
    signals: number;
    decisions: number;
    conflicts: number;
    cognitiveLoad: number; // 0-100 weighted pressure across open signals
  };
  systems: SystemSummary[];
  topSignals: RankedSignal[];
  decisions: {
    opportunities: CognitiveDecision[];
    risks: CognitiveDecision[];
    actions: CognitiveDecision[];
  };
  conflicts: CognitiveConflict[];
  latestBriefings: Array<{ id: number; periodType: string; title: string; createdAt: string | Date }>;
};

// Result of a full cognitive scan (job + manual run).
export type CognitiveScanResult = {
  signals: number;
  decisions: number;
  conflicts: number;
  briefingId: number | null;
};
