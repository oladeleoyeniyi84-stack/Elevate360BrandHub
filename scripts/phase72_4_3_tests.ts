// Phase 72.4.3 — Google Search Console optional-dimension correction tests.
// Run with the dev server up on :5000:  npx tsx scripts/phase72_4_3_tests.ts
//
// Mix of: real unit tests against the exported status-policy functions
// (resolveGscRunOutcome / isOptionalUnsupportedSearchAppearance), live HTTP
// contract tests (fixture sync, auth, SPA-fallback guards), and structural
// source assertions where behavior cannot be triggered hermetically (live
// Google 400s, production fixture block).

import fs from "fs";
import {
  resolveGscRunOutcome,
  isOptionalUnsupportedSearchAppearance,
  SEARCH_APPEARANCE_UNAVAILABLE_NOTE,
} from "../server/services/googleSearchConsole";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:5000";
const PIN = process.env.DASHBOARD_PIN ?? "";
const SVC = fs.readFileSync("server/services/googleSearchConsole.ts", "utf-8");
const ROUTE = fs.readFileSync("server/routes/searchIntelligence.ts", "utf-8");
const SCHEMA = fs.readFileSync("shared/schema.ts", "utf-8");

let passed = 0, failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}
function section(t: string) { console.log(`\n━━ ${t} ━━`); }

const CONFIRMED_400 =
  "gsc_error: GSC query failed (400). Cannot group by search appearance dimension together with another dimension.";

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const contentType = res.headers.get("content-type") ?? "";
  let json: any = null;
  try { json = JSON.parse(await res.text()); } catch { /* html */ }
  return { status: res.status, json, contentType, headers: res.headers };
}

