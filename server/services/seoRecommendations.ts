// Phase 72.4R — deterministic SEO recommendations engine.
// Pure rules over already-collected data (no AI, no network): every
// recommendation cites the signal that produced it.

import type {
  SearchConsoleStatus,
  QueryIntelligence,
  LandingPageIntelligence,
  StructuredDataSummary,
  MetadataAuditSummary,
  IndexabilitySummary,
  WebVitalsSummary,
  OrganicRevenueSummary,
  SearchIntelSummary,
  SeoRecommendation,
} from "@shared/types/searchIntel";

const SEVERITY_ORDER: Record<SeoRecommendation["severity"], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};
const MAX_RECOMMENDATIONS = 20;

export function buildRecommendations(input: {
  searchConsole: SearchConsoleStatus;
  queries: QueryIntelligence | null;
  landingPages: LandingPageIntelligence | null;
  structuredData: StructuredDataSummary | null;
  metadata: MetadataAuditSummary | null;
  indexability: IndexabilitySummary | null;
  webVitals: WebVitalsSummary;
  organicRevenue: OrganicRevenueSummary;
  firstParty: SearchIntelSummary;
}): SeoRecommendation[] {
  const recs: SeoRecommendation[] = [];
  const add = (r: SeoRecommendation) => recs.push(r);

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (!input.searchConsole.configured) {
    add({
      id: "gsc-not-configured", severity: "medium", category: "Setup",
      title: "Connect Google Search Console",
      detail:
        "Query, impression, CTR and position intelligence is inactive. Set GOOGLE_SEARCH_CONSOLE_CREDENTIALS " +
        "(service-account JSON) and GSC_SITE_URL, add the service-account email as a user on the property, then run a sync.",
    });
  } else if (input.searchConsole.totalQueryRows === 0) {
    add({
      id: "gsc-no-data", severity: "medium", category: "Setup",
      title: "Run your first Search Console sync",
      detail: "Credentials are configured but no snapshots are stored yet — run a sync from the Sync Status tab.",
    });
  }
  if (!input.metadata) {
    add({
      id: "audit-never-run", severity: "medium", category: "Setup",
      title: "Run the first SEO audit",
      detail: "No metadata/structured-data/indexability audit has been persisted yet — run a sync (audits scope) to populate the SEO Health tabs.",
    });
  }

  // ── Indexability ───────────────────────────────────────────────────────────
  const idx = input.indexability;
  if (idx) {
    if (!idx.robotsTxtOk) {
      add({
        id: "robots-unavailable", severity: "critical", category: "Indexing",
        title: "robots.txt is not served correctly",
        detail: "Crawlers cannot read robots.txt — verify it is deployed and returns HTTP 200.",
      });
    }
    if (!idx.sitemapOk) {
      add({
        id: "sitemap-unavailable", severity: "critical", category: "Indexing",
        title: "sitemap.xml is unavailable or empty",
        detail: "The sitemap could not be fetched or contains no URLs — search engines lose the canonical crawl list.",
      });
    }
    if (idx.sitemapUrlFailures.length > 0) {
      add({
        id: "sitemap-broken-urls", severity: "high", category: "Indexing",
        title: `${idx.sitemapUrlFailures.length} sitemap URL(s) return non-200`,
        detail: `Fix or remove: ${idx.sitemapUrlFailures.slice(0, 5).map((f) => f.url).join(", ")}${idx.sitemapUrlFailures.length > 5 ? "…" : ""}. Broken sitemap entries waste crawl budget and erode trust.`,
      });
    }
    if (idx.brokenInternalLinks.length > 0) {
      add({
        id: "broken-internal-links", severity: "high", category: "Indexing",
        title: `${idx.brokenInternalLinks.length} broken internal link destination(s)`,
        detail: `Repair: ${idx.brokenInternalLinks.slice(0, 5).map((f) => f.url).join(", ")}${idx.brokenInternalLinks.length > 5 ? "…" : ""}.`,
      });
    }
    const badChains = idx.redirectChains.filter((r) => !r.ok);
    if (badChains.length > 0) {
      add({
        id: "redirect-chains", severity: "medium", category: "Indexing",
        title: `${badChains.length} redirect chain(s) detected`,
        detail: `Link and sitemap entries should point at final URLs. Chains: ${badChains.slice(0, 3).map((r) => r.url).join(", ")}${badChains.length > 3 ? "…" : ""}.`,
      });
    }
    if (idx.noindexPages.length > 0) {
      add({
        id: "noindex-pages", severity: "medium", category: "Indexing",
        title: `${idx.noindexPages.length} page(s) carry noindex`,
        detail: `Confirm these are intentional: ${idx.noindexPages.slice(0, 5).map((r) => r.url).join(", ")}.`,
      });
    }
  }

  // ── Metadata quality ───────────────────────────────────────────────────────
  const meta = input.metadata;
  if (meta) {
    const missingTitle = meta.pages.filter((p) => p.httpStatus === 200 && !p.title).length;
    const missingDesc = meta.pages.filter((p) => p.httpStatus === 200 && !p.metaDescription).length;
    if (missingTitle > 0 || missingDesc > 0) {
      add({
        id: "meta-missing", severity: "high", category: "Metadata",
        title: `Missing titles (${missingTitle}) or descriptions (${missingDesc}) in served HTML`,
        detail: "Pages without server-delivered titles/descriptions look blank to non-JS crawlers and social scrapers.",
      });
    }
    if (meta.duplicateTitles.length > 0) {
      add({
        id: "meta-duplicate-titles", severity: "medium", category: "Metadata",
        title: `${meta.duplicateTitles.length} duplicated title group(s) in served HTML`,
        detail:
          "Every route currently ships the same static <head> until JS hydration (SPA). JS-rendering crawlers see " +
          "per-page Helmet tags, but social scrapers do not — consider server-side meta injection or prerendering for key routes.",
      });
    }
    const missingOgImage = meta.pages.filter((p) => p.httpStatus === 200 && !p.ogImage).length;
    if (missingOgImage > 0) {
      add({
        id: "meta-og-image", severity: "medium", category: "Social",
        title: `${missingOgImage} page(s) lack og:image in served HTML`,
        detail: "Shares to social platforms will render without a preview card image on those routes.",
      });
    }
  }

  // ── Structured data ────────────────────────────────────────────────────────
  const sd = input.structuredData;
  if (sd) {
    for (const cov of sd.coverage) {
      if (cov.expectedPages > 0 && cov.presentOnExpected < cov.expectedPages) {
        add({
          id: `schema-missing-${cov.schemaType.toLowerCase()}`, severity: "medium", category: "Structured data",
          title: `${cov.schemaType} schema missing on ${cov.expectedPages - cov.presentOnExpected} of ${cov.expectedPages} expected page(s)`,
          detail: `Add ${cov.schemaType} JSON-LD to the server-delivered HTML of the affected pages (see Structured Data tab).`,
        });
      }
      if (cov.invalidCount > 0) {
        add({
          id: `schema-invalid-${cov.schemaType.toLowerCase()}`, severity: "high", category: "Structured data",
          title: `${cov.invalidCount} invalid ${cov.schemaType} block(s)`,
          detail: "Required properties are missing — invalid structured data is ignored by search engines.",
        });
      }
    }
  }

  // ── Core Web Vitals ────────────────────────────────────────────────────────
  const failing = input.webVitals.metrics.filter((m) => m.rating === "fail");
  const needsWork = input.webVitals.metrics.filter((m) => m.rating === "needs_improvement");
  if (failing.length > 0) {
    add({
      id: "cwv-failing", severity: "high", category: "Core Web Vitals",
      title: `${failing.length} Web Vitals segment(s) failing at p75`,
      detail: failing.slice(0, 4).map((m) => `${m.metric.toUpperCase()} (${m.deviceClass}): p75 ${m.p75}`).join("; ") + " — field data (RUM).",
    });
  } else if (needsWork.length > 0) {
    add({
      id: "cwv-needs-improvement", severity: "medium", category: "Core Web Vitals",
      title: `${needsWork.length} Web Vitals segment(s) need improvement at p75`,
      detail: needsWork.slice(0, 4).map((m) => `${m.metric.toUpperCase()} (${m.deviceClass}): p75 ${m.p75}`).join("; ") + " — field data (RUM).",
    });
  }
  if (!input.webVitals.fieldDataAvailable) {
    add({
      id: "cwv-no-field-data", severity: "low", category: "Core Web Vitals",
      title: "No field Web Vitals data yet",
      detail: "Real-user measurement is live but has not collected samples in this window — data appears as visitors browse.",
    });
  }

  // ── Query opportunities ────────────────────────────────────────────────────
  const q = input.queries;
  if (q) {
    if (q.lowCtrHighImpressions.length > 0) {
      add({
        id: "queries-low-ctr", severity: "high", category: "Queries",
        title: `${q.lowCtrHighImpressions.length} high-impression quer${q.lowCtrHighImpressions.length === 1 ? "y" : "ies"} with weak CTR`,
        detail: `Rewrite titles/descriptions to match intent: ${q.lowCtrHighImpressions.slice(0, 3).map((i) => `"${i.query}"`).join(", ")}${q.lowCtrHighImpressions.length > 3 ? "…" : ""}.`,
      });
    }
    if (q.nearPageOne.length > 0) {
      add({
        id: "queries-near-page-one", severity: "high", category: "Queries",
        title: `${q.nearPageOne.length} quer${q.nearPageOne.length === 1 ? "y" : "ies"} within striking distance of page one`,
        detail: `Positions 8–14 — strengthen internal links and refresh content for: ${q.nearPageOne.slice(0, 3).map((i) => `"${i.query}"`).join(", ")}${q.nearPageOne.length > 3 ? "…" : ""}.`,
      });
    }
    if (q.declining.length > 0) {
      add({
        id: "queries-declining", severity: "medium", category: "Queries",
        title: `${q.declining.length} quer${q.declining.length === 1 ? "y" : "ies"} losing impressions vs the prior window`,
        detail: `Investigate freshness/competition for: ${q.declining.slice(0, 3).map((i) => `"${i.query}"`).join(", ")}${q.declining.length > 3 ? "…" : ""}.`,
      });
    }
  }

  // ── Content & monetization ─────────────────────────────────────────────────
  if (input.firstParty.footprint.publishedNeverViewed > 0) {
    add({
      id: "content-never-viewed", severity: "medium", category: "Content",
      title: `${input.firstParty.footprint.publishedNeverViewed} published post(s) with zero tracked views`,
      detail: "Distribute or internally link these posts — published content nobody reaches earns no authority.",
    });
  }
  if (input.organicRevenue.organicSessions > 0 && input.organicRevenue.organicRevenueCents === 0) {
    add({
      id: "organic-no-revenue", severity: "low", category: "Revenue",
      title: "Organic sessions exist but no attributed organic revenue yet",
      detail: "Session-joined earnings from organic landings are 0 in the current data — review offers/CTAs on top organic landing pages.",
    });
  }

  return recs
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, MAX_RECOMMENDATIONS);
}
