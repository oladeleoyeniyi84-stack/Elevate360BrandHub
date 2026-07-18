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

export interface FunnelAnalyticsSummary {
  stages: FunnelStage[];
  conversions: FunnelConversion[];
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
