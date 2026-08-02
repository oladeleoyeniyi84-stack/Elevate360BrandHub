// Phase 72.5 — Search Growth Operations: deterministic, evidence-based SEO
// remediation action generation, founder decision workflow, and impact
// measurement.
//
// Invariants:
// - Reads ONLY stored data (gsc_* tables, seo_* audits, search intelligence
//   events, web vitals). Never calls Google.
// - Generation runs after a successful sync (manual or scheduled) — never
//   during dashboard GET requests.
// - Every action carries structured evidence and the stored component scores
//   of the transparent priority model.
// - Clients cannot create actions, set scores, or fabricate evidence; the
//   only client inputs are founder decisions on server-generated actions.
// - Minimum data thresholds keep sparse data from producing recommendations.
// - Completed / dismissed history is never deleted; obsolete PROPOSED actions
//   are superseded, not removed.

import { sql, eq, desc, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  searchGrowthActions,
  gscSyncRuns,
  seoAuditRuns,
  seoPageAudits,
  seoIndexabilityAudits,
  type SearchGrowthAction,
  type SearchGrowthActionStatus,
  type SearchGrowthActionType,
  SEARCH_GROWTH_ACTION_STATUSES,
} from "@shared/schema";

// ── Transparent priority model ───────────────────────────────────────────────

export const PRIORITY_MODEL_DESCRIPTION =
  "Priority = 30% potential impact + 25% evidence strength + 20% business relevance + " +
  "15% implementation confidence + 10% effort efficiency. Each component is a stored 0-100 " +
  "score derived from stored data. This is a prioritization aid, not an AI certainty or a ranking guarantee.";

export interface PriorityComponents {
  impact: number;      // potential impact (30%)
  evidence: number;    // evidence strength / data volume (25%)
  relevance: number;   // business relevance (20%)
  confidence: number;  // implementation confidence (15%)
  effort: number;      // effort EFFICIENCY — higher = cheaper to do (10%)
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computePriorityScore(c: PriorityComponents): number {
  return clamp(0.30 * clamp(c.impact) + 0.25 * clamp(c.evidence) + 0.20 * clamp(c.relevance) + 0.15 * clamp(c.confidence) + 0.10 * clamp(c.effort));
}

// ── Minimum data thresholds (documented; keep sparse data out) ──────────────

export const THRESHOLDS = {
  minImpressions7d: 20,       // per-query floor for CTR / near-page-one detectors (7d)
  minImpressions28d: 50,      // per-query floor for 28d detectors
  minEmergingImpressions: 15, // current-period floor for an emerging query
  minDecline: 0.35,           // ≥35% relative click/impression drop counts as material
  lowCtr: 0.02,               // <2% CTR with volume = opportunity
  nearPageOneMin: 8,
  nearPageOneMax: 20,
  minPageImpressions: 30,     // landing-page opportunity floor
  maxActionsPerType: 5,       // bound generation volume per detector
} as const;

// ── Window helpers (complete stored days only) ──────────────────────────────

interface QueryWindowRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Deterministic detector ordering: consider the highest-volume rows first so
// the per-detector cap always surfaces the biggest opportunities.
function byImpressionsDesc(m: Map<string, QueryWindowRow>): Array<[string, QueryWindowRow]> {
  return Array.from(m.entries()).sort((a, b) => b[1].impressions - a[1].impressions);
}

async function latestStoredDate(): Promise<string | null> {
  const r = await db.execute(sql`SELECT MAX(date)::text AS max_date FROM gsc_query_daily`);
  return (r.rows[0] as { max_date: string | null } | undefined)?.max_date ?? null;
}

/** Aggregate per-query metrics for [end-days+1 .. end] (inclusive, ISO dates). */
async function queryWindow(endDate: string, days: number, offsetDays = 0): Promise<Map<string, QueryWindowRow>> {
  const r = await db.execute(sql`
    SELECT query,
           SUM(clicks)::int AS clicks,
           SUM(impressions)::int AS impressions,
           CASE WHEN SUM(impressions) > 0 THEN SUM(clicks)::float / SUM(impressions) ELSE 0 END AS ctr,
           CASE WHEN SUM(impressions) > 0 THEN SUM(position * impressions) / SUM(impressions) ELSE 0 END AS position
    FROM gsc_query_daily
    WHERE date > (${endDate}::date - ${days + offsetDays}::int)
      AND date <= (${endDate}::date - ${offsetDays}::int)
    GROUP BY query ORDER BY SUM(impressions) DESC LIMIT 500`);
  const map = new Map<string, QueryWindowRow>();
  for (const row of r.rows as any[]) {
    map.set(row.query, { query: row.query, clicks: Number(row.clicks), impressions: Number(row.impressions), ctr: Number(row.ctr), position: Number(row.position) });
  }
  return map;
}

async function pageWindow(endDate: string, days: number): Promise<Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const r = await db.execute(sql`
    SELECT page,
           SUM(clicks)::int AS clicks,
           SUM(impressions)::int AS impressions,
           CASE WHEN SUM(impressions) > 0 THEN SUM(clicks)::float / SUM(impressions) ELSE 0 END AS ctr,
           CASE WHEN SUM(impressions) > 0 THEN SUM(position * impressions) / SUM(impressions) ELSE 0 END AS position
    FROM gsc_page_daily
    WHERE date > (${endDate}::date - ${days}::int) AND date <= ${endDate}::date
    GROUP BY page ORDER BY SUM(impressions) DESC LIMIT 200`);
  return (r.rows as any[]).map((row) => ({ page: row.page, clicks: Number(row.clicks), impressions: Number(row.impressions), ctr: Number(row.ctr), position: Number(row.position) }));
}

