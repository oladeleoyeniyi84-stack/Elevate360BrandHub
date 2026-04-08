export type SourcePerformanceSnapshot = {
  id: number;
  sourceName: string;
  visits: number;
  chatLeads: number;
  qualifiedLeads: number;
  bookings: number;
  paidOrders: number;
  revenue: number;
  avgOrderValue: number;
  recoveryWinRate: number;
  qualityScore: number;
  snapshotDate: string;
};

export type FunnelLeakReport = {
  id: number;
  leakStage: string;
  severityScore: number;
  dropoffCount: number;
  dropoffRate: number;
  suspectedCausesJson?: unknown;
  recommendedFix?: string | null;
  createdAt: string;
};

export type OfferPerformanceSnapshot = {
  id: number;
  offerSlug: string;
  intent?: string | null;
  sourceName?: string | null;
  recommendedCount: number;
  acceptedCount: number;
  paidCount: number;
  acceptanceRate: number;
  closeRate: number;
  avgOrderValue: number;
  performanceScore: number;
  snapshotDate: string;
};

export type GrowthExperiment = {
  id: number;
  experimentKey: string;
  title: string;
  area: "source" | "funnel" | "offer" | "cta" | "content";
  hypothesis: string;
  proposedChange: string;
  evidenceJson?: unknown;
  expectedImpactScore: number;
  status: "proposed" | "approved" | "running" | "won" | "lost" | "archived";
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};
