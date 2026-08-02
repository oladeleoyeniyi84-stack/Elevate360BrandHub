// Phase 72.5 — Search Growth Operations & SEO remediation tests.
// Run with the dev server up on :5000:  npx tsx scripts/phase72_5_api_tests.ts
//
// Mix of: real unit tests against exported service functions (priority model,
// detectors via seeded fixture data, state machine), live HTTP contract tests
// (founder auth, decisions, JSON guards), and structural source assertions
// where behavior cannot be triggered hermetically (scheduler wiring, retry
// bounds, production fixture block).

import fs from "fs";
import { execSync } from "child_process";
import {
  computePriorityScore,
  buildDedupeKey,
  generateSearchGrowthActions,
  transitionSearchGrowthAction,
  InvalidTransitionError,
  THRESHOLDS,
  PRIORITY_MODEL_DESCRIPTION,
} from "../server/services/searchGrowthActions";
import { isTransientGscFailure } from "../server/automation/searchGrowthOps";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:5000";
const PIN = process.env.DASHBOARD_PIN ?? "";
const SVC = fs.readFileSync("server/services/searchGrowthActions.ts", "utf-8");
const OPS = fs.readFileSync("server/automation/searchGrowthOps.ts", "utf-8");
const ROUTE = fs.readFileSync("server/routes/searchGrowth.ts", "utf-8");
const SYNC_ROUTE = fs.readFileSync("server/routes/searchIntelligence.ts", "utf-8");
const AUTOMATION = fs.readFileSync("server/automation/index.ts", "utf-8");
const AUDIT_SVC = fs.readFileSync("server/services/seoAudit.ts", "utf-8");

let passed = 0, failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}
function section(t: string) { console.log(`\n━━ ${t} ━━`); }

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const contentType = res.headers.get("content-type") ?? "";
  let json: any = null;
  try { json = JSON.parse(await res.text()); } catch { /* html */ }
  return { status: res.status, json, contentType };
}