function pathOf(url: string): string {
  try { return new URL(url).pathname || "/"; } catch { return url.startsWith("/") ? url : `/${url}`; }
}

// ── Candidate model ──────────────────────────────────────────────────────────

interface ActionCandidate {
  actionType: SearchGrowthActionType;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  targetPath: string | null;
  targetQuery: string | null;
  components: PriorityComponents;
  sourceType: string;
  sourceReference: string | null;
}

/** Server-derived opportunity identity — clients never influence this. */
export function buildDedupeKey(c: Pick<ActionCandidate, "actionType" | "targetPath" | "targetQuery">): string {
  return `${c.actionType}::${(c.targetPath ?? "").toLowerCase()}::${(c.targetQuery ?? "").toLowerCase()}`.slice(0, 300);
}

// ── Generation ───────────────────────────────────────────────────────────────

export interface GenerationResult {
  generated: number;
  updated: number;
  superseded: number;
  skippedReason?: string;
  syncRunId?: number;
}

export async function generateSearchGrowthActions(trigger: { reason: "manual_sync" | "scheduled_sync" }): Promise<GenerationResult> {
  // Only a SUCCESSFUL sync feeds generation. Older ERROR/PARTIAL runs never
  // override: we anchor on the newest success and read only stored tables.
  const [latestSuccess] = await db.select().from(gscSyncRuns)
    .where(eq(gscSyncRuns.status, "success"))
    .orderBy(desc(gscSyncRuns.startedAt)).limit(1);
  if (!latestSuccess) {
    // ALL generation is gated on a successful sync — with none, nothing runs
    // (a newer partial/error import can never drive recommendations).
    return { generated: 0, updated: 0, superseded: 0, skippedReason: "no successful GSC sync run — generation skipped" };
  }
  // Anchor every GSC window on the SUCCESSFUL run's own end date. Rows written
  // by a newer partial/error import carry later dates and therefore fall
  // outside these windows — they cannot influence generation.
  const endDate = latestSuccess.endDate ?? (await latestStoredDate());

  const candidates: ActionCandidate[] = [];
  const syncRef = `gsc_sync_run:${latestSuccess.id}`;

  if (latestSuccess && endDate) {
    const [cur7, prev7, cur28, prev28] = await Promise.all([
      queryWindow(endDate, 7, 0), queryWindow(endDate, 7, 7),
      queryWindow(endDate, 28, 0), queryWindow(endDate, 28, 28),
    ]);

    // 1. Emerging queries (7d vs prior 7d)
    let n = 0;
    for (const [q, cur] of byImpressionsDesc(cur7)) {
      if (n >= THRESHOLDS.maxActionsPerType) break;
      const prev = prev7.get(q);
      const prevImp = prev?.impressions ?? 0;
      if (cur.impressions >= THRESHOLDS.minEmergingImpressions && cur.impressions >= Math.max(prevImp * 2, prevImp + 10)) {
        n++;
        candidates.push({
          actionType: "improve_search_intent_alignment",
          title: `Emerging query: "${q}"`,
          description: `"${q}" grew from ${prevImp} to ${cur.impressions} impressions week-over-week. Review whether existing content fully answers this intent while momentum is building.`,
          evidence: { detector: "emerging_query", window: "7d_vs_prev_7d", endDate, current: cur, previous: prev ?? null },
          targetPath: null, targetQuery: q,
          components: { impact: clamp(30 + cur.impressions), evidence: clamp(cur.impressions * 2), relevance: 70, confidence: 60, effort: 60 },
          sourceType: "gsc_change", sourceReference: syncRef,
        });
      }
    }

    // 2. Declining queries (28d vs prior 28d — material deterioration)
    n = 0;
    for (const [q, prev] of byImpressionsDesc(prev28)) {
      if (n >= THRESHOLDS.maxActionsPerType) break;
      const cur = cur28.get(q) ?? { query: q, clicks: 0, impressions: 0, ctr: 0, position: 0 };
      if (prev.impressions >= THRESHOLDS.minImpressions28d &&
          (cur.impressions <= prev.impressions * (1 - THRESHOLDS.minDecline) ||
           (prev.clicks >= 5 && cur.clicks <= prev.clicks * (1 - THRESHOLDS.minDecline)))) {
        n++;
        candidates.push({
          actionType: "investigate_query_decline",
          title: `Declining query: "${q}"`,
          description: `"${q}" fell from ${prev.impressions} to ${cur.impressions} impressions (${prev.clicks}→${cur.clicks} clicks) across consecutive 28-day windows. Investigate ranking, content freshness or SERP changes.`,
          evidence: { detector: "declining_query", window: "28d_vs_prev_28d", endDate, current: cur, previous: prev },
          targetPath: null, targetQuery: q,
          components: { impact: clamp(40 + prev.clicks * 3), evidence: clamp(prev.impressions), relevance: 75, confidence: 50, effort: 40 },
          sourceType: "gsc_change", sourceReference: syncRef,
        });
      }
    }

    // 3. High-impression, low-CTR queries (28d, volume floor)
    n = 0;
    for (const [q, cur] of byImpressionsDesc(cur28)) {
      if (n >= THRESHOLDS.maxActionsPerType) break;
      if (cur.impressions >= THRESHOLDS.minImpressions28d && cur.ctr < THRESHOLDS.lowCtr) {
        n++;
        candidates.push({
          actionType: "improve_ctr",
          title: `Low CTR on "${q}"`,
          description: `"${q}" earned ${cur.impressions} impressions in 28 days but only ${cur.clicks} clicks (CTR ${(cur.ctr * 100).toFixed(1)}%, avg position ${cur.position.toFixed(1)}). Stronger title/description alignment could lift clicks.`,
          evidence: { detector: "high_impression_low_ctr", window: "28d", endDate, current: cur, thresholds: { minImpressions: THRESHOLDS.minImpressions28d, lowCtr: THRESHOLDS.lowCtr } },
          targetPath: null, targetQuery: q,
          components: { impact: clamp(cur.impressions / 2), evidence: clamp(cur.impressions), relevance: 70, confidence: 70, effort: 80 },
          sourceType: "gsc_change", sourceReference: syncRef,
        });
      }
    }

    // 4. Near-page-one queries (avg position 8-20 — a prioritization range,
    //    not a guaranteed page classification)
    n = 0;
    for (const [q, cur] of byImpressionsDesc(cur28)) {
      if (n >= THRESHOLDS.maxActionsPerType) break;
      if (cur.impressions >= THRESHOLDS.minImpressions28d && cur.position >= THRESHOLDS.nearPageOneMin && cur.position <= THRESHOLDS.nearPageOneMax) {
        n++;
        candidates.push({
          actionType: "strengthen_internal_linking",
          title: `Near-page-one range: "${q}"`,
          description: `"${q}" averages position ${cur.position.toFixed(1)} with ${cur.impressions} impressions (28d). Position 8-20 is treated as a prioritization range — internal links and content depth may move it; no page placement is guaranteed.`,
          evidence: { detector: "near_page_one", window: "28d", endDate, current: cur, range: [THRESHOLDS.nearPageOneMin, THRESHOLDS.nearPageOneMax] },
          targetPath: null, targetQuery: q,
          components: { impact: clamp(cur.impressions / 2 + 20), evidence: clamp(cur.impressions), relevance: 75, confidence: 55, effort: 65 },
          sourceType: "gsc_change", sourceReference: syncRef,
        });
      }
    }

    // 5. Landing-page opportunities: impressions but weak engagement/funnel.
    const pages = await pageWindow(endDate, 28);
    const engagement = await db.execute(sql`
      SELECT landing_path AS path,
             COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL AND session_id <> '') AS sessions
      FROM search_intelligence_events
      WHERE created_at >= NOW() - INTERVAL '28 days' AND event_name = 'search_landing'
      GROUP BY landing_path`).catch(() => ({ rows: [] as any[] }));
    const engagedByPath = new Map<string, number>();
    for (const row of engagement.rows as any[]) engagedByPath.set(String(row.path ?? ""), Number(row.sessions ?? 0));
    n = 0;
    for (const p of pages) {
      if (n >= THRESHOLDS.maxActionsPerType) break;
      const path = pathOf(p.page);
      const sessions = engagedByPath.get(path) ?? 0;
      if (p.impressions >= THRESHOLDS.minPageImpressions && p.clicks >= 1 && sessions === 0) {
        n++;
        candidates.push({
          actionType: "improve_content_depth",
          title: `Search-visible page with weak engagement: ${path}`,
          description: `${path} earned ${p.impressions} impressions and ${p.clicks} clicks (28d) but recorded no engaged first-party search landings. Content depth or intent alignment may not match what searchers expect.`,
          evidence: { detector: "landing_page_opportunity", window: "28d", endDate, gsc: p, firstPartySearchSessions: sessions },
          targetPath: path, targetQuery: null,
          components: { impact: clamp(p.impressions / 2), evidence: clamp(p.impressions), relevance: 65, confidence: 50, effort: 45 },
          sourceType: "engagement", sourceReference: syncRef,
        });
      }
    }

    // 6. Search-to-revenue opportunities — directional session-level
    //    attribution only (existing disclosure preserved in evidence).
    const organic = await storage.getOrganicRevenueSummary().catch(() => null);
    if (organic) {
      n = 0;
      for (const p of organic.byLandingPage.slice(0, 20)) {
        if (n >= THRESHOLDS.maxActionsPerType) break;
        const gscPage = pages.find((g) => pathOf(g.page) === p.path);
        if (gscPage && gscPage.impressions >= THRESHOLDS.minPageImpressions && p.funnelSessions > 0 && p.revenueCents === 0) {
          n++;
          candidates.push({
            actionType: "distribute_unseen_content",
            title: `Search traffic entering funnel without revenue: ${p.path}`,
            description: `${p.path} draws ${gscPage.impressions} search impressions (28d) and ${p.funnelSessions} funnel session(s) but no attributed revenue yet. Review the downstream offer path. ${organic.attributionNote}`,
            evidence: { detector: "search_to_revenue", window: "28d", endDate, gsc: gscPage, organicOutcome: p, attributionNote: organic.attributionNote },
            targetPath: p.path, targetQuery: null,
            components: { impact: clamp(30 + p.funnelSessions * 10), evidence: clamp(gscPage.impressions / 2 + p.funnelSessions * 10), relevance: 85, confidence: 45, effort: 50 },
            sourceType: "revenue", sourceReference: syncRef,
          });
        }
      }
    }
  }

  // 7. Technical regressions from the latest COMPLETED SEO audit. Optional
  //    GSC capability notes (e.g. searchAppearance) are stored on sync runs,
  //    not audits, and are never read here — they cannot generate actions.
  const [latestAudit] = await db.select().from(seoAuditRuns)
    .where(eq(seoAuditRuns.status, "success"))
    .orderBy(desc(seoAuditRuns.startedAt)).limit(1);
  if (latestAudit) {
    const auditRef = `seo_audit_run:${latestAudit.id}`;
    const pageIssues = await db.select().from(seoPageAudits).where(eq(seoPageAudits.runId, latestAudit.id)).limit(200);
    let metaN = 0;
    for (const pa of pageIssues) {
      if (metaN >= THRESHOLDS.maxActionsPerType) break;
      const issues = pa.issues ?? [];
      if (issues.length === 0) continue;
      const titleIssue = issues.find((i) => /title/i.test(i));
      const descIssue = issues.find((i) => /description/i.test(i));
      const canonicalIssue = pa.canonicalOk === false ? "canonical mismatch" : issues.find((i) => /canonical/i.test(i));
      const pick = titleIssue
        ? { type: "improve_title" as const, issue: titleIssue }
        : descIssue
          ? { type: "improve_meta_description" as const, issue: descIssue }
          : canonicalIssue
            ? { type: "correct_canonical" as const, issue: canonicalIssue }
            : null;
      if (!pick) continue;
      metaN++;
      candidates.push({
        actionType: pick.type,
        title: `${pick.type === "correct_canonical" ? "Canonical issue" : pick.type === "improve_title" ? "Title issue" : "Meta description issue"}: ${pa.path}`,
        description: `SEO audit (run ${latestAudit.id}) flagged: ${pick.issue}. All ${issues.length} issue(s) on this page are listed in evidence. No change is applied automatically.`,
        evidence: { detector: "technical_audit", auditRunId: latestAudit.id, path: pa.path, issues, title: pa.title, metaDescription: pa.metaDescription, canonical: pa.canonical, canonicalOk: pa.canonicalOk },
        targetPath: pa.path, targetQuery: null,
        components: { impact: 55, evidence: 90, relevance: 70, confidence: 85, effort: 85 },
        sourceType: "seo_audit", sourceReference: auditRef,
      });
    }
    const badIndex = await db.select().from(seoIndexabilityAudits)
      .where(and(eq(seoIndexabilityAudits.runId, latestAudit.id), eq(seoIndexabilityAudits.ok, false))).limit(THRESHOLDS.maxActionsPerType);
    for (const item of badIndex) {
      candidates.push({
        actionType: "address_indexability",
        title: `Indexability issue (${item.kind}): ${pathOf(item.url)}`,
        description: `SEO audit (run ${latestAudit.id}) found a failing ${item.kind} check for ${item.url}${item.detail ? ` — ${item.detail}` : ""}. Review before any change.`,
        evidence: { detector: "technical_audit", auditRunId: latestAudit.id, kind: item.kind, url: item.url, httpStatus: item.httpStatus, detail: item.detail },
        targetPath: pathOf(item.url), targetQuery: null,
        components: { impact: 70, evidence: 90, relevance: 75, confidence: 80, effort: 70 },
        sourceType: "seo_audit", sourceReference: auditRef,
      });
    }
  }

  // Core Web Vitals regressions (field data p75 in poor range).
  const vitals = await storage.getWebVitalsSummary(28).catch(() => null);
  if (vitals?.fieldDataAvailable && Array.isArray(vitals.metrics)) {
    for (const m of vitals.metrics) {
      // Only FIELD data with a failing p75 and a real sample base qualifies.
      const isField = m.source === "rum_field" || m.source === "crux_field";
      if (isField && m.rating === "fail" && m.p75 !== null && m.samples >= 20) {
        candidates.push({
          actionType: "improve_core_web_vitals",
          title: `Core Web Vitals: ${m.metric.toUpperCase()} p75 failing (${m.deviceClass})`,
          description: `Field ${m.metric.toUpperCase()} p75 is ${m.p75} across ${m.samples} samples (28d, ${m.deviceClass}) — rated failing. Investigate the heaviest pages.`,
          evidence: { detector: "web_vitals", window: "28d", metric: m, thresholds: vitals.thresholds },
          targetPath: null, targetQuery: `cwv:${m.metric}:${m.deviceClass}`,
          components: { impact: 65, evidence: clamp(m.samples), relevance: 60, confidence: 60, effort: 40 },
          sourceType: "web_vitals", sourceReference: null,
        });
      }
    }
  }

  // ── Persist: dedupe, update-in-place, supersede obsolete proposals ────────
  let generated = 0, updated = 0, superseded = 0;
  const liveKeys = new Set<string>();
  for (const c of candidates) {
    const dedupeKey = buildDedupeKey(c);
    if (liveKeys.has(dedupeKey)) continue; // in-batch dedupe
    liveKeys.add(dedupeKey);
    const priorityScore = computePriorityScore(c.components);
    const [existing] = await db.select().from(searchGrowthActions).where(and(
      eq(searchGrowthActions.dedupeKey, dedupeKey),
      inArray(searchGrowthActions.status, ["proposed", "approved", "in_progress"]),
    )).limit(1);
    if (existing) {
      // Refresh evidence/scores on the live action; founder decisions stand.
      await db.update(searchGrowthActions).set({
        evidence: c.evidence, description: c.description,
        priorityScore, impactScore: clamp(c.components.impact), evidenceScore: clamp(c.components.evidence),
        relevanceScore: clamp(c.components.relevance), confidenceScore: clamp(c.components.confidence),
        effortScore: clamp(c.components.effort), sourceReference: c.sourceReference, updatedAt: new Date(),
      }).where(eq(searchGrowthActions.id, existing.id));
      updated++;
    } else {
      try {
        await db.insert(searchGrowthActions).values({
          actionType: c.actionType, title: c.title.slice(0, 300), description: c.description,
          evidence: c.evidence, targetPath: c.targetPath, targetQuery: c.targetQuery,
          priorityScore, impactScore: clamp(c.components.impact), evidenceScore: clamp(c.components.evidence),
          relevanceScore: clamp(c.components.relevance), confidenceScore: clamp(c.components.confidence),
          effortScore: clamp(c.components.effort),
          sourceType: c.sourceType, sourceReference: c.sourceReference,
          status: "proposed", dedupeKey,
        });
        generated++;
      } catch (err: any) {
        if (err?.code === "23505") { updated++; } else { throw err; } // lost a race — live row exists
      }
    }
  }

  // Supersede PROPOSED actions whose opportunity no longer exists. Only when
  // this run actually had data to compare against; approved/in-progress and
  // all historical records are never touched.
  if (latestSuccess && endDate) {
    const staleProposed = await db.select({ id: searchGrowthActions.id, dedupeKey: searchGrowthActions.dedupeKey })
      .from(searchGrowthActions).where(eq(searchGrowthActions.status, "proposed")).limit(1000);
    const staleIds = staleProposed.filter((s) => !liveKeys.has(s.dedupeKey)).map((s) => s.id);
    if (staleIds.length > 0) {
      const res = await db.update(searchGrowthActions)
        .set({ status: "superseded", updatedAt: new Date() })
        .where(and(inArray(searchGrowthActions.id, staleIds), eq(searchGrowthActions.status, "proposed")))
        .returning({ id: searchGrowthActions.id });
      superseded += res.length;
    }
  }

  // Record the generation run for the operations panel (job-log table).
  await storage.createAutomationJobLog({
    jobKey: "phase72_5_action_generation",
    status: "succeeded",
    summary: `${trigger.reason}: ${generated} new, ${updated} refreshed, ${superseded} superseded`,
    meta: { trigger: trigger.reason, generated, updated, superseded, syncRunId: latestSuccess?.id ?? null } as any,
    finishedAt: new Date(),
  }).catch(() => {});

  return { generated, updated, superseded, syncRunId: latestSuccess?.id, ...(latestSuccess && endDate ? {} : { skippedReason: "no successful sync / no stored GSC data — audit-only generation" }) };
}

