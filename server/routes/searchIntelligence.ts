// Phase 72.4R — composed Search Intelligence dashboard payload + founder sync.
// Mounted at /api/dashboard/search-intelligence via dynamic import in
// registerRoutes (same pattern as cognitiveOs, avoiding circular imports).
//
// GET  /      → SearchIntelDashboardPayload (cached SQL only — never Google)
// POST /sync  → founder-triggered GSC import and/or SEO audit run

import { Router } from "express";
import { ZodError } from "zod";
import { requireDashboardAuth, rateLimit } from "../routes";
import { storage } from "../storage";
import { gscSyncRequestSchema, GSC_SYNC_DEFAULT_DAYS } from "@shared/schema";
import { getGscConfig, runGscSync, GscSyncConflictError } from "../services/googleSearchConsole";
import { runSeoAudit } from "../services/seoAudit";
import { buildRecommendations } from "../services/seoRecommendations";
import type {
  SearchConsoleStatus,
  SearchIntelDashboardPayload,
  SyncStatusSummary,
} from "@shared/types/searchIntel";

const WINDOW_DAYS = 28;

export const searchIntelligenceRouter = Router();

searchIntelligenceRouter.get("/", requireDashboardAuth, async (_req, res) => {
  try {
    const [
      firstParty, scData, gscTotals, queries, landingPages,
      structuredData, metadata, indexability, webVitals, organicRevenue, recentAuditRuns,
    ] = await Promise.all([
      storage.getSearchIntelSummary(),
      storage.getSearchConsoleStatusData(),
      storage.getGscWindowTotals(WINDOW_DAYS),
      storage.getQueryIntelligence(WINDOW_DAYS),
      storage.getLandingPageIntelligence(WINDOW_DAYS),
      storage.getStructuredDataSummary(),
      storage.getMetadataAuditSummary(),
      storage.getIndexabilitySummary(),
      storage.getWebVitalsSummary(WINDOW_DAYS),
      storage.getOrganicRevenueSummary(),
      storage.getRecentAuditRuns(10),
    ]);

    const cfg = getGscConfig();
    const searchConsole: SearchConsoleStatus = {
      configured: cfg.configured,
      reason: cfg.configured ? null : cfg.reason,
      siteUrl: cfg.configured ? cfg.config.siteUrl : null,
      lastRun: scData.lastRun,
      lastSuccessfulSyncAt: scData.lastSuccessfulSyncAt,
      dataThrough: scData.dataThrough,
      totalQueryRows: scData.totalQueryRows,
      totalPageRows: scData.totalPageRows,
    };
    const syncStatus: SyncStatusSummary = {
      searchConsole,
      lastAuditRun: recentAuditRuns[0] ?? null,
      recentSyncRuns: scData.recentRuns,
      recentAuditRuns,
    };

    const payload: SearchIntelDashboardPayload = {
      firstParty,
      searchConsole,
      gscTotals,
      queries,
      landingPages,
      structuredData,
      metadata,
      indexability,
      webVitals,
      organicRevenue,
      recommendations: buildRecommendations({
        searchConsole, queries, landingPages, structuredData,
        metadata, indexability, webVitals, organicRevenue, firstParty,
      }),
      syncStatus,
      generatedAt: new Date().toISOString(),
    };
    res.json(payload);
  } catch (error) {
    console.error("[search-intelligence] dashboard payload failed:", error);
    res.status(500).json({ error: "Failed to load search intelligence" });
  }
});

// Founder-triggered import + audit. Tight rate limit; one GSC sync at a time.
searchIntelligenceRouter.post("/sync", requireDashboardAuth, rateLimit(6, 300), async (req, res) => {
  try {
    const parsed = gscSyncRequestSchema.parse(req.body ?? {});
    if (parsed.fixture && process.env.NODE_ENV === "production") {
      // Fixture imports exist for hermetic contract tests only.
      return res.status(403).json({ error: "Fixture imports are only allowed outside production" });
    }
    const scope = parsed.scope ?? "all";
    const wantsGsc = scope === "all" || scope === "gsc";
    const wantsAudits = scope === "all" || scope === "audits";
    if (wantsGsc && (await storage.hasActiveGscSyncRun())) {
      return res.status(409).json({ error: "A Search Console sync is already running — try again in a moment" });
    }
    const result: Record<string, unknown> = { ok: true, scope };
    if (wantsGsc) {
      const gsc = await runGscSync({ days: parsed.days ?? GSC_SYNC_DEFAULT_DAYS, fixture: parsed.fixture });
      result.gsc = gsc;
      // Phase 72.5 — a successful manual sync also refreshes the growth
      // action queue (generation reads stored data only; failures here never
      // fail the sync response).
      if (gsc.status === "success") {
        try {
          const { generateSearchGrowthActions, measureCompletedActions } = await import("../services/searchGrowthActions");
          result.growthActions = await generateSearchGrowthActions({ reason: "manual_sync" });
          await measureCompletedActions().catch(() => {});
        } catch (err) {
          console.error("[search-growth] post-sync generation failed:", err);
        }
      }
    }
    if (wantsAudits) {
      result.audits = await runSeoAudit();
    }
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Invalid sync request", details: error.errors });
    }
    if (error instanceof GscSyncConflictError) {
      // Lost the DB-level single-run race (pre-check above is only a fast path).
      return res.status(409).json({ error: "A Search Console sync is already running — try again in a moment" });
    }
    console.error("[search-intelligence] sync failed:", error);
    res.status(500).json({ error: "Sync failed" });
  }
});
