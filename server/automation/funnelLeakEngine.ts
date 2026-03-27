import { storage } from "../storage";
import { computeLeakSeverityScore } from "../services/growthScoring";

export async function runFunnelLeakEngine() {
  const funnel = await storage.getFunnelLeakCandidates(14);

  const stages = [
    { from: "visits", to: "chats", fromCount: funnel.visits, toCount: funnel.chats },
    { from: "chats", to: "qualified", fromCount: funnel.chats, toCount: funnel.qualified },
    { from: "qualified", to: "booked", fromCount: funnel.qualified, toCount: funnel.booked },
    { from: "booked", to: "won", fromCount: funnel.booked, toCount: funnel.won },
  ];

  const sorted = stages
    .map((s) => ({
      leakStage: `${s.from}->${s.to}`,
      severityScore: computeLeakSeverityScore({ fromCount: s.fromCount, toCount: s.toCount }),
      dropoffCount: Math.max(0, s.fromCount - s.toCount),
      dropoffRate: s.fromCount > 0 ? Math.round(((s.fromCount - s.toCount) / s.fromCount) * 100) : 0,
    }))
    .sort((a, b) => b.severityScore - a.severityScore);

  const top = sorted[0];

  await storage.createFunnelLeakReport({
    periodStart: funnel.periodStart,
    periodEnd: funnel.periodEnd,
    leakStage: top.leakStage,
    severityScore: top.severityScore,
    dropoffCount: top.dropoffCount,
    dropoffRate: top.dropoffRate,
    suspectedCausesJson: {
      allStages: sorted,
      likely: ["CTA mismatch", "offer friction", "follow-up lag", "content gap"],
    },
    recommendedFix: `Review ${top.leakStage} and test improved CTA/offer sequencing.`,
  });

  return {
    summary: `created funnel leak report for ${top.leakStage}`,
    meta: top,
  };
}
