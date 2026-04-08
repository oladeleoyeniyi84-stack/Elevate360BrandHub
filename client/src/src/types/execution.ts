export type ExecutionPolicy = {
  id: number;
  policyKey: string;
  area: string;
  mode: "suggest_only" | "approval_required" | "auto_apply_safe";
  minConfidence: number;
  maxRiskScore: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExecutionQueueItem = {
  id: number;
  queueKey: string;
  area: string;
  actionType: string;
  payloadJson: Record<string, any> | null;
  priorityScore: number;
  status: "pending" | "approved" | "executing" | "completed" | "failed" | "cancelled";
  requiresApproval: boolean;
  createdAt: string;
  executedAt: string | null;
};

export type AppliedChange = {
  id: number;
  changeKey: string;
  area: string;
  targetType: string | null;
  targetId: string | null;
  changeType: string;
  beforeJson: Record<string, any> | null;
  afterJson: Record<string, any> | null;
  reason: string | null;
  evidenceJson: Record<string, any> | null;
  confidence: number;
  riskScore: number;
  status: "proposed" | "approved" | "applied" | "rolled_back" | "rejected";
  appliedBy: string;
  createdAt: string;
  appliedAt: string | null;
  rolledBackAt: string | null;
};

export type RollbackEvent = {
  id: number;
  appliedChangeId: number;
  reason: string | null;
  metricsBeforeJson: Record<string, any> | null;
  metricsAfterJson: Record<string, any> | null;
  status: string;
  createdAt: string;
};
