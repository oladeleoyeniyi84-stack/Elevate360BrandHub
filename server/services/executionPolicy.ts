import { storage } from "../storage";

export type ExecutionDecision = {
  mode: "suggest_only" | "approval_required" | "auto_apply_safe";
  requiresApproval: boolean;
  canAutoApply: boolean;
  reason: string;
};

const DEFAULT_POLICIES: Record<string, { mode: string; minConfidence: number; maxRiskScore: number }> = {
  offer:      { mode: "suggest_only",       minConfidence: 75, maxRiskScore: 20 },
  cta:        { mode: "approval_required",  minConfidence: 70, maxRiskScore: 25 },
  links:      { mode: "auto_apply_safe",    minConfidence: 80, maxRiskScore: 15 },
  experiment: { mode: "approval_required",  minConfidence: 80, maxRiskScore: 20 },
  override:   { mode: "suggest_only",       minConfidence: 85, maxRiskScore: 10 },
};

export async function resolveExecutionDecision(
  area: string,
  confidence: number,
  riskScore: number
): Promise<ExecutionDecision> {
  const policies = await storage.getExecutionPolicies();
  const policy = policies.find((p) => p.area === area && p.isEnabled);

  const defaults = DEFAULT_POLICIES[area] ?? { mode: "suggest_only", minConfidence: 80, maxRiskScore: 20 };
  const mode = (policy?.mode ?? defaults.mode) as ExecutionDecision["mode"];
  const minConfidence = policy?.minConfidence ?? defaults.minConfidence;
  const maxRiskScore = policy?.maxRiskScore ?? defaults.maxRiskScore;

  const meetsConfidence = confidence >= minConfidence;
  const meetsRisk = riskScore <= maxRiskScore;
  const safeToApply = meetsConfidence && meetsRisk;

  if (!safeToApply) {
    return {
      mode: "suggest_only",
      requiresApproval: true,
      canAutoApply: false,
      reason: `Confidence ${confidence}% < ${minConfidence}% minimum or risk ${riskScore} > ${maxRiskScore} maximum`,
    };
  }

  if (mode === "auto_apply_safe") {
    return { mode, requiresApproval: false, canAutoApply: true, reason: "Policy allows safe auto-apply and thresholds met" };
  }

  if (mode === "approval_required") {
    return { mode, requiresApproval: true, canAutoApply: false, reason: "Policy requires admin approval before execution" };
  }

  return { mode: "suggest_only", requiresApproval: true, canAutoApply: false, reason: "Policy is suggest-only mode" };
}
