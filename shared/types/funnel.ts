// Phase 72.2 — Strategy Session funnel analytics response types.
// Shared between server (storage/routes) and the founder dashboard UI.

export type FunnelStageKey =
  | "visitors"
  | "strategy"
  | "pricing"
  | "plan"
  | "checkout"
  | "payment"
  | "booked";

export interface FunnelStage {
  key: FunnelStageKey;
  label: string;
  count: number;
}

export interface FunnelConversion {
  from: FunnelStageKey;
  to: FunnelStageKey;
  fromCount: number;
  toCount: number;
  /** 0–100, rounded to 1 decimal; null when the denominator is 0. */
  conversionPct: number | null;
  /** 0–100, rounded to 1 decimal; null when the denominator is 0. */
  dropOffPct: number | null;
}

export interface FunnelTopItem {
  name: string;
  count: number;
}

export interface FunnelPeriodBucket {
  bucket: string; // ISO date (day / week start / month start)
  strategy: number;
  pricing: number;
  plan: number;
  checkout: number;
  payment: number;
  booked: number;
}

// Phase 72.3 corrective work — funnel integrity diagnostics.
export interface FunnelDiagnostics {
  /** Sessions that reached a later stage without any strategy_page_view entry event. */
  outOfOrderSessions: number;
  /** Extra repeats of the same event within the same session (sum of count−1 per session+event group). */
  duplicateEvents: number;
}

export interface FunnelAnalyticsSummary {
  /** RAW distinct-session counts per stage event (diagnostic view — later stages CAN exceed earlier ones). */
  stages: FunnelStage[];
  /** Conversions computed from raw stage counts (diagnostic view — may exceed 100%). */
  conversions: FunnelConversion[];
  /**
   * Normalized unique-journey funnel (Phase 72.3): each visitor/session is
   * assigned its furthest valid stage and counted cumulatively through every
   * preceding stage, so counts are monotonically non-increasing.
   */
  normalizedStages: FunnelStage[];
  /** Conversions from normalized counts; percentages capped to 0–100. */
  normalizedConversions: FunnelConversion[];
  diagnostics: FunnelDiagnostics;
  overall: {
    visitors: number;
    booked: number;
    conversionPct: number | null;
  };
  /** Average minutes from first strategy_page_view to booking_completed per completed session. */
  avgCompletionMinutes: number | null;
  topSources: FunnelTopItem[];
  topCampaigns: FunnelTopItem[];
  topPlans: FunnelTopItem[];
  daily: FunnelPeriodBucket[]; // last 30 days
  weekly: FunnelPeriodBucket[]; // last 12 weeks
  monthly: FunnelPeriodBucket[]; // last 12 months
  generatedAt: string;
}