// ── Founder decision state machine ──────────────────────────────────────────

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid state transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

const TRANSITIONS: Record<string, SearchGrowthActionStatus[]> = {
  proposed: ["approved", "dismissed"],
  approved: ["in_progress", "completed", "dismissed"],
  in_progress: ["completed", "dismissed"],
  completed: [],
  dismissed: [],
  superseded: [],
};

export async function transitionSearchGrowthAction(
  id: number,
  to: "approved" | "dismissed" | "in_progress" | "completed",
  opts: { note?: string } = {},
): Promise<SearchGrowthAction> {
  const [action] = await db.select().from(searchGrowthActions).where(eq(searchGrowthActions.id, id)).limit(1);
  if (!action) throw new InvalidTransitionError("missing", to);
  if (!TRANSITIONS[action.status]?.includes(to)) throw new InvalidTransitionError(action.status, to);

  // Statuses from which `to` is legal — the UPDATE below is conditioned on
  // them so two concurrent decisions can never both win (compare-and-swap).
  const allowedFrom = (Object.keys(TRANSITIONS) as SearchGrowthActionStatus[])
    .filter((from) => TRANSITIONS[from].includes(to));

  const now = new Date();
  const patch: Partial<typeof searchGrowthActions.$inferInsert> = { status: to, updatedAt: now };
  if (to === "approved") { patch.founderDecision = "approved"; patch.approvedAt = now; if (opts.note) patch.decisionNote = opts.note; }
  if (to === "dismissed") { patch.founderDecision = "dismissed"; patch.dismissedAt = now; patch.decisionNote = opts.note ?? null; }
  if (to === "completed") {
    patch.completedAt = now;
    patch.implementationNote = opts.note ?? null;
    // Baseline = the 28 stored days BEFORE completion; measurement window
    // opens at completion. resultMetrics stays null until enough post data
    // exists (computed lazily, then persisted).
    const endDate = await latestStoredDate();
    if (endDate) {
      patch.measurementStart = now.toISOString().slice(0, 10);
      patch.baselineMetrics = await captureMetrics(action, endDate, 28);
    }
  }
  const [updatedRow] = await db.update(searchGrowthActions).set(patch)
    .where(and(eq(searchGrowthActions.id, id), inArray(searchGrowthActions.status, allowedFrom)))
    .returning();
  if (!updatedRow) {
    // Lost a race — re-read to report the actual current status.
    const [current] = await db.select().from(searchGrowthActions).where(eq(searchGrowthActions.id, id)).limit(1);
    throw new InvalidTransitionError(current?.status ?? "missing", to);
  }
  return updatedRow;
}

