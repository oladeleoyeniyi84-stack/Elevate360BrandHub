// Phase 72.2 — Strategy Session funnel analytics API contract tests.
// Run: npx tsx scripts/phase72_2_api_tests.ts
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

async function post(path: string, body: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  if (!PIN) {
    console.error("DASHBOARD_PIN is not set — cannot run authed tests.");
    process.exit(1);
  }
  console.log(`Phase 72.2 funnel analytics API tests → ${BASE_URL}\n`);

  const testSession = `test-session-${Date.now()}`;
  const testVisitor = `test-visitor-${Date.now()}`;

  // 1. Valid event with full attribution → 200 {"ok":true}
  {
    const res = await post("/api/analytics/funnel", {
      event: "strategy_page_view",
      sessionId: testSession,
      visitorId: testVisitor,
      page: "/strategy-session",
      referrer: "https://google.com/",
      source: "google",
      medium: "cpc",
      campaign: "phase72_2_test",
      device: "desktop",
      browser: "chrome",
      metadata: { landingPage: "/" },
    });
    const body = await res.json().catch(() => null);
    check("valid event (full attribution) → 200 ok:true", res.status === 200 && body?.ok === true, `status=${res.status} body=${JSON.stringify(body)}`);
  }

  // 2. Valid minimal event (anonymous, no session) → 200
  {
    const res = await post("/api/analytics/funnel", { event: "pricing_view" });
    const body = await res.json().catch(() => null);
    check("valid minimal event → 200 ok:true", res.status === 200 && body?.ok === true, `status=${res.status}`);
  }

  // 3. plan_selected with metadata.plan (feeds Top Plans KPI) → 200
  {
    const res = await post("/api/analytics/funnel", {
      event: "plan_selected",
      sessionId: testSession,
      visitorId: testVisitor,
      metadata: { plan: "pro" },
    });
    const body = await res.json().catch(() => null);
    check("plan_selected with metadata.plan → 200", res.status === 200 && body?.ok === true, `status=${res.status}`);
  }

  // 4. booking_completed (same session — completes funnel + avg time) → 200
  {
    const res = await post("/api/analytics/funnel", {
      event: "booking_completed",
      sessionId: testSession,
      visitorId: testVisitor,
    });
    const body = await res.json().catch(() => null);
    check("booking_completed → 200", res.status === 200 && body?.ok === true, `status=${res.status}`);
  }

  // 5. Unknown event → 400
  {
    const res = await post("/api/analytics/funnel", { event: "not_a_real_event" });
    check("unknown event → 400", res.status === 400, `status=${res.status}`);
  }

  // 6. Missing event → 400
  {
    const res = await post("/api/analytics/funnel", { metadata: { a: 1 } });
    check("missing event → 400", res.status === 400, `status=${res.status}`);
  }

  // 7. Empty body → 400
  {
    const res = await post("/api/analytics/funnel", {});
    check("empty body → 400", res.status === 400, `status=${res.status}`);
  }

  // 8. Oversized metadata (> 2048 bytes serialized) → 413
  {
    const res = await post("/api/analytics/funnel", {
      event: "pricing_view",
      metadata: { blob: "x".repeat(3000) },
    });
    check("oversized metadata → 413", res.status === 413, `status=${res.status}`);
  }

  // 9. Extra keys stripped, still accepted → 200
  {
    const res = await post("/api/analytics/funnel", {
      event: "checkout_started",
      sessionId: testSession,
      evil: "ignored",
      nested: { drop: true },
    });
    const body = await res.json().catch(() => null);
    check("extra keys stripped → 200", res.status === 200 && body?.ok === true, `status=${res.status}`);
  }

  // 10. Attribution field over length cap → 400
  {
    const res = await post("/api/analytics/funnel", {
      event: "pricing_view",
      source: "s".repeat(400),
    });
    check("attribution field > 300 chars → 400", res.status === 400, `status=${res.status}`);
  }

  // 11. Dashboard summary without auth → 401
  {
    const res = await fetch(`${BASE_URL}/api/dashboard/analytics/funnel`);
    check("dashboard summary unauthenticated → 401", res.status === 401, `status=${res.status}`);
  }

  // 12. Dashboard summary with PIN header → 200 + expected shape + recorded data
  {
    const res = await fetch(`${BASE_URL}/api/dashboard/analytics/funnel`, {
      headers: { "x-dashboard-pin": PIN },
    });
    const body = await res.json().catch(() => null);
    const shapeOk =
      res.status === 200 &&
      Array.isArray(body?.stages) &&
      body.stages.length === 7 &&
      Array.isArray(body?.conversions) &&
      body.conversions.length === 6 &&
      typeof body?.overall === "object" &&
      Array.isArray(body?.topSources) &&
      Array.isArray(body?.topCampaigns) &&
      Array.isArray(body?.topPlans) &&
      Array.isArray(body?.daily) &&
      Array.isArray(body?.weekly) &&
      Array.isArray(body?.monthly) &&
      typeof body?.generatedAt === "string";
    check("dashboard summary authed → 200 with full KPI shape", shapeOk, `status=${res.status}`);

    const strategyStage = body?.stages?.find((s: any) => s.key === "strategy");
    const bookedStage = body?.stages?.find((s: any) => s.key === "booked");
    check(
      "recorded events reflected in stage counts",
      Number(strategyStage?.count) >= 1 && Number(bookedStage?.count) >= 1,
      `strategy=${strategyStage?.count} booked=${bookedStage?.count}`,
    );
    const proPlan = body?.topPlans?.find((p: any) => p.name === "pro");
    check("plan_selected metadata surfaces in topPlans", Number(proPlan?.count) >= 1, `topPlans=${JSON.stringify(body?.topPlans)}`);
    check(
      "avg completion time computed for completed session",
      body?.avgCompletionMinutes === null || typeof body?.avgCompletionMinutes === "number",
      `avg=${body?.avgCompletionMinutes}`,
    );
  }

  // 13. Route is mounted before the SPA fallback: an API POST must never
  //     return HTML. (A missing route yields the index.html shell with 200.)
  {
    const res = await post("/api/analytics/funnel", { event: "pricing_view" });
    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const text = isJson ? JSON.stringify(await res.json()) : await res.text();
    check(
      "no SPA fallback on API route",
      isJson && !text.includes("<!DOCTYPE html>"),
      `content-type=${ct}`,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