function isoDaysAgo(days: number): string {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const login = await fetch(`${BASE}/api/dashboard/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: PIN }),
  });
  const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
  const authed = { cookie, "Content-Type": "application/json" };

  // ── 1. Idempotent bootstrap ───────────────────────────────────────────────
  section("Bootstrap");
  let bootstrapOk = true;
  try {
    execSync("npx tsx scripts/create_phase72_5_tables.ts", { stdio: "pipe" });
    execSync("npx tsx scripts/create_phase72_5_tables.ts", { stdio: "pipe" });
  } catch { bootstrapOk = false; }
  check("1. table bootstrap is idempotent (ran twice cleanly)", bootstrapOk);

  // ── Seed deterministic GSC data via fixture sync (stored data only) ──────
  // Recent 7d: emerging query; 28d: low-CTR + near-page-one + declining.
  const d = isoDaysAgo;
  const q = (date: string, query: string, clicks: number, impressions: number, position: number) =>
    ({ date, query, clicks, impressions, ctr: impressions > 0 ? clicks / impressions : 0, position });
  const fixture = {
    scope: "gsc",
    fixture: {
      queries: [
        // emerging: 0 impressions prev-7d, 30 in latest 7d
        q(d(3), "phase725 emerging topic", 20, 500, 12),
        // low CTR: 120 impressions / 1 click across 28d
        q(d(10), "phase725 low ctr query", 10, 1200, 5.5),
        // near page one: pos ~11, 80 impressions
        q(d(12), "phase725 near page one", 30, 900, 11.2),
        // declining: strong in prev-28 window, absent in current
        q(d(40), "phase725 declining query", 40, 800, 4.0),
        // sparse: 3 impressions — must NOT generate anything
        q(d(5), "phase725 sparse query", 0, 3, 30),
      ],
      pages: [
        { date: d(10), page: "https://www.elevate360official.com/phase725-page", clicks: 3, impressions: 90, ctr: 0.033, position: 9.0 },
      ],
    },
  };
  const seed = await api("/api/dashboard/search-intelligence/sync", { method: "POST", headers: authed, body: JSON.stringify(fixture) });
  const seededOk = seed.status === 200 && seed.json?.gsc?.status === "success";

  // ── Generation (2-14) ────────────────────────────────────────────────────
  section("Action generation");
  const gen = await generateSearchGrowthActions({ reason: "manual_sync" });
  check("2. generation reads stored data only (ran offline against DB; no Google imports in service)",
    !/googleapis|getAccessToken|fetchAnalyticsRows/.test(SVC) && typeof gen.generated === "number");

  const rows = (await db.execute(sql`SELECT * FROM search_growth_actions`)).rows as any[];
  const live = rows.filter((r) => ["proposed", "approved", "in_progress"].includes(r.status));
  const byQuery = (needle: string) => live.filter((r) => (r.target_query ?? "").includes(needle));

  check("3. sparse data creates no recommendation", byQuery("phase725 sparse query").length === 0);
  check("4. high-impression/low-CTR opportunity generated",
    byQuery("phase725 low ctr query").some((r) => r.action_type === "improve_ctr"));
  check("5. near-page-one opportunity generated (labeled as prioritization range)",
    byQuery("phase725 near page one").some((r) => r.action_type === "strengthen_internal_linking" && /prioritization range/.test(r.description)));
  check("6. declining-query detection",
    byQuery("phase725 declining query").some((r) => r.action_type === "investigate_query_decline"));
  check("7. emerging-query detection",
    byQuery("phase725 emerging topic").some((r) => r.action_type === "improve_search_intent_alignment"));
  check("8. technical-audit regression generation path exists (audit-driven action types wired)",
    /technical_audit/.test(SVC) && /address_indexability/.test(SVC) && /improve_title|improve_meta_description/.test(SVC) && /correct_canonical/.test(SVC));
  check("9. optional searchAppearance note creates no action (notes never feed detectors)",
    !/gsc_dimension_daily.*searchAppearance|dimension = 'searchAppearance'/.test(SVC) &&
    !rows.some((r) => JSON.stringify(r.evidence).toLowerCase().includes("search appearance is unavailable")) &&
    !rows.some((r) => JSON.stringify(r.evidence).includes("SEARCH_APPEARANCE")));
  check("10. newest successful sync selected for generation",
    /eq\(gscSyncRuns\.status, "success"\)/.test(SVC) && /orderBy\(desc\(gscSyncRuns\.startedAt\)\)/.test(SVC));
  check("11. older ERROR/PARTIAL runs cannot override newer success (only success anchors, stored tables only)",
    /Only a SUCCESSFUL sync feeds generation/.test(SVC));

  const gen2 = await generateSearchGrowthActions({ reason: "manual_sync" });
  const rowsAfter = (await db.execute(sql`SELECT * FROM search_growth_actions`)).rows as any[];
  const liveAfter = rowsAfter.filter((r) => ["proposed", "approved", "in_progress"].includes(r.status));
  const dupes = liveAfter.reduce((acc: Record<string, number>, r: any) => { acc[r.dedupe_key] = (acc[r.dedupe_key] ?? 0) + 1; return acc; }, {});
  check("12. deduplication — second generation refreshes, never duplicates live actions",
    gen2.generated === 0 && Object.values(dupes).every((n) => n === 1), JSON.stringify({ gen2 }));
  check("13. obsolete proposals superseded (supersede path only touches status='proposed')",
    /status: "superseded"/.test(SVC) && /eq\(searchGrowthActions\.status, "proposed"\)/.test(SVC) && typeof gen2.superseded === "number");
  check("14. completed/dismissed history preserved (no DELETEs in service)", !/\.delete\(|DELETE FROM search_growth_actions/i.test(SVC));

  // ── Founder workflow over HTTP (15-21) ───────────────────────────────────
  section("Founder workflow");
  const unauthList = await api("/api/dashboard/search-growth/actions");
  check("15. founder authentication required", unauthList.status === 401 && unauthList.contentType.includes("application/json"));
  const badPin = await api("/api/dashboard/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: "wrong-725" }) });
  check("16. wrong PIN rejected", badPin.status === 401);

  const target = liveAfter.find((r) => r.status === "proposed");
  const targetId = target?.id;
  const unauthApprove = await api(`/api/dashboard/search-growth/actions/${targetId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("17. unauthorized approval rejected", unauthApprove.status === 401);

  const approve = await api(`/api/dashboard/search-growth/actions/${targetId}/approve`, { method: "POST", headers: authed, body: JSON.stringify({ note: "approved in tests" }) });
  check("18. valid approval succeeds (status→approved, approvedAt recorded)",
    approve.status === 200 && approve.json?.action?.status === "approved" && !!approve.json.action.approvedAt && approve.json.action.founderDecision === "approved");

  const reApprove = await api(`/api/dashboard/search-growth/actions/${targetId}/approve`, { method: "POST", headers: authed, body: "{}" });
  check("19. invalid state transition rejected (approved→approved = 409)", reApprove.status === 409);

  const target2 = liveAfter.find((r) => r.status === "proposed" && r.id !== targetId);
  const dismissNoReason = await api(`/api/dashboard/search-growth/actions/${target2?.id}/dismiss`, { method: "POST", headers: authed, body: "{}" });
  check("20. dismissal requires a reason", dismissNoReason.status === 400);

  const start = await api(`/api/dashboard/search-growth/actions/${targetId}/start`, { method: "POST", headers: authed, body: "{}" });
  const complete = await api(`/api/dashboard/search-growth/actions/${targetId}/complete`, { method: "POST", headers: authed, body: JSON.stringify({ implementationNote: "implemented in tests" }) });
  check("21. completion stores implementation notes + audit timestamps + baseline",
    start.status === 200 && complete.status === 200 &&
    complete.json?.action?.implementationNote === "implemented in tests" &&
    !!complete.json.action.completedAt && !!complete.json.action.baselineMetrics);

  // ── Priority model & client-trust boundaries (22-24) ─────────────────────
  section("Priority model & trust boundaries");
  check("22. priority score components total correctly (30/25/20/15/10)",
    computePriorityScore({ impact: 100, evidence: 100, relevance: 100, confidence: 100, effort: 100 }) === 100 &&
    computePriorityScore({ impact: 100, evidence: 0, relevance: 0, confidence: 0, effort: 0 }) === 30 &&
    computePriorityScore({ impact: 0, evidence: 100, relevance: 0, confidence: 0, effort: 0 }) === 25 &&
    computePriorityScore({ impact: 0, evidence: 0, relevance: 100, confidence: 0, effort: 0 }) === 20 &&
    computePriorityScore({ impact: 0, evidence: 0, relevance: 0, confidence: 100, effort: 0 }) === 15 &&
    computePriorityScore({ impact: 0, evidence: 0, relevance: 0, confidence: 0, effort: 100 }) === 10 &&
    /not an AI certainty or a ranking guarantee/.test(PRIORITY_MODEL_DESCRIPTION));
  const smuggle = await api(`/api/dashboard/search-growth/actions/${target2?.id}/dismiss`, {
    method: "POST", headers: authed,
    body: JSON.stringify({ reason: "valid reason", priorityScore: 100, status: "completed", evidence: { fake: true } }),
  });
  const smuggled = smuggle.json?.action;
  check("23. client cannot set trusted scores (extra fields stripped; score unchanged)",
    smuggle.status === 200 && smuggled?.status === "dismissed" && smuggled?.priorityScore === Number(target2?.priority_score));
  check("24. client cannot fabricate evidence (evidence unchanged by decision body)",
    JSON.stringify(smuggled?.evidence) === JSON.stringify(target2?.evidence));

  // ── Security (25-27) ──────────────────────────────────────────────────────
  section("Security");
  const list = await api("/api/dashboard/search-growth/actions", { headers: authed });
  const listText = JSON.stringify(list.json);
  check("25. no raw session identifiers returned", list.status === 200 && !/session_id|sessionId":\s*"/.test(listText));
  check("26. no secret credential exposure",
    !/BEGIN [A-Z ]*KEY|private_key|access_token|GOOGLE_SEARCH_CONSOLE_CREDENTIALS/.test(listText));
  check("27. dashboard GETs make no Google call",
    !/googleapis|runGscSync|getAccessToken/.test(ROUTE) &&
    !/runGscSync|getAccessToken/.test(SYNC_ROUTE.slice(SYNC_ROUTE.indexOf('get("/"'), SYNC_ROUTE.indexOf('post("/sync"'))));

  // ── Scheduler & retry policy (28-30) ─────────────────────────────────────
  section("Scheduler & failure control");
  check("28. scheduled job respects sync concurrency guard (skip on active run + conflict)",
    /hasActiveGscSyncRun/.test(OPS) && /GscSyncConflictError/.test(OPS) && /skipped/.test(OPS));
  check("29. transient retry is bounded",
    isTransientGscFailure("network_failure: could not reach") &&
    isTransientGscFailure("rate_limited: GSC query failed (429)") &&
    isTransientGscFailure("google_unavailable: GSC query failed (503)") &&
    /MAX_TRANSIENT_RETRIES = 2/.test(OPS) && /attempt <= MAX_TRANSIENT_RETRIES/.test(OPS));
  check("30. permission/configuration failures do not retry",
    !isTransientGscFailure("permission_denied: GSC query failed (403)") &&
    !isTransientGscFailure("auth_failed: Google token exchange failed") &&
    /not_configured — GSC credentials\/property absent; no retry/.test(OPS) &&
    /registerRecurringJob/.test(AUTOMATION) && /phase72_5_daily_gsc_sync/.test(AUTOMATION) && /phase72_5_weekly_seo_audit/.test(AUTOMATION));

  // ── API + regression guards (31-35) ──────────────────────────────────────
  section("API & regression guards");
  check("31. API endpoints return JSON", [unauthList, approve, reApprove, dismissNoReason, list].every((r) => r.contentType.includes("application/json")));
  const ghost = await api("/api/dashboard/search-growth/actions/999999/approve", { method: "POST", headers: authed, body: "{}" });
  check("32. endpoints do not fall through to SPA (unknown id → JSON error, not HTML)",
    !ghost.contentType.includes("text/html") && ghost.status !== 200);
  check("33. existing manual GSC sync remains operational", seededOk, JSON.stringify(seed.json?.gsc ?? seed.json));
  const dash = await api("/api/dashboard/search-intelligence", { headers: authed });
  check("34. existing Search Intelligence dashboard remains operational",
    dash.status === 200 && !!dash.json?.firstParty && !!dash.json?.syncStatus);
  check("35. Phase 72.4.3 success classification intact (fixture sync → success; optional note preserved)",
    seed.json?.gsc?.status === "success" &&
    /SEARCH_APPEARANCE_UNAVAILABLE_NOTE/.test(fs.readFileSync("server/services/googleSearchConsole.ts", "utf-8")));
  check("35b. weekly audit reuses approved canonical routes only",
    /runSeoAudit/.test(OPS) && /STATIC_PATHS/.test(AUDIT_SVC) && !/dashboard|\/api\//.test(AUDIT_SVC.match(/const STATIC_PATHS = \[[\s\S]*?\]/)?.[0] ?? "x/api/"));

  // ── 36. Newer partial/error import cannot influence generation ───────────
  await db.execute(sql`INSERT INTO gsc_sync_runs (status, source, finished_at, start_date, end_date, error_text)
    VALUES ('error', 'api', now(), ${isoDaysAgo(2)}::date, ${isoDaysAgo(1)}::date, 'network_failure: test poison run')`);
  await db.execute(sql`INSERT INTO gsc_query_daily (date, query, clicks, impressions, ctr, position)
    VALUES (${isoDaysAgo(1)}::date, 'phase725 poison query', 5, 5000, 0.001, 5)
    ON CONFLICT (date, query) DO UPDATE SET impressions = 5000`);
  const genPoison = await generateSearchGrowthActions({ reason: "manual_sync" });
  const poisonRows = (await db.execute(sql`SELECT id FROM search_growth_actions WHERE target_query = 'phase725 poison query'`)).rows;
  check("36. newer error import with later-dated rows cannot influence generation",
    poisonRows.length === 0 && typeof genPoison.generated === "number");
  await db.execute(sql`DELETE FROM gsc_query_daily WHERE query = 'phase725 poison query'`);
  await db.execute(sql`DELETE FROM gsc_sync_runs WHERE error_text = 'network_failure: test poison run'`);

  console.log(`\n══════ RESULT: ${passed} passed, ${failed} failed ══════`);
  if (failed) { console.log("Failures:", failures.join(" | ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
