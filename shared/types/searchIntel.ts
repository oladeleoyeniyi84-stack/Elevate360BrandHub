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

// ─── Phase 72.4R — Search Console, SEO audits, Core Web Vitals payloads ─────

export interface GscRunInfo {
  id: number;
  status: string; // running | success | partial | error | not_configured
  source: string; // api | fixture
  startedAt: string;
  finishedAt: string | null;
  daysRequested: number | null;
  startDate: string | null;
  endDate: string | null;
  queryRows: number;
  pageRows: number;
  dimensionRows: number;
  queryPageRows: number;
  errorText: string | null;
  /** Informational notes (e.g. optional capabilities unavailable) — never errors. */
  notes: string[] | null;
}

export interface SearchConsoleStatus {
  configured: boolean;
  /** Human-readable reason + required env vars when not configured. */
  reason: string | null;
  siteUrl: string | null;
  lastRun: GscRunInfo | null;
  lastSuccessfulSyncAt: string | null;
  /** Latest GSC data date present locally (GSC lags ~2–3 days behind). */
  dataThrough: string | null;
  totalQueryRows: number;
  totalPageRows: number;
}

export interface GscWindowTotals {
  clicks: number;
  impressions: number;
  ctrPct: number | null; // 0–100; null when impressions = 0
  avgPosition: number | null;
}

export interface QueryIntelItem {
  query: string;
  clicks: number;
  impressions: number;
  ctrPct: number | null;
  avgPosition: number | null;
  prevClicks: number;
  prevImpressions: number;
  deltaClicks: number;
  deltaImpressions: number;
  /** Top associated landing pages from the query↔page snapshot. */
  topPages: string[];
}

export interface QueryIntelligence {
  windowDays: number;
  totals: GscWindowTotals;
  prevTotals: GscWindowTotals;
  topQueries: QueryIntelItem[];
  emerging: QueryIntelItem[];
  declining: QueryIntelItem[];
  lowCtrHighImpressions: QueryIntelItem[];
  nearPageOne: QueryIntelItem[];
  /** Documented closed thresholds used for the buckets above. */
  thresholds: string;
}

export interface LandingPageIntelItem {
  path: string;
  clicks: number;
  impressions: number;
  ctrPct: number | null;
  avgPosition: number | null;
  deltaClicks: number;
  deltaImpressions: number;
  organicVisitors: number;
  organicFunnelSessions: number;
  organicBookings: number;
  organicRevenueCents: number;
  aiAssistedConversions: number;
}

export interface LandingPageIntelligence {
  windowDays: number;
  items: LandingPageIntelItem[];
  attributionNote: string;
}

export interface SchemaCoverageItem {
  schemaType: string;
  expectedPages: number;
  presentOnExpected: number;
  presentAnywhere: number;
  invalidCount: number;
}

export interface SchemaAuditPageItem {
  path: string;
  schemaType: string;
  expected: boolean;
  present: boolean;
  valid: boolean | null; // null when absent
  issues: string[];
}

export interface StructuredDataSummary {
  runId: number;
  auditedAt: string;
  pagesAudited: number;
  coverage: SchemaCoverageItem[];
  items: SchemaAuditPageItem[];
  note: string;
}

export interface MetadataPageItem {
  path: string;
  httpStatus: number;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  descriptionLength: number;
  canonical: string | null;
  canonicalOk: boolean | null;
  robotsMeta: string | null;
  noindex: boolean;
  ogTitle: boolean;
  ogDescription: boolean;
  ogImage: boolean;
  twitterTitle: boolean;
  twitterDescription: boolean;
  twitterImage: boolean;
  issues: string[];
}

export interface DuplicateMetaItem {
  value: string;
  count: number;
  paths: string[];
}

export interface MetadataAuditSummary {
  runId: number;
  auditedAt: string;
  pagesAudited: number;
  pagesWithIssues: number;
  duplicateTitles: DuplicateMetaItem[];
  duplicateDescriptions: DuplicateMetaItem[];
  pages: MetadataPageItem[];
  /** Server-delivered-HTML disclosure (what social bots / non-JS crawlers see). */
  note: string;
}

export interface IndexabilityCheckItem {
  kind: string;
  url: string;
  ok: boolean;
  httpStatus: number | null;
  detail: string | null;
}

export interface IndexabilitySummary {
  runId: number;
  auditedAt: string;
  robotsTxtOk: boolean;
  sitemapOk: boolean;
  sitemapUrlCount: number;
  sitemapUrlsChecked: number;
  sitemapUrlFailures: IndexabilityCheckItem[];
  canonicalIssues: IndexabilityCheckItem[];
  noindexPages: IndexabilityCheckItem[];
  redirectChains: IndexabilityCheckItem[];
  brokenInternalLinks: IndexabilityCheckItem[];
  internalLinksChecked: number;
  note: string;
}

export interface WebVitalsMetricSummary {
  metric: string; // lcp | inp | cls
  deviceClass: string; // mobile | desktop | tablet | unknown
  p75: number | null;
  rating: "pass" | "needs_improvement" | "fail" | null;
  samples: number;
  /** rum_field / crux_field = field data; lighthouse_lab = synthetic. */
  source: string;
}

export interface WebVitalsSummary {
  windowDays: number;
  fieldDataAvailable: boolean;
  syntheticDataAvailable: boolean;
  metrics: WebVitalsMetricSummary[];
  thresholds: string;
  /** Field vs synthetic labeling disclosure — synthetic is never shown as field. */
  note: string;
}

export interface OrganicPageOutcome {
  path: string;
  organicSessions: number;
  funnelSessions: number;
  bookings: number;
  revenueCents: number;
  aiAssistedConversions: number;
}

export interface OrganicRevenueSummary {
  organicSessions: number;
  organicFunnelSessions: number;
  organicBookings: number;
  organicRevenueCents: number;
  aiAssistedConversions: number;
  aiAssistedRevenueCents: number;
  byLandingPage: OrganicPageOutcome[];
  attributionNote: string;
}

export interface SeoRecommendation {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  detail: string;
}

export interface AuditRunInfo {
  id: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  pagesAudited: number;
  issuesFound: number;
  errorText: string | null;
}

export interface SyncStatusSummary {
  searchConsole: SearchConsoleStatus;
  lastAuditRun: AuditRunInfo | null;
  recentSyncRuns: GscRunInfo[];
  recentAuditRuns: AuditRunInfo[];
}

export interface SearchIntelDashboardPayload {
  /** The unchanged first-party 72.4 attribution + authority summary. */
  firstParty: SearchIntelSummary;
  searchConsole: SearchConsoleStatus;
  gscTotals: { current: GscWindowTotals; previous: GscWindowTotals; windowDays: number } | null;
  queries: QueryIntelligence | null;
  landingPages: LandingPageIntelligence | null;
  structuredData: StructuredDataSummary | null;
  metadata: MetadataAuditSummary | null;
  indexability: IndexabilitySummary | null;
  webVitals: WebVitalsSummary;
  organicRevenue: OrganicRevenueSummary;
  recommendations: SeoRecommendation[];
  syncStatus: SyncStatusSummary;
  generatedAt: string;
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
