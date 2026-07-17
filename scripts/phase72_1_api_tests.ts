// Phase 72.1 — Homepage Analytics API contract tests.
// Verifies the exact Mission Control contract against a RUNNING server:
//   1. POST /api/analytics/homepage with a valid event → 200 JSON {"ok":true}
//   2. Unknown event name → 400 JSON
//   3. Missing event → 400 JSON
//   4. Metadata > 2 KB serialized → 413 JSON
//   5. GET /api/dashboard/analytics/homepage/summary without auth → 401 JSON
//   6. Same endpoint with valid PIN → 200 JSON KPI shape (totals/byEvent)
//   7. Every API response above is application/json — never the SPA HTML
//      fallback (which is what a missing route would serve as a false 200).
//
// Usage: npx tsx scripts/phase72_1_api_tests.ts   (server must be running)
//   BASE_URL defaults to http://127.0.0.1:5000 — on Render use
//   BASE_URL=http://localhost:10000 npx tsx scripts/phase72_1_api_tests.ts

const BASE = process.env.BASE_URL || "http://127.0.0.1:5000";
const PIN = process.env.DASHBOARD_PIN;

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail: string) {
  if (ok) {
    passed++;
    console.log(`PASS  ${name} — ${detail}`);
  } else {
    failed++;
    console.error(`FAIL  ${name} — ${detail}`);
  }
}

function isJson(res: Response): boolean {
  return (res.headers.get("content-type") ?? "").includes("application/json");
}

async function post(body: unknown): Promise<Response> {
  return fetch(`${BASE}/api/analytics/homepage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  // 1. Valid event → 200 {"ok":true}
  {
    const res = await post({ event: "hero_cta_click", metadata: { section: "hero" } });
    const body = isJson(res) ? await res.json() : await res.text();
    check(
      "valid event",
      res.status === 200 && isJson(res) && (body as any)?.ok === true,
      `status=${res.status} json=${isJson(res)} body=${JSON.stringify(body).slice(0, 120)}`,
    );
  }

  // 2. Valid event WITHOUT metadata → 200 {"ok":true}
  {
    const res = await post({ event: "section_view" });
    const body = isJson(res) ? await res.json() : await res.text();
    check(
      "valid event, no metadata",
      res.status === 200 && isJson(res) && (body as any)?.ok === true,
      `status=${res.status} json=${isJson(res)}`,
    );
  }

  // 3. Unknown event name → 400 JSON
  {
    const res = await post({ event: "totally_made_up_event" });
    check(
      "unknown event → 400",
      res.status === 400 && isJson(res),
      `status=${res.status} json=${isJson(res)}`,
    );
  }

  // 4. Missing event → 400 JSON
  {
    const res = await post({ metadata: { foo: "bar" } });
    check(
      "missing event → 400",
      res.status === 400 && isJson(res),
      `status=${res.status} json=${isJson(res)}`,
    );
  }

  // 5. Empty body → 400 JSON
  {
    const res = await post({});
    check(
      "empty body → 400",
      res.status === 400 && isJson(res),
      `status=${res.status} json=${isJson(res)}`,
    );
  }

  // 6. Oversized metadata (> 2 KB serialized) → 413 JSON
  {
    const res = await post({ event: "hero_view", metadata: { blob: "x".repeat(3000) } });
    check(
      "oversized metadata → 413",
      res.status === 413 && isJson(res),
      `status=${res.status} json=${isJson(res)}`,
    );
  }

  // 7. Extra unknown top-level keys are stripped, request still succeeds
  {
    const res = await post({ event: "feed_item_click", website: "", junk: 123 });
    const body = isJson(res) ? await res.json() : await res.text();
    check(
      "extra keys stripped",
      res.status === 200 && (body as any)?.ok === true,
      `status=${res.status}`,
    );
  }

  // 8. Summary without auth → 401 JSON
  {
    const res = await fetch(`${BASE}/api/dashboard/analytics/homepage/summary`);
    check(
      "summary unauthenticated → 401",
      res.status === 401 && isJson(res),
      `status=${res.status} json=${isJson(res)}`,
    );
  }

  // 9. Summary with valid PIN → 200 JSON KPI shape
  if (!PIN) {
    check("summary authenticated", false, "DASHBOARD_PIN not set in environment — cannot test");
  } else {
    const res = await fetch(`${BASE}/api/dashboard/analytics/homepage/summary`, {
      headers: { "x-dashboard-pin": PIN },
    });
    const body = isJson(res) ? await res.json() : null;
    const shapeOk =
      body &&
      typeof body.totals?.allTime === "number" &&
      typeof body.totals?.last7d === "number" &&
      typeof body.totals?.last24h === "number" &&
      Array.isArray(body.byEvent) &&
      typeof body.generatedAt === "string";
    check(
      "summary authenticated → 200 KPI JSON",
      res.status === 200 && isJson(res) && Boolean(shapeOk),
      `status=${res.status} totals=${JSON.stringify(body?.totals)} byEvent=${body?.byEvent?.length ?? "n/a"} events`,
    );

    // 10. Recorded events show up in the summary (data actually persisted)
    const heroRow = body?.byEvent?.find((r: any) => r.event === "hero_cta_click");
    check(
      "recorded event visible in summary",
      Boolean(heroRow && heroRow.allTime >= 1),
      heroRow ? `hero_cta_click allTime=${heroRow.allTime}` : "hero_cta_click not found in byEvent",
    );
  }

  // 11. Route is mounted before the SPA fallback: an API POST must never
  //     return HTML. (A missing route yields the index.html shell with 200.)
  {
    const res = await post({ event: "concierge_open" });
    const text = isJson(res) ? JSON.stringify(await res.json()) : await res.text();
    check(
      "no SPA fallback on API route",
      isJson(res) && !text.includes("<!DOCTYPE html>"),
      `content-type=${res.headers.get("content-type")}`,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
