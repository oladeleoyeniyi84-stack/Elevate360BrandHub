// Phase 72.3 — Revenue Intelligence API contract tests.
// Run: npx tsx scripts/phase72_3_api_tests.ts
// Requires a running server (npm run dev) and DASHBOARD_PIN in the environment.
// BASE_URL overridable for prod verification (e.g. BASE_URL=http://localhost:10000).

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5000";
const PIN = process.env.DASHBOARD_PIN;

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function getSummary(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/dashboard/analytics/revenue`, {
    headers: { "x-dashboard-pin": PIN! },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main() {
  if (!PIN) {
    console.error("DASHBOARD_PIN is not set — cannot run authed tests.");
    process.exit(1);
  }
  console.log(`Phase 72.3 revenue intelligence API tests → ${BASE_URL}\n`);

  const ts = Date.now();
  const testSession = `test-rev-session-${ts}`;
  const testVisitor = `test-rev-visitor-${ts}`;
  const pinHeader = { "x-dashboard-pin": PIN };

  // ── Anonymous trust boundary ──────────────────────────────────────────────

  // 1. Anonymous client engagement event → 200
  {
    const res = await post("/api/analytics/revenue", {
      event: "affiliate_click",
      revenueSource: "book_sale",
      sessionId: testSession,
      visitorId: testVisitor,
      page: "/",
      utmSource: "phase72_3_test",
      productName: "Test Book",
    });
    const body = await res.json().catch(() => null);
    check("anonymous affiliate_click → 200 ok:true", res.status === 200 && body?.ok === true, `status=${res.status} body=${JSON.stringify(body)}`);
  }

  // 2. Anonymous ad_impression → 200
  {
    const res = await post("/api/analytics/revenue", { event: "ad_impression", revenueSource: "advertising" });
    const body = await res.json().catch(() => null);
    check("anonymous ad_impression → 200", res.status === 200 && body?.ok === true, `status=${res.status}`);
  }

  // 3. Anonymous ai_recommendation_clicked → 200
  {
    const res = await post("/api/analytics/revenue", { event: "ai_recommendation_clicked", revenueSource: "ai_assisted_conversion", sessionId: testSession });
    const body = await res.json().catch(() => null);
    check("anonymous ai_recommendation_clicked → 200", res.status === 200 && body?.ok === true, `status=${res.status}`);
  }

  // 4–7. Anonymous ECONOMIC events → 403 (never allowed to claim money)
  for (const event of ["payment_completed", "revenue_recorded", "subscription_started", "opportunity_won"]) {
    const res = await post("/api/analytics/revenue", { event, revenueSource: "stripe_payment", amountCents: 99999 });
    check(`anonymous ${event} → 403`, res.status === 403, `status=${res.status}`);
  }

  // 8. Anonymous amountCents forced to 0 — engagement event with a money claim
  //    must not move earned-revenue KPIs (affiliate_click is non-earning anyway,
  //    but the server must ALSO zero the stored amount).
  {
    const before = await getSummary();
    const totalBefore = Number(before.body?.kpis?.totalRevenueCents ?? -1);
    await post("/api/analytics/revenue", {
      event: "affiliate_click",
      revenueSource: "affiliate",
      amountCents: 4_000_000,
      sessionId: testSession,
    });
    const after = await getSummary();
    const totalAfter = Number(after.body?.kpis?.totalRevenueCents ?? -2);
    check("anonymous money claim does not move totalRevenue", totalBefore >= 0 && totalBefore === totalAfter, `before=${totalBefore} after=${totalAfter}`);
  }

  // ── Validation ────────────────────────────────────────────────────────────

  // 9. Unknown event → 400
  {
    const res = await post("/api/analytics/revenue", { event: "steal_money", revenueSource: "stripe_payment" });
    check("unknown event → 400", res.status === 400, `status=${res.status}`);
  }

  // 10. Missing revenueSource → 400
  {
    const res = await post("/api/analytics/revenue", { event: "affiliate_click" });
    check("missing revenueSource → 400", res.status === 400, `status=${res.status}`);
  }

  // 11. Unknown revenueSource → 400
  {
    const res = await post("/api/analytics/revenue", { event: "affiliate_click", revenueSource: "casino" });
    check("unknown revenueSource → 400", res.status === 400, `status=${res.status}`);
  }

  // 12. Negative amountCents → 400
  {
    const res = await post("/api/analytics/revenue", { event: "revenue_recorded", revenueSource: "manual_adjustment", amountCents: -100 }, pinHeader);
    check("negative amountCents → 400", res.status === 400, `status=${res.status}`);
  }

  // 13. amountCents above $500k ceiling → 400
  {
    const res = await post("/api/analytics/revenue", { event: "revenue_recorded", revenueSource: "manual_adjustment", amountCents: 50_000_001 }, pinHeader);
    check("amountCents above ceiling → 400", res.status === 400, `status=${res.status}`);
  }

  // 14. Bad currency → 400
  {
    const res = await post("/api/analytics/revenue", { event: "affiliate_click", revenueSource: "affiliate", currency: "DOLLARS" });
    check("bad currency → 400", res.status === 400, `status=${res.status}`);
  }

  // 15. Bad occurredAt → 400
  {
    const res = await post("/api/analytics/revenue", { event: "revenue_recorded", revenueSource: "manual_adjustment", occurredAt: "yesterday" }, pinHeader);
    check("bad occurredAt → 400", res.status === 400, `status=${res.status}`);
  }

  // 16. Attribution field over 300 chars → 400
  {
    const res = await post("/api/analytics/revenue", { event: "affiliate_click", revenueSource: "affiliate", utmSource: "s".repeat(400) });
    check("attribution field > 300 chars → 400", res.status === 400, `status=${res.status}`);
  }

  // 17. Oversized metadata → 413
  {
    const res = await post("/api/analytics/revenue", { event: "affiliate_click", revenueSource: "affiliate", metadata: { blob: "x".repeat(3000) } });
    check("oversized metadata → 413", res.status === 413, `status=${res.status}`);
  }

  // 18. Extra keys stripped → 200
  {
    const res = await post("/api/analytics/revenue", { event: "ad_click", revenueSource: "advertising", evil: "ignored", nested: { drop: true } });
    const body = await res.json().catch(() => null);
    check("extra keys stripped → 200", res.status === 200 && body?.ok === true, `status=${res.status}`);
  }

  // ── Trusted ingestion + idempotency ──────────────────────────────────────

  // 19. Trusted (PIN header) economic event with dedupeKey → 200
  const dedupeKey = `test:dedupe:${ts}`;
  const dedupeAmount = 12_345;
  {
    const res = await post("/api/analytics/revenue", {
      event: "revenue_recorded",
      revenueSource: "manual_adjustment",
      amountCents: dedupeAmount,
      dedupeKey,
      productName: "Phase 72.3 dedupe probe",
    }, pinHeader);
    const body = await res.json().catch(() => null);
    check("trusted economic event with dedupeKey → 200", res.status === 200 && body?.ok === true, `status=${res.status}`);
  }

  // 20. Same dedupeKey again → idempotent (totalRevenue unchanged)
  {
    const before = await getSummary();
    const totalBefore = Number(before.body?.kpis?.totalRevenueCents ?? -1);
    const res = await post("/api/analytics/revenue", {
      event: "revenue_recorded",
      revenueSource: "manual_adjustment",
      amountCents: dedupeAmount,
      dedupeKey,
    }, pinHeader);
    const after = await getSummary();
    const totalAfter = Number(after.body?.kpis?.totalRevenueCents ?? -2);
    check("duplicate dedupeKey is a no-op (200, totals unchanged)", res.status === 200 && totalBefore >= 0 && totalBefore === totalAfter, `status=${res.status} before=${totalBefore} after=${totalAfter}`);
  }

  // 21. Trusted revenue reflected in KPIs + bySource breakdown
  {
    const { status, body } = await getSummary();
    const manual = body?.bySource?.find((s: any) => s.name === "manual_adjustment");
    check(
      "trusted revenue lands in totals + bySource",
      status === 200 && Number(body?.kpis?.totalRevenueCents) >= dedupeAmount && Number(manual?.totalCents) >= dedupeAmount,
      `total=${body?.kpis?.totalRevenueCents} manual=${JSON.stringify(manual)}`,
    );
  }

  // ── Dashboard summary auth + shape ────────────────────────────────────────

  // 22. Summary without auth → 401
  {
    const res = await fetch(`${BASE_URL}/api/dashboard/analytics/revenue`);
    check("revenue summary unauthenticated → 401", res.status === 401, `status=${res.status}`);
  }

  // 23. Summary with PIN → 200 + full contract shape
  {
    const { status, body } = await getSummary();
    const shapeOk =
      status === 200 &&
      typeof body?.kpis === "object" &&
      typeof body.kpis.totalRevenueCents === "number" &&
      typeof body.kpis.netRevenueCents === "number" &&
      Array.isArray(body?.bySource) &&
      Array.isArray(body?.byUtmSource) &&
      Array.isArray(body?.byCampaign) &&
      Array.isArray(body?.byPage) &&
      Array.isArray(body?.byOffer) &&
      Array.isArray(body?.byProduct) &&
      Array.isArray(body?.byPlan) &&
      Array.isArray(body?.byDevice) &&
      Array.isArray(body?.byBrowser) &&
      Array.isArray(body?.daily) &&
      Array.isArray(body?.weekly) &&
      Array.isArray(body?.monthly) &&
      Array.isArray(body?.revenueFunnel) &&
      body.revenueFunnel.length === 4 &&
      typeof body?.revenueFunnelNetCents === "number" &&
      typeof body?.diagnostics === "object" &&
      typeof body.diagnostics.duplicatePaymentGroups === "number" &&
      typeof body.diagnostics.unmatchedPaidOrders === "number" &&
      typeof body?.attributionNote === "string" &&
      typeof body?.generatedAt === "string";
    check("revenue summary authed → 200 with full contract shape", shapeOk, `status=${status}`);

    // 24. Revenue funnel conversions capped 0–100
    const convOk = (body?.revenueFunnel ?? []).every((s: any) =>
      s.conversionPct === null || (s.conversionPct >= 0 && s.conversionPct <= 100));
    check("revenue funnel conversions capped 0–100", convOk, JSON.stringify(body?.revenueFunnel));

    // 25. No duplicate payments (dedupe guard holds)
    check("diagnostics: zero duplicate payment groups", Number(body?.diagnostics?.duplicatePaymentGroups) === 0, `groups=${body?.diagnostics?.duplicatePaymentGroups}`);
  }

  // ── Corrective 72.2 funnel normalization ─────────────────────────────────

  // 26. Funnel summary exposes normalized stages + diagnostics
  {
    const res = await fetch(`${BASE_URL}/api/dashboard/analytics/funnel`, { headers: pinHeader });
    const body = await res.json().catch(() => null);
    const ok =
      res.status === 200 &&
      Array.isArray(body?.normalizedStages) &&
      body.normalizedStages.length === 7 &&
      Array.isArray(body?.normalizedConversions) &&
      body.normalizedConversions.length === 6 &&
      typeof body?.diagnostics === "object" &&
      typeof body.diagnostics.outOfOrderSessions === "number" &&
      typeof body.diagnostics.duplicateEvents === "number";
    check("funnel summary exposes normalized stages + diagnostics", ok, `status=${res.status}`);

    // 27. Normalized funnel is monotonically non-increasing (cumulative furthest-stage)
    const counts = (body?.normalizedStages ?? []).map((s: any) => Number(s.count));
    const monotonic = counts.every((c: number, i: number) => i === 0 || c <= counts[i - 1]);
    check("normalized funnel is monotonically non-increasing", counts.length === 7 && monotonic, JSON.stringify(counts));

    // 28. Normalized conversions capped 0–100
    const convOk = (body?.normalizedConversions ?? []).every((c: any) =>
      c.conversionPct === null || (c.conversionPct >= 0 && c.conversionPct <= 100));
    check("normalized conversions capped 0–100", convOk, JSON.stringify(body?.normalizedConversions));

    // 29. Overall conversion capped ≤ 100
    const overall = body?.overall?.conversionPct;
    check("overall conversion capped ≤ 100", overall === null || (overall >= 0 && overall <= 100), `overall=${overall}`);
  }

  // 30. Route mounted before SPA fallback — API must never return HTML
  {
    const res = await post("/api/analytics/revenue", { event: "ad_impression", revenueSource: "advertising" });
    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const text = isJson ? JSON.stringify(await res.json()) : await res.text();
    check("no SPA fallback on API route", isJson && !text.includes("<!DOCTYPE html>"), `content-type=${ct}`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
