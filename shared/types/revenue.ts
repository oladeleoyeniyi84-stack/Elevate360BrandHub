// Phase 72.3 — Revenue Intelligence response types.
// Shared between server (storage/routes) and the founder dashboard UI.
// All monetary values are integer cents.

export interface RevenueKpis {
  totalRevenueCents: number;
  revenueTodayCents: number;
  revenueLast7dCents: number;
  revenueLast30dCents: number;
  revenueThisMonthCents: number;
  /** null when there are no paid orders yet. */
  averageOrderValueCents: number | null;
  paidOrderCount: number;
  refundTotalCents: number;
  netRevenueCents: number;
  /** null when the denominator is 0. */
  revenuePerVisitorCents: number | null;
  revenuePerSessionCents: number | null;
  revenuePerLeadCents: number | null;
  /** 0–100, capped; null when the denominator is 0. */
  visitorToRevenuePct: number | null;
  leadToRevenuePct: number | null;
  bookingToRevenuePct: number | null;
  aiAssistedRevenueCents: number;
  aiAssistedConversionCount: number;
  pendingPipelineCents: number;
  wonOpportunityCents: number;
  lostOpportunityCents: number;
}

export interface RevenueBreakdownItem {
  name: string;
  totalCents: number;
  count: number;
}

export interface RevenueTrendBucket {
  bucket: string; // ISO date (day / week start / month start)
  grossCents: number;
  refundCents: number;
  netCents: number;
  payments: number;
}

export type RevenueFunnelStageKey = "visitors" | "leads" | "bookings" | "paid";

export interface RevenueFunnelStage {
  key: RevenueFunnelStageKey;
  label: string;
  count: number;
  /** Conversion from the previous stage, capped 0–100; null for the first stage or a 0 denominator. */
  conversionPct: number | null;
  /** 100 − conversionPct, capped 0–100. */
  dropOffPct: number | null;
}

export interface RevenueDiagnostics {
  /** Stripe sessions with more than one payment_completed row (should always be 0 — dedupe guard). */
  duplicatePaymentGroups: number;
  /** Paid orders with no matching payment_completed revenue event. */
  unmatchedPaidOrders: number;
  /** Funnel sessions that reached a later stage without a strategy_page_view entry event. */
  outOfOrderFunnelSessions: number;
  /** Earning events with no UTM source and no referrer. */
  missingAttributionCount: number;
  failedPaymentCount: number;
  refundCount: number;
  refundTotalCents: number;
}

export interface RevenueIntelSummary {
  kpis: RevenueKpis;
  /** Revenue by closed revenue_source vocabulary. */
  bySource: RevenueBreakdownItem[];
  /** Attribution: UTM-based. */
  byUtmSource: RevenueBreakdownItem[];
  byCampaign: RevenueBreakdownItem[];
  byPage: RevenueBreakdownItem[];
  byOffer: RevenueBreakdownItem[];
  byProduct: RevenueBreakdownItem[];
  byPlan: RevenueBreakdownItem[];
  byDevice: RevenueBreakdownItem[];
  byBrowser: RevenueBreakdownItem[];
  daily: RevenueTrendBucket[]; // last 30 days
  weekly: RevenueTrendBucket[]; // last 12 weeks
  monthly: RevenueTrendBucket[]; // last 12 months
  /** Economic funnel: visitors → leads → bookings → paid customers. */
  revenueFunnel: RevenueFunnelStage[];
  /** Net revenue at the end of the economic funnel. */
  revenueFunnelNetCents: number;
  diagnostics: RevenueDiagnostics;
  /** Documented attribution limitations for founder context. */
  attributionNote: string;
  generatedAt: string;
}