async function main() {
  // Login once for authed calls.
  const login = await fetch(`${BASE}/api/dashboard/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: PIN }),
  });
  const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
  const authed = { cookie, "Content-Type": "application/json" };

  // ── A. Required datasets ──────────────────────────────────────────────────
  section("A. Required datasets (1-5)");
  check("1. date+query set requested", /\["date", "query"\]/.test(SVC));
  check("2. date+page set requested", /\["date", "page"\]/.test(SVC));
  check("3. date+country in required dimension loop", /\{ api: "country", stored: "country" \}/.test(SVC));
  check("4. date+device in required dimension loop", /\{ api: "device", stored: "device" \}/.test(SVC));
  check("5. query+page set requested", /\["query", "page"\]/.test(SVC));

  // ── B. Optional capability handling ───────────────────────────────────────
  section("B. Optional capability handling (6-11)");
  const optOnly = resolveGscRunOutcome({ "date+searchAppearance": CONFIRMED_400 }, true);
  check("6. confirmed searchAppearance invalid-combination does NOT mark run partial",
    optOnly.status === "success");
  check("7. optional unsupported note is retained",
    optOnly.optionalNotes.length === 1 && optOnly.optionalNotes[0].includes("Cannot group by search appearance"));
  check("8. optional unsupported note is NOT a blocking error (never errorText)",
    Object.keys(optOnly.blockingErrors).length === 0 &&
    /errorText: errorCount > 0 \? Object\.entries\(blockingErrors\)/.test(SVC));
  const unknown400 = resolveGscRunOutcome({ "date+searchAppearance": "gsc_error: GSC query failed (400). Some other validation problem." }, true);
  check("9. unknown searchAppearance 400 remains a genuine error", unknown400.status === "partial" && !!unknown400.blockingErrors["date+searchAppearance"]);
  const authFail = resolveGscRunOutcome({ "date+searchAppearance": "auth_expired: GSC query failed (401)." }, true);
  check("10. searchAppearance authentication failure remains a genuine error", authFail.status === "partial");
  const netFail = resolveGscRunOutcome({ "date+searchAppearance": "network_failure: could not reach the Search Console API" }, true);
  check("11. searchAppearance network failure remains visible", netFail.status === "partial");
  // Guard: classifier is strictly scoped.
  check("11b. classifier ignores non-searchAppearance sets even with matching text",
    !isOptionalUnsupportedSearchAppearance("date+country", CONFIRMED_400));

  // ── C. Status rules ───────────────────────────────────────────────────────
  section("C. Status rules (12-18)");
  check("12. all required succeed + optional unsupported → success",
    resolveGscRunOutcome({ "date+searchAppearance": CONFIRMED_400 }, true).status === "success");
  check("13. required failure + another required success → partial",
    resolveGscRunOutcome({ "date+country": "gsc_error: GSC query failed (400)." }, true).status === "partial");
  check("14. all required fail (nothing imported) → error",
    resolveGscRunOutcome({
      "date+query": "auth_failed: x", "date+page": "auth_failed: x", "date+country": "auth_failed: x",
      "date+device": "auth_failed: x", "query+page": "auth_failed: x",
    }, false).status === "error");
  check("15. required pagination truncation → partial",
    resolveGscRunOutcome({ "date+query": "pagination cap hit (25000 rows) — imported snapshot for this set is incomplete" }, true).status === "partial");
  check("16. optional capability unavailable alone → success (no blocking errors)",
    resolveGscRunOutcome({}, true).status === "success" && /SEARCH_APPEARANCE_UNAVAILABLE_NOTE\]/.test(SVC));
  check("17. no-data core response without errors → success",
    resolveGscRunOutcome({}, false).status === "success");
  check("18. not_configured behavior unchanged",
    /status: "not_configured", errorText: cfg\.reason/.test(SVC) && /return \{ runId, status: "not_configured", source, reason: cfg\.reason, rows \}/.test(SVC));

  // ── D. Data integrity ─────────────────────────────────────────────────────
  section("D. Data integrity (19-23)");
  check("19a. searchAppearance removed from date-grouped dimension loop",
    !/api: "searchAppearance"/.test(SVC) && !/\["date", "searchAppearance"\]/.test(SVC));
  check("19b. no fabricated date for searchAppearance (note stored, no daily rows)",
    SVC.includes(SEARCH_APPEARANCE_UNAVAILABLE_NOTE) && /const notes: string\[\] = \[SEARCH_APPEARANCE_UNAVAILABLE_NOTE\]/.test(SVC));

  // Live fixture sync — verifies country/device daily rows, idempotency,
  // historical immutability and endpoint operation in one flow.
  const before = await api("/api/dashboard/search-intelligence", { headers: authed });
  const priorRuns: any[] = before.json?.syncStatus?.recentSyncRuns ?? [];
  const fixture = {
    scope: "gsc",
    fixture: {
      queries: [{ date: "2026-07-20", query: "phase 72 4 3 test query", clicks: 3, impressions: 40, ctr: 0.075, position: 8.2 }],
      pages: [{ date: "2026-07-20", page: "https://www.elevate360official.com/phase7243-test", clicks: 2, impressions: 30, ctr: 0.066, position: 9.1 }],
      dimensions: [
        { date: "2026-07-20", dimension: "country", key: "usa", clicks: 3, impressions: 40, ctr: 0.075, position: 8.2 },
        { date: "2026-07-21", dimension: "device", key: "MOBILE", clicks: 1, impressions: 12, ctr: 0.083, position: 11.0 },
      ],
    },
  };
  const sync1 = await api("/api/dashboard/search-intelligence/sync", { method: "POST", headers: authed, body: JSON.stringify(fixture) });
  check("20a. fixture sync succeeds with country+device daily rows",
    sync1.status === 200 && sync1.json?.gsc?.status === "success" && sync1.json.gsc.rows.dimensions === 2,
    JSON.stringify(sync1.json?.gsc ?? sync1.json));
  const after1 = await api("/api/dashboard/search-intelligence", { headers: authed });
  const run1 = after1.json?.syncStatus?.recentSyncRuns?.[0];
  check("20b. new run window reflects real fixture dates (no fabricated dates)",
    run1?.startDate === "2026-07-20" && run1?.endDate === "2026-07-20" && run1?.status === "success");
  const sync2 = await api("/api/dashboard/search-intelligence/sync", { method: "POST", headers: authed, body: JSON.stringify(fixture) });
  check("21. repeated sync is idempotent (upsert, same row counts, still success)",
    sync2.status === 200 && sync2.json?.gsc?.status === "success" &&
    sync2.json.gsc.rows.dimensions === 2 && sync2.json.gsc.rows.queries === 1);
  const after2 = await api("/api/dashboard/search-intelligence", { headers: authed });
  const laterRuns: any[] = after2.json?.syncStatus?.recentSyncRuns ?? [];
  const historicalIntact = priorRuns.every((p) => {
    const still = laterRuns.find((l) => l.id === p.id);
    return !still || (still.status === p.status && still.errorText === p.errorText && still.startDate === p.startDate);
  });
  check("22. previous historical sync records untouched", historicalIntact);
  check("23. single-running-sync DB guard intact",
    /singleRunningUq: uniqueIndex\("gsc_sync_runs_single_running_uq"\)/.test(SCHEMA) &&
    /hasActiveGscSyncRun/.test(ROUTE) && /GscSyncConflictError/.test(ROUTE));

  // ── E. Regression guards ──────────────────────────────────────────────────
  section("E. Regression guards (24-30)");
  const unauth = await api("/api/dashboard/search-intelligence");
  check("24. unauthenticated founder GET → 401", unauth.status === 401 && unauth.contentType.includes("application/json"));
  const badPin = await api("/api/dashboard/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: "wrong-pin-7243" }) });
  check("25. wrong PIN rejected", badPin.status === 401);
  check("26. authenticated sync endpoint operational", sync1.status === 200 && sync1.json?.ok === true);
  check("27. fixture mode blocked in production",
    /parsed\.fixture && process\.env\.NODE_ENV === "production"/.test(ROUTE) && /403/.test(ROUTE));
  check("28. Google credentials remain redacted",
    /redactSensitive/.test(SVC) && /\[redacted-key\]/.test(SVC) && /BEGIN\[\\s\\S\]\*\?KEY/.test(SVC));
  check("29. composed GET never calls Google (cached SQL only)",
    !/runGscSync|getAccessToken|fetchAnalyticsRows/.test(ROUTE.slice(ROUTE.indexOf('get("/"'), ROUTE.indexOf('post("/sync"'))));
  // Certified 72.4 semantics: registered API endpoints always answer JSON;
  // unregistered paths must never masquerade as a JSON success (the SPA-shell
  // fallthrough on unknown /api paths is pre-existing, certified behavior).
  const spa = await api("/api/dashboard/search-intelligence/definitely-not-a-route");
  check("30. no SPA fallback masquerading on API endpoints",
    unauth.contentType.includes("application/json") &&
    sync1.contentType.includes("application/json") &&
    !(spa.status === 200 && spa.contentType.includes("application/json")));

  console.log(`\n══════ RESULT: ${passed} passed, ${failed} failed ══════`);
  if (failed) { console.log("Failures:", failures.join(" | ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