// ── Impact measurement (no causation claims) ─────────────────────────────────

export const MEASUREMENT_DISCLAIMER =
  "Observed after implementation; other factors may have influenced the result.";

async function captureMetrics(action: SearchGrowthAction, endDate: string, days: number): Promise<Record<string, unknown>> {
  const metrics: Record<string, unknown> = { windowDays: days, endDate };
  if (action.targetQuery) {
    const w = await queryWindow(endDate, days, 0);
    const q = w.get(action.targetQuery);
    metrics.query = q ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }
  if (action.targetPath) {
    const r = await db.execute(sql`
      SELECT SUM(clicks)::int AS clicks, SUM(impressions)::int AS impressions,
             CASE WHEN SUM(impressions) > 0 THEN SUM(clicks)::float / SUM(impressions) ELSE 0 END AS ctr,
             CASE WHEN SUM(impressions) > 0 THEN SUM(position * impressions) / SUM(impressions) ELSE 0 END AS position
      FROM gsc_page_daily
      WHERE date > (${endDate}::date - ${days}::int) AND date <= ${endDate}::date
        AND (page LIKE '%' || ${action.targetPath} OR page = ${action.targetPath})`);
    const row = r.rows[0] as any;
    metrics.page = { clicks: Number(row?.clicks ?? 0), impressions: Number(row?.impressions ?? 0), ctr: Number(row?.ctr ?? 0), position: Number(row?.position ?? 0) };
    const eng = await db.execute(sql`
      SELECT COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL AND session_id <> '') AS sessions
      FROM search_intelligence_events
      WHERE created_at >= NOW() - (${days}::int || ' days')::interval
        AND event_name = 'search_landing' AND landing_path = ${action.targetPath}`).catch(() => ({ rows: [] as any[] }));
    metrics.searchLandingSessions = Number((eng.rows[0] as any)?.sessions ?? 0);
  }
  return metrics;
}

