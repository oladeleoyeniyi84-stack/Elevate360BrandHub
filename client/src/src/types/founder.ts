export type UserRole = {
  id: number;
  email: string;
  role: "founder" | "admin" | "operator" | "analyst" | "reviewer";
  isActive: boolean;
  createdAt: string;
};

export type ApprovalRequest = {
  id: number;
  requestKey: string;
  area: string;
  actionType: string;
  payloadJson: Record<string, any> | null;
  requestedBy: string;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
  resolvedAt: string | null;
};

export type AiExplanation = {
  id: number;
  entityType: string;
  entityId: string;
  actionType: string;
  reason: string | null;
  evidenceJson: Record<string, any> | null;
  confidence: number;
  policyKey: string | null;
  createdAt: string;
};

export type SystemHealthSnapshot = {
  id: number;
  snapshotTime: string;
  jobHealthScore: number;
  revenueTruthScore: number;
  auditHealthScore: number;
  executionSafetyScore: number;
  growthHealthScore: number;
  overallMaturityScore: number;
  metaJson: Record<string, any> | null;
};

export type QuarterlyStrategyReport = {
  id: number;
  periodStart: string;
  periodEnd: string;
  summary: string | null;
  recommendationsJson: string[] | null;
  createdAt: string;
};

export type MaturityScores = {
  jobHealthScore: number;
  revenueTruthScore: number;
  auditHealthScore: number;
  executionSafetyScore: number;
  growthHealthScore: number;
  overallMaturityScore: number;
  details: Record<string, string>;
};

export type FounderOverview = {
  changedToday: number;
  rolledBackToday: number;
  pendingApprovals: number;
  maturityScore: number;
  topGrowthWin: any | null;
  topSource: any | null;
  topOffer: any | null;
};
