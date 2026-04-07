import { storage } from "../storage";

export type ExplainabilityRecord = {
  entityType: string;
  entityId: string;
  actionType: string;
  reason: string;
  evidenceJson?: Record<string, any>;
  confidence: number;
  policyKey?: string;
};

export async function recordExplanation(record: ExplainabilityRecord) {
  return storage.createAiExplanation({
    entityType: record.entityType,
    entityId: record.entityId,
    actionType: record.actionType,
    reason: record.reason,
    evidenceJson: record.evidenceJson ?? null,
    confidence: record.confidence,
    policyKey: record.policyKey ?? null,
  });
}

export async function getExplanationSummary(entityType: string, entityId: string) {
  const explanations = await storage.getAiExplanations(entityType, entityId, 10);
  if (explanations.length === 0) {
    return { entityType, entityId, summary: "No explanation records found", explanations: [] };
  }
  const latest = explanations[0];
  return {
    entityType,
    entityId,
    summary: latest.reason ?? "No reason recorded",
    confidence: latest.confidence,
    policyKey: latest.policyKey,
    evidenceHighlights: latest.evidenceJson
      ? Object.entries(latest.evidenceJson as Record<string, any>).slice(0, 5).map(([k, v]) => `${k}: ${String(v)}`).join("; ")
      : "No evidence recorded",
    explanations,
  };
}

export function buildChangeExplanation(change: {
  changeType: string;
  area: string;
  confidence: number;
  riskScore: number;
  reason?: string | null;
  evidenceJson?: Record<string, any> | null;
}): string {
  const parts = [
    `AI applied a ${change.changeType} change in the ${change.area} area.`,
    change.reason ? `Reason: ${change.reason}.` : "",
    `Confidence: ${change.confidence}%. Risk score: ${change.riskScore}.`,
    change.evidenceJson
      ? `Evidence: ${Object.entries(change.evidenceJson).slice(0, 3).map(([k, v]) => `${k}=${String(v)}`).join(", ")}.`
      : "",
  ];
  return parts.filter(Boolean).join(" ");
}