function classifyOutcome(baseline: any, result: any): "improved" | "declined" | "unchanged" | "insufficient_data" {
  const b = baseline?.query ?? baseline?.page;
  const r = result?.query ?? result?.page;
  if (!b || !r) return "insufficient_data";
  const bImp = Number(b.impressions ?? 0), rImp = Number(r.impressions ?? 0);
  const bClicks = Number(b.clicks ?? 0), rClicks = Number(r.clicks ?? 0);
  if (bImp + rImp < 20) return "insufficient_data";
  const clickDelta = bClicks > 0 ? (rClicks - bClicks) / bClicks : (rClicks > 0 ? 1 : 0);
  const impDelta = bImp > 0 ? (rImp - bImp) / bImp : (rImp > 0 ? 1 : 0);
  if (clickDelta > 0.1 || (clickDelta >= 0 && impDelta > 0.1)) return "improved";
  if (clickDelta < -0.1 || impDelta < -0.1) return "declined";
  return "unchanged";
}

/** Lazily compute resultMetrics for completed actions once a full equivalent window of post-completion data exists. */
export async function measureCompletedActions(): Promise<number> {
  const endDate = await latestStoredDate();
  if (!endDate) return 0;
  const pending = await db.select().from(searchGrowthActions).where(and(
    eq(searchGrowthActions.status, "completed"),
    sql`result_metrics IS NULL AND measurement_start IS NOT NULL
        AND ${endDate}::date >= measurement_start + INTERVAL '28 days'`,
  )).limit(20);
  let measured = 0;
  for (const action of pending) {
    const result = await captureMetrics(action, endDate, 28);
    const outcome = classifyOutcome(action.baselineMetrics, result);
    await db.update(searchGrowthActions).set({
      resultMetrics: { ...result, outcome, disclaimer: MEASUREMENT_DISCLAIMER },
      measurementEnd: endDate, updatedAt: new Date(),
    }).where(eq(searchGrowthActions.id, action.id));
    measured++;
  }
  return measured;
}

