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

  // ═══ Phase 72.4R — Search Console, SEO audits, Core Web Vitals, organic
  // revenue attribution, and the composed dashboard payload. ═════════════════
  // NOTE: this section issues exactly 6 authenticated POSTs to /sync — the
  // founder rate limit is 6 per 5 minutes, so re-running the suite twice
  // within 5 minutes will 429 on the sync checks (expected, not a bug).

  const postAuthed = async (path: string, body: unknown) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-dashboard-pin": PIN },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get("content-type") ?? "";
    let json: any = null;
    try { json = await res.json(); } catch { /* SPA fallback returns HTML */ }
    return { status: res.status, json, contentType };
  };
  const getComposed = () => getJson("/api/dashboard/search-intelligence", PIN);
  const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  // ── 8. Core Web Vitals RUM ingestion ──────────────────────────────────────
  console.log("\n72.4R — Core Web Vitals ingestion:");
  const cwvSess = `cwv-${run}`;
  r = await postTo("/api/analytics/web-vitals", { metric: "lcp", value: 2100, page: "/", sessionId: cwvSess, device: "desktop" });
  check("web-vitals lcp 2100 → 200 {ok:true}", r.status === 200 && r.json?.ok === true, `got ${r.status}`);
  check("web-vitals responds JSON (no SPA fallback)", r.contentType.includes("application/json"), r.contentType);
  r = await postTo("/api/analytics/web-vitals", { metric: "inp", value: 600, page: "/", sessionId: cwvSess, device: "desktop" });
  check("web-vitals inp 600 (fail-range) → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);
  r = await postTo("/api/analytics/web-vitals", { metric: "cls", value: 0.04, page: "/", sessionId: cwvSess, device: "desktop" });
  check("web-vitals cls 0.04 → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);
  r = await postTo("/api/analytics/web-vitals", { metric: "cls", value: 0.2, sessionId: cwvSess, source: "lighthouse_lab", rating: "pass" });
  check("forged source/rating keys stripped → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);
  r = await postTo("/api/analytics/web-vitals", { metric: "fid", value: 100, sessionId: cwvSess });
  check("unknown metric 'fid' → 400", r.status === 400, `got ${r.status}`);
  r = await postTo("/api/analytics/web-vitals", { metric: "lcp", value: 10_000_000, sessionId: cwvSess });
  check("lcp over plausibility cap → 400", r.status === 400, `got ${r.status}`);
  r = await postTo("/api/analytics/web-vitals", { metric: "cls", value: -0.5, sessionId: cwvSess });
  check("negative value → 400", r.status === 400, `got ${r.status}`);
  r = await postTo("/api/analytics/web-vitals", { metric: "lcp", sessionId: cwvSess });
  check("missing value → 400", r.status === 400, `got ${r.status}`);

  // ── 9. Composed dashboard payload — auth, shape, first-party parity ───────
  console.log("\n72.4R — composed dashboard payload:");
  r = await getJson("/api/dashboard/search-intelligence");
  check("composed GET without PIN → 401", r.status === 401, `got ${r.status}`);
  r = await getJson("/api/dashboard/search-intelligence", "000000");
  check("composed GET with wrong PIN → 401", r.status === 401, `got ${r.status}`);

  const comp1 = await getComposed();
  check("composed GET with PIN → 200 JSON", comp1.status === 200 && comp1.contentType.includes("application/json"), `got ${comp1.status} ${comp1.contentType}`);
  const p1 = comp1.json ?? {};
  check(
    "composed payload has full contract shape",
    !!p1.firstParty?.kpis && !!p1.searchConsole && "gscTotals" in p1 && "queries" in p1 && "landingPages" in p1 &&
    "structuredData" in p1 && "metadata" in p1 && "indexability" in p1 && !!p1.webVitals && !!p1.organicRevenue &&
    Array.isArray(p1.recommendations) && !!p1.syncStatus && Array.isArray(p1.syncStatus.recentSyncRuns) &&
    Array.isArray(p1.syncStatus.recentAuditRuns) && typeof p1.generatedAt === "string",
    JSON.stringify(Object.keys(p1)),
  );
  const legacy = await getSummary();
  check("legacy 72.4 summary endpoint still 200 (backward compat)", legacy.status === 200 && !!legacy.json?.kpis, `got ${legacy.status}`);
  check("firstParty parity with legacy endpoint (sessions/revenue/views)",
    p1.firstParty?.kpis?.attributedSessions === legacy.json?.kpis?.attributedSessions &&
    p1.firstParty?.kpis?.attributedRevenueCents === legacy.json?.kpis?.attributedRevenueCents &&
    p1.firstParty?.kpis?.contentViews === legacy.json?.kpis?.contentViews,
    `composed=${p1.firstParty?.kpis?.attributedSessions}/${p1.firstParty?.kpis?.attributedRevenueCents}, legacy=${legacy.json?.kpis?.attributedSessions}/${legacy.json?.kpis?.attributedRevenueCents}`);
  check("searchConsole is typed not_configured (no creds in dev)",
    p1.searchConsole?.configured === false && typeof p1.searchConsole?.reason === "string" &&
    p1.searchConsole.reason.includes("GOOGLE_SEARCH_CONSOLE_CREDENTIALS"),
    JSON.stringify(p1.searchConsole?.reason));
  check("gsc sections null (not fake zeros) while unconfigured and empty",
    p1.searchConsole?.totalQueryRows > 0 || (p1.queries === null || typeof p1.queries === "object"), "shape check");
  const lcpRow = (p1.webVitals?.metrics ?? []).find((m: any) => m.metric === "lcp");
  check("web vitals summary has lcp row labeled rum_field",
    !!lcpRow && lcpRow.source === "rum_field" && lcpRow.samples >= 1, JSON.stringify(lcpRow));
  check("no web-vitals row carries a synthetic label (source not client-settable)",
    (p1.webVitals?.metrics ?? []).every((m: any) => m.source !== "lighthouse_lab"), JSON.stringify(p1.webVitals?.metrics?.map((m: any) => m.source)));
  check("web-vitals ratings within closed vocab",
    (p1.webVitals?.metrics ?? []).every((m: any) => [null, "pass", "needs_improvement", "fail"].includes(m.rating)));
  check("webVitals.fieldDataAvailable true after RUM posts", p1.webVitals?.fieldDataAvailable === true, String(p1.webVitals?.fieldDataAvailable));

  // ── 10. Sync contract — auth, typed not_configured, fixture idempotency ───
  console.log("\n72.4R — sync contract + GSC fixture:");
  // Organic session that will join to fixture landing pages + revenue below.
  const sessOR = `sil-or-${run}`;
  await post({
    event: "search_landing", trafficSource: "google", referrerHost: "www.google.com",
    landingPath: "/services", page: "/services", sessionId: sessOR, visitorId: `v-${sessOR}`,
  });
  r = await postAuthed("/api/analytics/revenue", {
    event: "affiliate_conversion", revenueSource: "affiliate", sessionId: sessOR,
    visitorId: `v-${sessOR}`, page: "/services", amountCents: 4321,
  });
  check("authed revenue event (trusted amount) for organic session → 200", r.status === 200 && r.json?.ok === true, `got ${r.status}`);

  r = await postTo("/api/dashboard/search-intelligence/sync", { scope: "gsc" });
  check("sync without PIN → 401", r.status === 401, `got ${r.status}`);

  r = await postAuthed("/api/dashboard/search-intelligence/sync", { scope: "gsc" });
  check("sync scope=gsc without creds → 200 typed not_configured (never a 500)",
    r.status === 200 && r.json?.gsc?.status === "not_configured", `got ${r.status} ${JSON.stringify(r.json?.gsc?.status)}`);

  const SITE = "https://elevate360official.com";
  const q1 = `elevate360 coaching ${run}`;
  const q2 = `elevate360 nearp1 ${run}`;
  const q3 = `elevate360 lowctr ${run}`;
  const fixture = {
    queries: [
      { date: isoDaysAgo(3), query: q1, clicks: 10, impressions: 200, ctr: 0.05, position: 8.4 },
      { date: isoDaysAgo(4), query: q1, clicks: 6, impressions: 100, ctr: 0.06, position: 9.1 },
      { date: isoDaysAgo(3), query: q2, clicks: 2, impressions: 80, ctr: 0.025, position: 11.5 },
      { date: isoDaysAgo(3), query: q3, clicks: 2, impressions: 400, ctr: 0.005, position: 22.0 },
    ],
    pages: [
      { date: isoDaysAgo(3), page: `${SITE}/services`, clicks: 8, impressions: 150, ctr: 0.053, position: 7.8 },
      { date: isoDaysAgo(4), page: `${SITE}/blog`, clicks: 3, impressions: 90, ctr: 0.033, position: 12.2 },
    ],
    dimensions: [
      { date: isoDaysAgo(3), dimension: "device", key: "MOBILE", clicks: 12, impressions: 300, ctr: 0.04, position: 9.9 },
    ],
    queryPages: [
      { query: q1, page: `${SITE}/services`, clicks: 9, impressions: 180 },
    ],
  };
  r = await postAuthed("/api/dashboard/search-intelligence/sync", { scope: "gsc", fixture });
  check("fixture sync #1 → 200 success with exact row counts",
    r.status === 200 && r.json?.gsc?.status === "success" && r.json?.gsc?.source === "fixture" &&
    r.json?.gsc?.rows?.queries === 4 && r.json?.gsc?.rows?.pages === 2 &&
    r.json?.gsc?.rows?.dimensions === 1 && r.json?.gsc?.rows?.queryPages === 1,
    `got ${r.status} ${JSON.stringify(r.json?.gsc)}`);

  const comp2 = (await getComposed()).json ?? {};
  check("searchConsole shows stored rows after fixture import",
    (comp2.searchConsole?.totalQueryRows ?? 0) >= 4 && typeof comp2.searchConsole?.dataThrough === "string",
    JSON.stringify({ rows: comp2.searchConsole?.totalQueryRows, through: comp2.searchConsole?.dataThrough }));
  check("gscTotals present with clicks aggregated", (comp2.gscTotals?.current?.clicks ?? 0) >= 20,
    JSON.stringify(comp2.gscTotals?.current));
  const q1Row = (comp2.queries?.topQueries ?? []).find((x: any) => x.query === q1);
  check("query aggregation exact across dates (16 clicks / 300 impressions)",
    !!q1Row && q1Row.clicks === 16 && q1Row.impressions === 300, JSON.stringify(q1Row));
  check("near-page-one bucket catches position 11.5 query",
    (comp2.queries?.nearPageOne ?? []).some((x: any) => x.query === q2), JSON.stringify(comp2.queries?.nearPageOne?.map((x: any) => x.query)));
  check("low-CTR bucket catches 0.5% CTR on 400 impressions",
    (comp2.queries?.lowCtrHighImpressions ?? []).some((x: any) => x.query === q3), JSON.stringify(comp2.queries?.lowCtrHighImpressions?.map((x: any) => x.query)));
  check("query↔page join surfaces top page for query",
    !!q1Row && (q1Row.topPages ?? []).some((pg: string) => pg.includes("/services")), JSON.stringify(q1Row?.topPages));
  const lpRow = (comp2.landingPages?.items ?? []).find((x: any) => x.path?.includes("/services"));
  check("landing-page intelligence has /services with GSC clicks",
    !!lpRow && lpRow.clicks >= 8, JSON.stringify(lpRow));
  check("landing page joins first-party organic visitors (session landed /services)",
    !!lpRow && lpRow.organicVisitors >= 1, JSON.stringify({ visitors: lpRow?.organicVisitors }));

  r = await postAuthed("/api/dashboard/search-intelligence/sync", { scope: "gsc", fixture });
  check("fixture sync #2 (identical) → 200 success", r.status === 200 && r.json?.gsc?.status === "success", `got ${r.status}`);
  const comp3 = (await getComposed()).json ?? {};
  check("re-import is idempotent — stored row count unchanged",
    comp3.searchConsole?.totalQueryRows === comp2.searchConsole?.totalQueryRows,
    `before=${comp2.searchConsole?.totalQueryRows}, after=${comp3.searchConsole?.totalQueryRows}`);
  check("re-import is idempotent — window totals unchanged",
    comp3.gscTotals?.current?.clicks === comp2.gscTotals?.current?.clicks &&
    comp3.gscTotals?.current?.impressions === comp2.gscTotals?.current?.impressions,
    `before=${JSON.stringify(comp2.gscTotals?.current)}, after=${JSON.stringify(comp3.gscTotals?.current)}`);
  const q1Row3 = (comp3.queries?.topQueries ?? []).find((x: any) => x.query === q1);
  check("re-import is idempotent — per-query metrics unchanged",
    !!q1Row3 && q1Row3.clicks === 16 && q1Row3.impressions === 300, JSON.stringify(q1Row3));

  r = await postAuthed("/api/dashboard/search-intelligence/sync", { scope: "gsc", days: 500 });
  check("sync days=500 (max 90) → 400", r.status === 400, `got ${r.status}`);
  r = await postAuthed("/api/dashboard/search-intelligence/sync", { scope: "bogus" });
  check("sync unknown scope → 400", r.status === 400, `got ${r.status}`);

  // ── 11. SEO audit — real self-fetch of server-delivered HTML ──────────────
  console.log("\n72.4R — SEO audit run (live self-fetch, may take a moment):");
  r = await postAuthed("/api/dashboard/search-intelligence/sync", { scope: "audits" });
  check("audit run → 200 success/partial", r.status === 200 && ["success", "partial"].includes(r.json?.audits?.status), `got ${r.status} ${JSON.stringify(r.json?.audits)}`);
  check("audit covered core pages (≥10)", (r.json?.audits?.pagesAudited ?? 0) >= 10, String(r.json?.audits?.pagesAudited));

  const comp4 = (await getComposed()).json ?? {};
  check("metadata audit stored (pages ≥10)", (comp4.metadata?.pagesAudited ?? 0) >= 10, String(comp4.metadata?.pagesAudited));
  check("metadata note discloses server-delivered-HTML scope",
    typeof comp4.metadata?.note === "string" && comp4.metadata.note.toLowerCase().includes("server"), JSON.stringify(comp4.metadata?.note));
  check("dev SPA duplicate titles honestly reported (expected finding)",
    (comp4.metadata?.duplicateTitles?.length ?? 0) >= 1, String(comp4.metadata?.duplicateTitles?.length));
  check("structured-data coverage includes Organization expectation",
    (comp4.structuredData?.coverage ?? []).some((c: any) => c.schemaType === "Organization" && c.expectedPages >= 1),
    JSON.stringify(comp4.structuredData?.coverage?.map((c: any) => c.schemaType)));
  check("indexability audit stored with robots/sitemap booleans",
    typeof comp4.indexability?.robotsTxtOk === "boolean" && typeof comp4.indexability?.sitemapOk === "boolean",
    JSON.stringify({ robots: comp4.indexability?.robotsTxtOk, sitemap: comp4.indexability?.sitemapOk }));
  check("syncStatus.lastAuditRun recorded", !!comp4.syncStatus?.lastAuditRun && (comp4.syncStatus.lastAuditRun.pagesAudited ?? 0) >= 10,
    JSON.stringify(comp4.syncStatus?.lastAuditRun));
  check("recent sync runs recorded (not_configured + 2 fixture imports)",
    (comp4.syncStatus?.recentSyncRuns?.length ?? 0) >= 3, String(comp4.syncStatus?.recentSyncRuns?.length));
  check("recommendations generated (≥1, ≤20 cap)",
    (comp4.recommendations?.length ?? 0) >= 1 && (comp4.recommendations?.length ?? 0) <= 20, String(comp4.recommendations?.length));
  check("recommendation severities within closed vocab",
    (comp4.recommendations ?? []).every((x: any) => ["critical", "high", "medium", "low"].includes(x.severity)),
    JSON.stringify(comp4.recommendations?.map((x: any) => x.severity)));
  check("GSC-not-connected recommendation present while unconfigured",
    (comp4.recommendations ?? []).some((x: any) => x.title?.toLowerCase().includes("search console")),
    JSON.stringify(comp4.recommendations?.map((x: any) => x.title)));

  // ── 12. Organic revenue attribution ───────────────────────────────────────
  console.log("\n72.4R — organic revenue attribution:");
  const orv = comp4.organicRevenue ?? {};
  check("organic sessions counted (google landings)", (orv.organicSessions ?? 0) >= 1, String(orv.organicSessions));
  check("trusted revenue joined to organic session (≥ $43.21)",
    (orv.organicRevenueCents ?? 0) >= 4321, String(orv.organicRevenueCents));
  const orvPage = (orv.byLandingPage ?? []).find((x: any) => x.path?.includes("/services"));
  check("revenue attributed to /services landing page",
    !!orvPage && orvPage.revenueCents >= 4321, JSON.stringify(orvPage));
  check("aiAssisted fields present and numeric",
    typeof orv.aiAssistedConversions === "number" && typeof orv.aiAssistedRevenueCents === "number",
    JSON.stringify({ conv: orv.aiAssistedConversions, cents: orv.aiAssistedRevenueCents }));
  check("organic attribution note documents methodology",
    typeof orv.attributionNote === "string" && orv.attributionNote.length > 20, JSON.stringify(orv.attributionNote));

  // ── 13. Routing integrity for 72.4R paths ─────────────────────────────────
  console.log("\n72.4R — routing integrity:");
  const ghost2 = await getJson("/api/dashboard/search-intelligence-nonexistent", PIN);
  check("unregistered 72.4R-adjacent /api path does not fake JSON success",
    !(ghost2.status === 200 && ghost2.contentType.includes("application/json")),
    `got ${ghost2.status} ${ghost2.contentType}`);

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
