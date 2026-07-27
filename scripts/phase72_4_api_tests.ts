// Phase 72.4 — Search Intelligence & Authority Platform API contract tests.
// Run with the dev server up:  npx tsx scripts/phase72_4_api_tests.ts
// Covers: happy paths, closed-vocabulary validation, caps, metadata 413,
// unknown-key stripping (incl. client dedupeKey squat attempts), server-side
// dedupe idempotency, cross-phase session joins (72.2 funnel / 72.3 revenue),
// anonymous-money integrity, dashboard auth, SPA-fallback guards, and
// 72.1/72.2/72.3 regression checks.

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:5000";
const PIN = process.env.DASHBOARD_PIN ?? "";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function postTo(path: string, body: unknown): Promise<{ status: number; json: any; contentType: string }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") ?? "";
  let json: any = null;
  try { json = await res.json(); } catch { /* SPA fallback returns HTML */ }
  return { status: res.status, json, contentType };
}

const post = (body: unknown) => postTo("/api/analytics/search", body);

async function getJson(path: string, pin?: string): Promise<{ status: number; json: any; contentType: string }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: pin ? { "x-dashboard-pin": pin } : {},
  });
  const contentType = res.headers.get("content-type") ?? "";
  let json: any = null;
  try { json = await res.json(); } catch { /* SPA fallback returns HTML */ }
  return { status: res.status, json, contentType };
}

const getSummary = () => getJson("/api/dashboard/analytics/search", PIN);

const SOURCES_VOCAB = [
  "google", "bing", "duckduckgo", "yahoo", "yandex", "other_search",
  "ai_assistant", "social", "email", "paid", "referral", "direct",
];

const inPctRange = (v: unknown) => v === null || (typeof v === "number" && v >= 0 && v <= 100);