// ── Listing + executive summary + operations panel ───────────────────────────

export interface SearchGrowthListFilters {
  status?: SearchGrowthActionStatus;
  actionType?: SearchGrowthActionType;
  targetPath?: string;
  targetQuery?: string;
  minPriority?: number;
}

export async function listSearchGrowthActions(filters: SearchGrowthListFilters): Promise<SearchGrowthAction[]> {
  const conds = [] as any[];
  if (filters.status) conds.push(eq(searchGrowthActions.status, filters.status));
  if (filters.actionType) conds.push(eq(searchGrowthActions.actionType, filters.actionType));
  if (filters.targetPath) conds.push(sql`target_path ILIKE '%' || ${filters.targetPath} || '%'`);
  if (filters.targetQuery) conds.push(sql`target_query ILIKE '%' || ${filters.targetQuery} || '%'`);
  if (typeof filters.minPriority === "number") conds.push(sql`priority_score >= ${filters.minPriority}`);
  const q = db.select().from(searchGrowthActions);
  const rows = conds.length ? await q.where(and(...conds)).orderBy(desc(searchGrowthActions.priorityScore), desc(searchGrowthActions.createdAt)).limit(200)
                            : await q.orderBy(desc(searchGrowthActions.priorityScore), desc(searchGrowthActions.createdAt)).limit(200);
  return rows;
}

