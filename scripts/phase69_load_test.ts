// Phase 69 — repeated-load smoke test with RSS evidence.
// Logs into the dashboard with DASHBOARD_PIN, hammers the heaviest read
// endpoints in repeated passes, and samples /api/dashboard/system/memory
// before/during/after to prove RSS stays bounded (no unbounded growth).
//
// Usage: npx tsx scripts/phase69_load_test.ts  (server must be running on PORT)

const BASE = process.env.LOAD_TEST_BASE_URL || "http://127.0.0.1:5000";
const PIN = process.env.DASHBOARD_PIN;
const PASSES = Number(process.env.LOAD_TEST_PASSES || 10);

const ENDPOINTS = [
  "/api/dashboard/leads",
  "/api/dashboard/contacts",
  "/api/dashboard/subscribers",
  "/api/dashboard/visits",
  "/api/dashboard/clicks",
  "/api/dashboard/summary",
  "/api/dashboard/orders",
  "/api/dashboard/bookings",
  "/api/dashboard/revenue-attribution",
  "/api/dashboard/conversion-analytics",
  "/api/dashboard/system-health",
];

type MemorySnap = { rssMb: number; heapUsedMb: number; aiSessions: number; timers: number };

async function getMemory(headers: Record<string, string>): Promise<MemorySnap> {
  const res = await fetch(`${BASE}/api/dashboard/system/memory`, { headers });
  if (!res.ok) throw new Error(`memory endpoint ${res.status}`);
  const body = await res.json();
  return {
    rssMb: body.process.current.rssMb,
    heapUsedMb: body.process.current.heapUsedMb,
    aiSessions: body.aiMemoryCache.activeSessions,
    timers: body.jobRunner.registeredTimers,
  };
}

async function main() {
  if (!PIN) throw new Error("DASHBOARD_PIN not set in environment");
  const headers = { "x-dashboard-pin": PIN };

  // Verify auth works
  const authCheck = await fetch(`${BASE}/api/dashboard/summary`, { headers });
  if (!authCheck.ok) throw new Error(`auth check failed: ${authCheck.status}`);

  const baseline = await getMemory(headers);
  console.log(`baseline: rss=${baseline.rssMb}MB heap=${baseline.heapUsedMb}MB aiSessions=${baseline.aiSessions} timers=${baseline.timers}`);

  let peakRss = baseline.rssMb;
  let requests = 0;
  let failures: string[] = [];

  for (let pass = 1; pass <= PASSES; pass++) {
    for (const ep of ENDPOINTS) {
      const res = await fetch(`${BASE}${ep}`, { headers });
      requests++;
      if (!res.ok) failures.push(`${ep} -> ${res.status}`);
      // Drain the body so memory isn't held by unconsumed streams
      await res.arrayBuffer();
    }
    const snap = await getMemory(headers);
    if (snap.rssMb > peakRss) peakRss = snap.rssMb;
    console.log(`pass ${pass}/${PASSES}: rss=${snap.rssMb}MB heap=${snap.heapUsedMb}MB`);
  }

  // Let GC settle, then take the post-load snapshot
  await new Promise((r) => setTimeout(r, 3000));
  const post = await getMemory(headers);

  console.log("\n=== Phase 69 load test result ===");
  console.log(`requests: ${requests} across ${PASSES} passes (${ENDPOINTS.length} endpoints)`);
  console.log(`failures: ${failures.length}${failures.length ? " — " + Array.from(new Set(failures)).join(", ") : ""}`);
  console.log(`baseline RSS: ${baseline.rssMb}MB`);
  console.log(`peak RSS:     ${peakRss}MB`);
  console.log(`post RSS:     ${post.rssMb}MB (heap ${post.heapUsedMb}MB)`);
  console.log(`growth baseline→post: ${Math.round((post.rssMb - baseline.rssMb) * 10) / 10}MB`);
  if (failures.length > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
