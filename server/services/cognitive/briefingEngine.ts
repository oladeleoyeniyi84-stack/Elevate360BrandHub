// Phase 67 — Cognitive OS: executive cognitive briefing.
//
// OpenAI synthesizes a short executive narrative (hard-locked, no fallback) over
// a scrubbed snapshot of the unified signals, decisions, and conflicts. Every
// persisted string is deep-scrubbed. Recommendation-only.

import { storage } from "../../storage";
import { runTask } from "../../ai/modelRouter";
import { scrub, deepScrub, rankSignals, summarizeSystems, cognitiveLoad } from "./priorityEngine";
import { deriveCognitiveDecisions } from "./decisionEngine";
import { detectConflicts } from "./conflictEngine";
import type { CognitiveBriefing } from "@shared/schema";

export type PeriodType = "daily" | "weekly" | "monthly" | "quarterly";
export const PERIODS: PeriodType[] = ["daily", "weekly", "monthly", "quarterly"];

const PERIOD_FRAMING: Record<PeriodType, string> = {
  daily: "Today: the single most important thing to resolve now across all systems.",
  weekly: "This week: where the systems agree, where they conflict, and the 7-day priority.",
  monthly: "This month: the dominant themes across the intelligence layer and what to adjust.",
  quarterly: "This quarter: the strategic posture the unified system is pointing toward.",
};

export async function generateCognitiveBriefing(period: PeriodType): Promise<CognitiveBriefing> {
  const signals = await storage.getAllCognitiveSignals();
  const ranked = rankSignals(signals);
  const systems = summarizeSystems(signals);
  const decisions = deriveCognitiveDecisions(signals);
  const conflicts = detectConflicts(signals);
  const load = cognitiveLoad(signals);

  const payload = {
    period,
    cognitiveLoad: load,
    systems: systems.map((s) => ({ system: s.system, signals: s.signals, avgPriority: s.avgPriority, topArea: s.topArea })),
    topSignals: ranked.slice(0, 8).map((s) => ({ system: s.system, area: s.area, title: s.title, score: s.score })),
    decisions: decisions.slice(0, 6).map((d) => ({ kind: d.kind, area: d.area, title: d.title, priority: d.priority })),
    conflicts: conflicts.slice(0, 5).map((c) => ({ area: c.area, title: c.title, severity: c.severity })),
  };

  let summary = "";
  let providerMeta: any = { provider: "none", model: "none" };
  try {
    const r = await runTask("executive_copy", {
      messages: [
        {
          role: "system",
          content:
            "You are the Cognitive Chief of Staff to the founder of Elevate360Official. You sit above the Founder Intelligence, Revenue Intelligence, and Growth Automation systems and synthesize them into one mind. " +
            PERIOD_FRAMING[period] +
            " Structure: (1) Unified state in 2 sentences. (2) Where the systems agree (highest-leverage focus). (3) The most important conflict to reconcile. (4) The single most important action right now. " +
            "Be specific to the data. Recommendation-only — never instruct to change pricing, charge customers, send email, deploy, or take destructive/irreversible action. Plain prose, no markdown headers, no JSON. Max 220 words.",
        },
        { role: "user", content: scrub(JSON.stringify(payload), 5000) },
      ],
      temperature: 0.4, maxTokens: 600,
    }, { providerOverride: "openai" });
    summary = scrub(r.content, 2400).trim();
    providerMeta = { provider: r.provider, model: r.model, latencyMs: r.latencyMs };
  } catch (e: any) {
    console.warn("[cognitive-os] briefing synthesis failed:", scrub(e?.message, 160));
    summary = "Cognitive synthesis is temporarily unavailable. The structured cognitive layer below reflects your current unified state.";
  }

  const title = `${period.charAt(0).toUpperCase() + period.slice(1)} Cognitive Briefing — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const sections = deepScrub({
    cognitiveLoad: load,
    systems: payload.systems,
    topSignals: payload.topSignals,
    decisions: payload.decisions,
    conflicts: payload.conflicts,
  });

  return storage.createCognitiveBriefing({
    periodType: period,
    title: scrub(title, 240),
    summary: scrub(summary, 2400),
    sections: sections as any,
    providerMetadata: providerMeta,
    source: providerMeta.provider ?? "openai",
  });
}