async function main() {
  if (!PIN) {
    console.error("DASHBOARD_PIN env var is required");
    process.exit(1);
  }
  const run = Date.now().toString(36);
  const sessA = `sil-a-${run}`; // google landing + full content journey
  const sessB = `sil-b-${run}`; // ai_assistant landing
  const sessC = `sil-c-${run}`; // stripped-keys post
  const sessD = `sil-d-${run}`;
  const sessE = `sil-e-${run}`;
  const slugA = `blog/sil-test-${run}`;
  const campaign = `sil-camp-${run}`;

  console.log(`\nPhase 72.4 API tests against ${BASE} (run ${run})\n`);

  // ── 1. Happy paths ─────────────────────────────────────────────────────────
  console.log("Collection endpoint — happy paths:");
  let r = await post({
    event: "search_landing", trafficSource: "google", referrerHost: "www.google.com",
    landingPath: "/blog", page: "/blog", utmCampaign: campaign,
    sessionId: sessA, visitorId: `v-${sessA}`, device: "desktop", browser: "chrome",
  });
  check("google search_landing → 200 {ok:true}", r.status === 200 && r.json?.ok === true, `got ${r.status}`);
  check("collection responds JSON (no SPA fallback)", r.contentType.includes("application/json"), r.contentType);

  r = await post({
    event: "search_landing", trafficSource: "ai_assistant", referrerHost: "chatgpt.com",
    landingPath: "/", page: "/", sessionId: sessB, visitorId: `v-${sessB}`,
  });
  check("ai_assistant search_landing → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);

  r = await post({ event: "content_view", contentSlug: slugA, contentType: "blog", sessionId: sessA, visitorId: `v-${sessA}` });
  check("content_view → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);

  r = await post({ event: "content_read", contentSlug: slugA, contentType: "blog", readPercent: 64, dwellSeconds: 40, sessionId: sessA });
  check("content_read (64%) → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);

  r = await post({ event: "content_complete", contentSlug: slugA, contentType: "blog", readPercent: 97, dwellSeconds: 95, sessionId: sessA });
  check("content_complete (97%, 95s) → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);

  r = await post({ event: "content_share", contentSlug: slugA, contentType: "blog", shareChannel: "linkedin", sessionId: sessA });
  check("content_share → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);

  // ── 2. Closed-vocabulary + caps validation ────────────────────────────────
  console.log("\nValidation contract:");
  r = await post({ event: "search_landing", sessionId: `x-${run}` });
  check("search_landing without trafficSource → 400", r.status === 400, `got ${r.status}`);

  r = await post({ event: "made_up_event", sessionId: `x-${run}` });
  check("unknown event → 400", r.status === 400, `got ${r.status}`);

  r = await post({ event: "search_landing", trafficSource: "carrier_pigeon", sessionId: `x-${run}` });
  check("unknown trafficSource → 400", r.status === 400, `got ${r.status}`);

  r = await post({ event: "content_view", sessionId: `x-${run}` });
  check("content_view without contentSlug → 400", r.status === 400, `got ${r.status}`);

  r = await post({ event: "content_read", contentSlug: slugA, readPercent: 101, sessionId: `x-${run}` });
  check("readPercent 101 → 400", r.status === 400, `got ${r.status}`);

  r = await post({ event: "content_read", contentSlug: slugA, readPercent: -5, sessionId: `x-${run}` });
  check("readPercent -5 → 400", r.status === 400, `got ${r.status}`);

  r = await post({ event: "content_complete", contentSlug: slugA, readPercent: 95, dwellSeconds: 999999, sessionId: `x-${run}` });
  check("dwellSeconds 999999 (> 4h cap) → 400", r.status === 400, `got ${r.status}`);

  r = await post({ event: "search_landing", trafficSource: "google", utmSource: "s".repeat(301), sessionId: `x-${run}` });
  check("attribute > 300 chars → 400", r.status === 400, `got ${r.status}`);

  r = await post({ event: "search_landing", trafficSource: "google", landingPath: `/${"p".repeat(601)}`, sessionId: `x-${run}` });
  check("landingPath > 600 chars → 400", r.status === 400, `got ${r.status}`);

  r = await post({
    event: "content_view", contentSlug: slugA, contentType: "blog", sessionId: `x-${run}`,
    metadata: { blob: "m".repeat(3000) },
  });
  check("metadata > 2048 bytes → 413", r.status === 413, `got ${r.status}`);

  r = await post({
    event: "content_view", contentSlug: `blog/strip-${run}`, contentType: "blog", sessionId: sessC,
    dedupeKey: "sil:landing:hijack", isAdmin: true, authorityIndex: 100, amountCents: 999999,
  });
  check("unknown/forged keys (dedupeKey, authorityIndex…) stripped → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);

  // ── 3. Dashboard auth + summary shape ─────────────────────────────────────
  console.log("\nDashboard endpoint — auth + shape:");
  r = await getJson("/api/dashboard/analytics/search");
  check("summary without PIN → 401", r.status === 401, `got ${r.status}`);
  r = await getJson("/api/dashboard/analytics/search", "000000");
  check("summary with wrong PIN → 401", r.status === 401, `got ${r.status}`);

  const sumA = await getSummary();
  check("summary with PIN → 200 JSON", sumA.status === 200 && sumA.contentType.includes("application/json"), `got ${sumA.status} ${sumA.contentType}`);
  const s = sumA.json ?? {};
  check(
    "summary has full contract shape",
    !!s.kpis && Array.isArray(s.sources) && Array.isArray(s.topReferrerHosts) && Array.isArray(s.topLandingPaths) &&
    Array.isArray(s.topCampaigns) && Array.isArray(s.contentAuthority) && typeof s.authorityFormula === "string" &&
    Array.isArray(s.daily) && Array.isArray(s.weekly) && Array.isArray(s.monthly) &&
    !!s.footprint && !!s.diagnostics && typeof s.attributionNote === "string" && typeof s.generatedAt === "string",
    JSON.stringify(Object.keys(s)),
  );
  check(
    "sources = full closed 12-item vocabulary in fixed order",
    Array.isArray(s.sources) && s.sources.length === 12 && s.sources.every((x: any, i: number) => x.source === SOURCES_VOCAB[i]),
    JSON.stringify((s.sources ?? []).map((x: any) => x.source)),
  );
  const google = (s.sources ?? []).find((x: any) => x.source === "google");
  const ai = (s.sources ?? []).find((x: any) => x.source === "ai_assistant");
  check("google + ai_assistant sessions counted", (google?.sessions ?? 0) >= 1 && (ai?.sessions ?? 0) >= 1,
    `google=${google?.sessions}, ai=${ai?.sessions}`);
  check("topReferrerHosts includes posted host (lowercased)",
    (s.topReferrerHosts ?? []).some((h: any) => h.name === "www.google.com"), JSON.stringify(s.topReferrerHosts));
  check("topCampaigns includes test campaign",
    (s.topCampaigns ?? []).some((c: any) => c.name === campaign), JSON.stringify(s.topCampaigns));

  const authRow = (s.contentAuthority ?? []).find((c: any) => c.slug === slugA);
  check("contentAuthority includes test slug with full journey",
    !!authRow && authRow.views >= 1 && authRow.reads >= 1 && authRow.completes >= 1 && authRow.shares >= 1,
    JSON.stringify(authRow));
  check("authorityIndex within 0–100 for all rows",
    (s.contentAuthority ?? []).every((c: any) => c.authorityIndex >= 0 && c.authorityIndex <= 100));
  check("all percentage KPIs within 0–100 (or null)",
    [s.kpis?.organicSharePct, s.kpis?.aiSharePct, s.kpis?.contentCompletionRatePct, s.kpis?.searchToFunnelRatePct,
     s.kpis?.searchToRevenueRatePct, s.diagnostics?.funnelJoinCoveragePct, s.diagnostics?.revenueEventsWithSessionPct,
     ...(s.sources ?? []).map((x: any) => x.sharePct),
     ...(s.contentAuthority ?? []).map((c: any) => c.completionRatePct)].every(inPctRange));
  check("kpis.attributedSessions ≥ 2 and organic ≥ 1",
    s.kpis?.attributedSessions >= 2 && s.kpis?.organicSessions >= 1,
    `attributed=${s.kpis?.attributedSessions}, organic=${s.kpis?.organicSessions}`);
  check("avgReadPercent present and 0–100", inPctRange(s.kpis?.avgReadPercent) && s.kpis?.avgReadPercent !== null,
    String(s.kpis?.avgReadPercent));

  // ── 4. Server-side dedupe idempotency ─────────────────────────────────────
  console.log("\nServer-derived dedupe idempotency:");
  r = await post({
    event: "search_landing", trafficSource: "bing", referrerHost: "bing.com",
    landingPath: "/services", sessionId: sessA, visitorId: `v-${sessA}`,
  });
  check("duplicate landing (same session) still 200", r.status === 200, `got ${r.status}`);
  const sumB = await getSummary();
  check("duplicate landing does NOT add an attributed session",
    sumB.json?.kpis?.attributedSessions === s.kpis?.attributedSessions,
    `before=${s.kpis?.attributedSessions}, after=${sumB.json?.kpis?.attributedSessions}`);
  check("duplicate landing groups diagnostic stays 0",
    sumB.json?.diagnostics?.duplicateLandingGroups === 0,
    String(sumB.json?.diagnostics?.duplicateLandingGroups));

  await post({ event: "content_view", contentSlug: slugA, contentType: "blog", sessionId: sessA });
  const sumB2 = await getSummary();
  check("duplicate content_view (same session+slug) does NOT count",
    sumB2.json?.kpis?.contentViews === sumB.json?.kpis?.contentViews,
    `before=${sumB.json?.kpis?.contentViews}, after=${sumB2.json?.kpis?.contentViews}`);

  await post({ event: "content_view", contentSlug: `blog/squat1-${run}`, contentType: "blog", sessionId: sessD, dedupeKey: "sil:squat:shared" });
  await post({ event: "content_view", contentSlug: `blog/squat2-${run}`, contentType: "blog", sessionId: sessE, dedupeKey: "sil:squat:shared" });
  const sumC = await getSummary();
  check("client dedupeKey ignored — both distinct views insert",
    sumC.json?.kpis?.contentViews === (sumB2.json?.kpis?.contentViews ?? 0) + 2,
    `before=${sumB2.json?.kpis?.contentViews}, after=${sumC.json?.kpis?.contentViews}`);

  // Empty/whitespace session ids must be anonymous (architect finding): never
  // joinable, never attributed, and never merged into one shared session.
  await post({ event: "search_landing", trafficSource: "direct", sessionId: "", page: "/" });
  await post({ event: "search_landing", trafficSource: "direct", sessionId: "   ", page: "/" });
  const sumC2 = await getSummary();
  check("empty-string sessions are NOT attributed sessions",
    sumC2.json?.kpis?.attributedSessions === sumC.json?.kpis?.attributedSessions,
    `before=${sumC.json?.kpis?.attributedSessions}, after=${sumC2.json?.kpis?.attributedSessions}`);
  check("empty-string landings counted as anonymous (+2)",
    (sumC2.json?.diagnostics?.landingsWithoutSession ?? 0) >= (sumC.json?.diagnostics?.landingsWithoutSession ?? 0) + 2,
    `before=${sumC.json?.diagnostics?.landingsWithoutSession}, after=${sumC2.json?.diagnostics?.landingsWithoutSession}`);
  check("empty sessions never form duplicate landing groups",
    sumC2.json?.diagnostics?.duplicateLandingGroups === 0,
    String(sumC2.json?.diagnostics?.duplicateLandingGroups));
  await post({ event: "content_view", contentSlug: `blog/anon-${run}`, contentType: "blog", sessionId: "" });
  await post({ event: "content_view", contentSlug: `blog/anon-${run}`, contentType: "blog", sessionId: "" });
  const sumC3 = await getSummary();
  check("empty-session content views each count (no false shared dedupe)",
    sumC3.json?.kpis?.contentViews === (sumC2.json?.kpis?.contentViews ?? 0) + 2,
    `before=${sumC2.json?.kpis?.contentViews}, after=${sumC3.json?.kpis?.contentViews}`);

  // ── 5. Cross-phase session joins (72.2 funnel, 72.3 revenue) ──────────────
  console.log("\nCross-phase session joins:");
  r = await postTo("/api/analytics/funnel", {
    event: "strategy_page_view", sessionId: sessA, visitorId: `v-${sessA}`, page: "/services",
  });
  check("72.2 funnel event for same session accepted", r.status === 200, `got ${r.status}`);
  const sumD = await getSummary();
  check("searchToFunnelSessions joins by session id (≥1)",
    (sumD.json?.kpis?.searchToFunnelSessions ?? 0) >= 1, String(sumD.json?.kpis?.searchToFunnelSessions));
  const googleD = (sumD.json?.sources ?? []).find((x: any) => x.source === "google");
  check("google source row shows funnel join", (googleD?.funnelSessions ?? 0) >= 1, JSON.stringify(googleD));

  r = await postTo("/api/analytics/revenue", {
    event: "affiliate_click", revenueSource: "affiliate", sessionId: sessA, visitorId: `v-${sessA}`,
    page: "/services", amountCents: 999999, // anonymous money must be zeroed by 72.3 contract
  });
  check("72.3 revenue event for same session accepted", r.status === 200, `got ${r.status}`);
  const sumE = await getSummary();
  check("searchToRevenueSessions joins by session id (≥1)",
    (sumE.json?.kpis?.searchToRevenueSessions ?? 0) >= 1, String(sumE.json?.kpis?.searchToRevenueSessions));
  check("anonymous revenue claim cannot inflate attributedRevenueCents",
    sumE.json?.kpis?.attributedRevenueCents === sumD.json?.kpis?.attributedRevenueCents,
    `before=${sumD.json?.kpis?.attributedRevenueCents}, after=${sumE.json?.kpis?.attributedRevenueCents}`);

  // ── 6. SPA-fallback guard on unregistered API paths ───────────────────────
  console.log("\nRouting integrity:");
  const ghost = await getJson("/api/analytics/search-summary-nonexistent", PIN);
  check("unregistered /api path does not masquerade as JSON success",
    !(ghost.status === 200 && ghost.contentType.includes("application/json")),
    `got ${ghost.status} ${ghost.contentType}`);

  // ── 7. Certified 72.1 / 72.2 / 72.3 regression guards ─────────────────────
  console.log("\nCertified-phase regression guards:");
  const home = await getJson("/api/dashboard/analytics/homepage/summary", PIN);
  check("72.1 homepage summary still 200 JSON",
    home.status === 200 && home.contentType.includes("application/json") && !!home.json,
    `got ${home.status}`);
  const funnel = await getJson("/api/dashboard/analytics/funnel", PIN);
  check("72.2 funnel summary still 200 with 7 normalized stages",
    funnel.status === 200 && Array.isArray(funnel.json?.normalizedStages) && funnel.json.normalizedStages.length === 7,
    `got ${funnel.status}, stages=${funnel.json?.normalizedStages?.length}`);
  const revenue = await getJson("/api/dashboard/analytics/revenue", PIN);
  check("72.3 revenue summary still 200 with kpis",
    revenue.status === 200 && !!revenue.json?.kpis && Array.isArray(revenue.json?.bySource),
    `got ${revenue.status}`);

  // ── Results ────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Phase 72.4 API tests: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
