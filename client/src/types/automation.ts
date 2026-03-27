export type AutomationJob = {
  id?: number;
  jobKey: string;
  jobGroup: string;
  status: "idle" | "running" | "succeeded" | "failed" | "paused";
  isEnabled?: boolean;
  cadenceMinutes?: number | null;
  lastStartedAt?: string | null;
  lastFinishedAt?: string | null;
  lastSucceededAt?: string | null;
  lastFailedAt?: string | null;
  lastError?: string | null;
  nextRunAt?: string | null;
  runCount?: number;
  successCount?: number;
  failureCount?: number;
};

export type RevenueRecoveryStatus = {
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  openActions: number;
  queuedActions: number;
  wonRecoveries30d: number;
  staleFulfillmentCount: number;
};

export type RevenueRecoveryAction = {
  id: number;
  sessionId?: string | null;
  orderId?: number | null;
  recoveryType: "accepted_not_paid" | "abandoned_checkout" | "stale_fulfillment";
  priorityScore: number;
  status: "open" | "queued" | "sent" | "suppressed" | "won" | "ignored";
  recommendedAction?: string | null;
  draftSubject?: string | null;
  draftBody?: string | null;
  targetEmail?: string | null;
  targetPhone?: string | null;
  reason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  actedAt?: string | null;
};

export type ContentOpportunity = {
  id: number;
  topic: string;
  contentType: "blog" | "faq" | "landing_page" | "knowledge_doc" | "video";
  sourceIntent?: string | null;
  opportunityScore: number;
  evidenceJson?: unknown;
  recommendation?: string | null;
  status: "new" | "approved" | "in_progress" | "published" | "ignored";
  createdAt: string;
  updatedAt?: string | null;
};

export type AutonomousAlert = {
  id: number;
  alertKey?: string;
  area: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  summary: string;
  suggestedFix?: string | null;
  autoFixEligible: boolean;
  status: "open" | "acknowledged" | "fixed" | "ignored";
  meta?: unknown;
  createdAt: string;
  resolvedAt?: string | null;
};

export type DigestReportLite = {
  id: number;
  title?: string | null;
  content?: string | null;
  reportType: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
  meta?: unknown;
};