export interface SearchGrowthSummary {
  kpis: {
    openActions: number; highPriorityActions: number; approvedActions: number;
    completedActions: number; awaitingMeasurement: number; observedImprovements: number;
    impressionsChangePct: number | null; clicksChangePct: number | null;
    organicFunnelEntries: number; directionalOrganicRevenueCents: number;
  };
  operations: {
    lastGscSync: { at: string | null; status: string | null; source: string | null };
    nextScheduledGscSync: string | null;
    lastSeoAudit: { at: string | null; status: string | null };
    nextScheduledSeoAudit: string | null;
    lastGenerationRun: { at: string | null; summary: string | null };
    currentJobFailure: string | null;
  };
  priorityModel: string;
  measurementDisclaimer: string;
}

export async function getSearchGrowthSummary(): Promise<SearchGrowthSummary> {
  const countsRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('proposed','approved','in_progress')) AS open,
      COUNT(*) FILTER (WHERE status IN ('proposed','approved','in_progress') AND priority_score >= 70) AS high,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND result_metrics IS NULL) AS awaiting,
      COUNT(*) FILTER (WHERE status = 'completed' AND result_metrics->>'outcome' = 'improved') AS improved
    FROM search_growth_actions`);
  const c = countsRes.rows[0] as any;

  const endDate = await latestStoredDate();
  let impressionsChangePct: number | null = null, clicksChangePct: number | null = null;
  if (endDate) {
    const r = await db.execute(sql`
      SELECT
        SUM(impressions) FILTER (WHERE date > ${endDate}::date - 28 AND date <= ${endDate}::date) AS cur_imp,
        SUM(impressions) FILTER (WHERE date > ${endDate}::date - 56 AND date <= ${endDate}::date - 28) AS prev_imp,
        SUM(clicks) FILTER (WHERE date > ${endDate}::date - 28 AND date <= ${endDate}::date) AS cur_clicks,
        SUM(clicks) FILTER (WHERE date > ${endDate}::date - 56 AND date <= ${endDate}::date - 28) AS prev_clicks
      FROM gsc_query_daily`);
    const w = r.rows[0] as any;
    const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
    impressionsChangePct = pct(Number(w?.cur_imp ?? 0), Number(w?.prev_imp ?? 0));
    clicksChangePct = pct(Number(w?.cur_clicks ?? 0), Number(w?.prev_clicks ?? 0));
  }

  const organic = await storage.getOrganicRevenueSummary().catch(() => null);

  const [lastSync] = await db.select().from(gscSyncRuns)
    .where(sql`status <> 'running'`).orderBy(desc(gscSyncRuns.startedAt)).limit(1);
  const [lastAudit] = await db.select().from(seoAuditRuns).orderBy(desc(seoAuditRuns.startedAt)).limit(1);

  const jobs = await db.execute(sql`
    SELECT job_key, next_run_at, status, last_error
    FROM automation_jobs
    WHERE job_key IN ('phase72_5_daily_gsc_sync', 'phase72_5_weekly_seo_audit')`).catch(() => ({ rows: [] as any[] }));
  const jobMap = new Map<string, any>();
  for (const j of jobs.rows as any[]) jobMap.set(j.job_key, j);
  const syncJob = jobMap.get("phase72_5_daily_gsc_sync");
  const auditJob = jobMap.get("phase72_5_weekly_seo_audit");

  const genLog = await db.execute(sql`
    SELECT started_at, summary FROM automation_job_logs
    WHERE job_key = 'phase72_5_action_generation'
    ORDER BY started_at DESC LIMIT 1`).catch(() => ({ rows: [] as any[] }));
  const gen = genLog.rows[0] as any;

  const failure = [syncJob, auditJob].find((j) => j?.status === "failed" && j?.last_error);

  return {
    kpis: {
      openActions: Number(c?.open ?? 0),
      highPriorityActions: Number(c?.high ?? 0),
      approvedActions: Number(c?.approved ?? 0),
      completedActions: Number(c?.completed ?? 0),
      awaitingMeasurement: Number(c?.awaiting ?? 0),
      observedImprovements: Number(c?.improved ?? 0),
      impressionsChangePct,
      clicksChangePct,
      organicFunnelEntries: organic?.organicFunnelSessions ?? 0,
      directionalOrganicRevenueCents: organic?.organicRevenueCents ?? 0,
    },
    operations: {
      lastGscSync: {
        at: lastSync?.finishedAt?.toISOString() ?? lastSync?.startedAt?.toISOString() ?? null,
        status: lastSync?.status ?? null,
        source: lastSync?.source ?? null,
      },
      nextScheduledGscSync: syncJob?.next_run_at ? new Date(syncJob.next_run_at).toISOString() : null,
      lastSeoAudit: {
        at: lastAudit?.finishedAt?.toISOString() ?? lastAudit?.startedAt?.toISOString() ?? null,
        status: lastAudit?.status ?? null,
      },
      nextScheduledSeoAudit: auditJob?.next_run_at ? new Date(auditJob.next_run_at).toISOString() : null,
      lastGenerationRun: {
        at: gen?.started_at ? new Date(gen.started_at).toISOString() : null,
        summary: gen?.summary ?? null,
      },
      currentJobFailure: failure ? `${failure.job_key}: ${String(failure.last_error).slice(0, 200)}` : null,
    },
    priorityModel: PRIORITY_MODEL_DESCRIPTION,
    measurementDisclaimer: MEASUREMENT_DISCLAIMER,
  };
}
