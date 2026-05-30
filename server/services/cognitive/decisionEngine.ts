// Phase 67 — Cognitive OS: unified decision engine.
//
// Distills the open cross-system signals into a small set of unified cognitive
// decisions. Deterministic rules first (signals that multiple systems agree on
// rank highest and gain confidence), then an optional DeepSeek diagnostic
// enrichment of the single top risk (hard-locked, no fallback). Persisted
// atomically. Recommendation-only — mutates nothing operational.

import { storage } from "../../storage";
import { runTask } from "../../ai/modelRouter";
import { rankSignals, scrub, clamp } from "./priorityEngine";
import type { CognitiveSignal } from "@shared/types/cognitive";
import type { InsertCognitiveDecision, CognitiveDecision } from "@shared/schema";

const SYSTEM_LABEL: Record<string, string> = {
  founder: "Founder Intelligence",
  revenue: "Revenue Intelligence",
  growth: "Growth Automation",
};

// Pure rule layer — turn unified signals into cognitive decisions.
export function deriveCognitiveDecisions(signals: CognitiveSignal[]): InsertCognitiveDecision[] {
  if (signals.length === 0) return [];
  const ranked = rankSignals(signals);

  // Group by area to find where multiple subsystems are converging.
  const byArea = new Map<string, typeof ranked>();
  for (const s of ranked) {
    const arr = byArea.get(s.area) ?? [];
    arr.push(s);
    byArea.set(s.area, arr);
  }

  const decisions: InsertCognitiveDecision[] = [];

  for (const [area, arr] of Array.from(byArea.entries())) {
    const systems = new Set(arr.map((s) => s.system));
    const top = arr[0];
    const consensus = systems.size > 1;
    // Decision kind follows the dominant signal kind in the area.
    const riskCount = arr.filter((s) => s.kind === "risk").length;
    const oppCount = arr.filter((s) => s.kind === "opportunity").length;
    const kind = riskCount > oppCount ? "risk" : oppCount > 0 ? "opportunity" : "action";

    const systemList = Array.from(systems).map((s) => SYSTEM_LABEL[s] ?? s).join(", ");
    const confidence = clamp(
      arr.reduce((s, x) => s + x.confidence, 0) / arr.length + (consensus ? 12 : 0),
    );
    const priority = clamp(top.score + (consensus ? 8 : 0));

    const detailLines = arr.slice(0, 4).map(
      (s) => `• [${SYSTEM_LABEL[s.system] ?? s.system}] ${scrub(s.title, 160)}`,
    );

    decisions.push({
      kind,
      area,
      title: consensus
        ? `Cross-system focus on ${area}: ${scrub(top.title, 140)}`
        : scrub(top.title, 180),
      detail: scrub(
        `${consensus
          ? `${systems.size} subsystems (${systemList}) are flagging ${area}. Treat this as a converged priority.`
          : `${systemList} is flagging ${area}.`}\n\nContributing signals:\n${detailLines.join("\n")}`,
        1600,
      ),
      priority,
      confidence,
      sources: arr.slice(0, 6).map((s) => ({ system: s.system, area: s.area, title: scrub(s.title, 160) })) as any,
      source: "rules",
    });
  }

  return decisions
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, 18);
}

// Full generation: pull signals, derive, enrich top risk, persist atomically.
export async function generateCognitiveDecisions(): Promise<CognitiveDecision[]> {
  const signals = await storage.getAllCognitiveSignals();
  const items = deriveCognitiveDecisions(signals);

  // Best-effort DeepSeek diagnostic enrichment of the single top risk (no fallback).
  try {
    const topRisk = items.find((i) => i.kind === "risk");
    if (topRisk) {
      const r = await runTask("diagnostics", {
        messages: [
          { role: "system", content: "You are a Senior Reliability Analyst. In ONE short sentence (max 30 words), give a concrete, safe next step for the founder. No JSON, no preamble." },
          { role: "user", content: scrub(`Decision: ${topRisk.title}. Context: ${topRisk.detail}`, 700) },
        ],
        temperature: 0.3, maxTokens: 80,
      }, { providerOverride: "deepseek" });
      const tip = scrub(r.content, 240).trim();
      if (tip) {
        topRisk.detail = `${topRisk.detail}\n\nDiagnostic: ${tip}`;
        topRisk.source = "deepseek";
      }
    }
  } catch (e: any) {
    console.warn("[cognitive-os] decision enrichment failed:", scrub(e?.message, 160));
  }

  return storage.replaceCognitiveDecisions(items);
}
