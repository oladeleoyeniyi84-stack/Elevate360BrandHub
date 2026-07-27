// Phase 72.4 — Search Intelligence & Authority Platform response types.
// Shared between server (storage/routes) and the founder dashboard UI.
// All monetary values are integer cents; all percentages are capped 0–100.

export interface SearchIntelKpis {
  /** Distinct sessions with a classified search_landing event. */
  attributedSessions: number;
  organicSessions: number;
  aiAssistantSessions: number;
  socialSessions: number;
  emailSessions: number;
  paidSessions: number;
  referralSessions: number;
  directSessions: number;
  /** Organic share of attributed sessions; null when denominator is 0. */
  organicSharePct: number | null;
  aiSharePct: number | null;
  landingsToday: number;
  landingsLast7d: number;
  landingsLast30d: number;
  /** Distinct session+content pairs (server-deduped). */
  contentViews: number;
  contentReads: number;
  contentCompletes: number;
  contentShares: number;
  /** Avg max scroll depth per viewing session+content pair; null when no views. */
  avgReadPercent: number | null;
  contentCompletionRatePct: number | null;
  /** Attributed sessions that also appear in the 72.2 strategy funnel. */
  searchToFunnelSessions: number;
  searchToFunnelRatePct: number | null;
  /** Attributed sessions that also appear in 72.3 revenue events. */
  searchToRevenueSessions: number;
  searchToRevenueRatePct: number | null;
  /** Earned cents (72.3 REVENUE_EARNING_EVENTS) joined to attributed sessions — a lower bound. */
  attributedRevenueCents: number;
}

export interface TrafficSourceBreakdownItem {
  source: string; // closed SEARCH_TRAFFIC_SOURCES vocabulary
  sessions: number;
  sharePct: number | null;
  funnelSessions: number;
  revenueSessions: number;
  attributedRevenueCents: number;
}

export interface SearchTopItem {
  name: string;
  count: number;
}

export interface ContentAuthorityItem {
  slug: string;
  contentType: string | null;
  /** Distinct sessions that viewed this content. */
  views: number;
  reads: number;
  completes: number;
  shares: number;
  avgReadPercent: number | null;
  completionRatePct: number | null;
  /** 0–100 first-party engagement authority (see authorityFormula) — NOT third-party domain authority. */
  authorityIndex: number;
}

export interface SearchTrendBucket {
  bucket: string; // ISO date (day / week start / month start)
  landings: number;
  organic: number;
  aiAssistant: number;
  contentViews: number;
}

export interface ContentFootprint {
  publishedBlogPosts: number;
  /** Distinct content slugs with any tracked engagement. */
  trackedContentPages: number;
  /** Published blog posts with zero tracked views since 72.4 went live. */
  publishedNeverViewed: number;
}

export interface SearchIntelDiagnostics {
  /** Sessions with more than one search_landing (dedupe guard — should be 0). */
  duplicateLandingGroups: number;
  /** Landings from storage-blocked browsers (no joinable session id). */
  landingsWithoutSession: number;
  /** Sessions with content engagement but no landing event (tracker raced or pre-72.4 session). */
  contentSessionsWithoutLanding: number;
  /** Distinct unclassified referral hosts (candidates for the classifier map). */
  referralHostCount: number;
  /** % of 72.2 funnel sessions that have a search landing (integration coverage). */
  funnelJoinCoveragePct: number | null;
  /** % of 72.3 revenue events carrying a joinable session id (attribution coverage). */
  revenueEventsWithSessionPct: number | null;
}

export interface SearchIntelSummary {
  kpis: SearchIntelKpis;
  /** Full closed traffic-source vocabulary, fixed order, zeros included. */
  sources: TrafficSourceBreakdownItem[];
  topReferrerHosts: SearchTopItem[];
  topLandingPaths: SearchTopItem[];
  topCampaigns: SearchTopItem[];
  /** Top 20 by authorityIndex. */
  contentAuthority: ContentAuthorityItem[];
  /** Documented transparent Authority Index formula (weights + terms). */
  authorityFormula: string;
  daily: SearchTrendBucket[]; // last 30 days
  weekly: SearchTrendBucket[]; // last 12 weeks
  monthly: SearchTrendBucket[]; // last 12 months
  footprint: ContentFootprint;
  diagnostics: SearchIntelDiagnostics;
  /** Documented attribution limitations for founder context. */
  attributionNote: string;
  generatedAt: string;
}
