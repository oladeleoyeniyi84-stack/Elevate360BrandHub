// Phase 72.8 — auth/authorization regression checks.
// Structural checks always run. HTTP checks target only read-only/public or
// deliberately unauthorized requests and never mutate production data.
import fs from "node:fs";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:5000";
const INDEX = fs.readFileSync("server/index.ts", "utf8");
const ROUTES = fs.readFileSync("server/routes.ts", "utf8");
const CUSTOMER = fs.readFileSync("server/routes/customerBilling.ts", "utf8");
const AI_CONTENT = fs.readFileSync("server/routes/aiContent.ts", "utf8");
const CAMPAIGNS = fs.readFileSync("server/routes/campaigns.ts", "utf8");
const COGNITIVE = fs.readFileSync("server/routes/cognitiveOs.ts", "utf8");

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

async function readOnlyHttpChecks() {
  try {
    const protectedPaths = [
      "/api/dashboard/leads",
      "/api/dashboard/search-intelligence",
      "/api/admin/cognitive-os/overview",
      "/api/admin/campaigns",
      "/api/ai/content",
    ];
    for (const path of protectedPaths) {
      const response = await fetch(`${BASE}${path}`);
      check(`unauthenticated ${path} is not exposed`, response.status === 401);
    }
    const definitelyMissing = `phase72-8-unpublished-${Date.now()}`;
    const missing = await fetch(`${BASE}/api/blog/${definitelyMissing}`);
    check("public blog detail fails closed for non-public/missing slugs", missing.status === 404);
  } catch {
    console.log("  - live HTTP checks skipped (server unavailable)");
  }
}

async function main() {
  console.log("\n━━ Session boundaries and fixation ━━");
  check("session cookie is explicitly named", INDEX.includes('name: "e360.sid"'));
  check("session cookie is httpOnly, SameSite=Lax, and production-secure",
    INDEX.includes("httpOnly: true") &&
    INDEX.includes('sameSite: "lax"') &&
    INDEX.includes('secure: process.env.NODE_ENV === "production"'));
  check("founder login rotates the session identifier",
    /dashboard\/auth[\s\S]*?session\.regenerate/.test(INDEX));
  check("customer signup/login rotate the session identifier",
    CUSTOMER.includes("function establishCustomerSession") &&
    CUSTOMER.includes("req.session.regenerate"));
  check("customer signup/login are rate-limited",
    /api\/auth\/signup", rateLimit\(/.test(CUSTOMER) &&
    /api\/auth\/login", rateLimit\(/.test(CUSTOMER));
  check("customer and founder identities use distinct session keys",
    CUSTOMER.includes("req.session.customerId") &&
    INDEX.includes("req.session.dashboardAuthed"));
  check("both role-specific logouts rotate sessions",
    ROUTES.includes('app.post("/api/dashboard/logout"') &&
    /dashboard\/logout[\s\S]*?session\.regenerate/.test(ROUTES) &&
    /api\/auth\/logout[\s\S]*?session\.regenerate/.test(CUSTOMER));

  console.log("\n━━ Founder PIN and route coverage ━━");
  check("PIN comparison uses timingSafeEqual", INDEX.includes("timingSafeEqual(ap, bp)"));
  check("dashboard authentication is rate-limited",
    INDEX.includes("DASHBOARD_AUTH_LIMIT") &&
    INDEX.includes("consumeDashboardAuthAttempt"));
  check("header PIN grants request-only auth, not persistent session auth",
    INDEX.includes("req.dashboardRequestAuthed = true") &&
    !/app\.use\(\(req:[\s\S]*?pinMatches[\s\S]*?session\.dashboardAuthed = true/.test(INDEX));
  check("fail-closed middleware covers both privileged namespaces",
    INDEX.includes('req.path.startsWith("/api/admin/")') &&
    INDEX.includes('req.path.startsWith("/api/dashboard/")') &&
    INDEX.includes('return res.status(401).json({ message: "Unauthorized" })'));
  check("AI content mount has router-level founder auth",
    AI_CONTENT.includes("aiContentRouter.use(requireDashboardAuth)"));
  check("campaign mount has router-level founder auth",
    CAMPAIGNS.includes("campaignsRouter.use(requireDashboardAuth)"));
  check("cognitive/admin mount has router-level founder auth",
    COGNITIVE.includes("cognitiveOsRouter.use(requireDashboardAuth)"));

  console.log("\n━━ Public publication boundary ━━");
  check("public blog lists request published-only rows",
    (ROUTES.match(/storage\.getBlogPosts\(true\)/g) ?? []).length >= 2);
  check("public blog detail rejects unpublished posts",
    ROUTES.includes("if (!post || !post.published)"));
  check("public marketplace detail rejects unpublished products",
    ROUTES.includes("if (!product || !product.published)"));
  check("content drafts are mounted only below admin namespace",
    ROUTES.includes('"/api/admin/content-factory/drafts"') &&
    !ROUTES.includes('app.get("/api/content-factory/drafts"'));

  console.log("\n━━ Read-only HTTP boundary checks ━━");
  await readOnlyHttpChecks();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();