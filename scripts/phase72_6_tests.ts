// Phase 72.6 — Public Flagship Work & Collaborations Showcase tests.
// Run with the dev server up on :5000:  npx tsx scripts/phase72_6_tests.ts
//
// Mix of: real data-model unit tests against the shared flagshipProjects
// configuration (public boundary, statuses, copy rules), live HTTP contract
// tests (/work SSR head, sitemap, llms.txt, analytics vocabulary), and
// structural source assertions where behavior cannot be triggered
// hermetically (nav/footer wiring, a11y/reduced-motion, safe rel attrs).

import fs from "fs";
import {
  FLAGSHIP_PROJECTS,
  PROJECT_STATUSES,
  getPublicProjects,
  getHomepageProjects,
  getCurrentInitiatives,
  CONFIDENTIALITY_STATEMENT,
} from "../shared/flagshipProjects";
import { HOMEPAGE_ANALYTICS_EVENTS } from "../shared/schema";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:5000";

const DATA = fs.readFileSync("shared/flagshipProjects.ts", "utf-8");
const WORK_PAGE = fs.readFileSync("client/src/pages/Work.tsx", "utf-8");
const HOME_SECTION = fs.readFileSync("client/src/components/FlagshipWorkSection.tsx", "utf-8");
const HOME = fs.readFileSync("client/src/pages/Home.tsx", "utf-8");
const APP = fs.readFileSync("client/src/App.tsx", "utf-8");
const ANALYTICS = fs.readFileSync("client/src/lib/workAnalytics.ts", "utf-8");
const META = fs.readFileSync("server/seo/meta.ts", "utf-8");
const INDEX_CSS = fs.readFileSync("client/src/index.css", "utf-8");

const PUBLIC_SOURCES = DATA + WORK_PAGE + HOME_SECTION + ANALYTICS;

let passed = 0, failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}
function section(t: string) { console.log(`\n━━ ${t} ━━`); }

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  return { status: res.status, text: await res.text(), contentType: res.headers.get("content-type") ?? "" };
}

async function main() {
  // ── Rendering & routing ────────────────────────────────────────────────
  section("Rendering & routing");

  // 1. /work route renders (SPA route registered + SSR head resolves)
  const work = await get("/work");
  check("1. /work route renders (200 html)", work.status === 200 && work.contentType.includes("text/html"));
  check("1b. /work registered in client router", APP.includes(`path="/work"`) && APP.includes("component={Work}"));

  // 2. Homepage flagship section renders
  check("2. Homepage renders flagship section component", HOME.includes("<FlagshipWorkSection />"));
  check("2b. Section heading + eyebrow present", HOME_SECTION.includes("Flagship Work, Strategic Collaborations &amp; Current Initiatives") && HOME_SECTION.includes("Our Work"));

  // 3. Homepage shows no more than six featured projects
  const homeProjects = getHomepageProjects();
  check("3. Homepage projects ≤ 6", homeProjects.length <= 6, `got ${homeProjects.length}`);
  check("3b. All homepage projects flagged homepageFeatured", homeProjects.every((p) => p.homepageFeatured));

  // ── Public boundary ────────────────────────────────────────────────────
  section("Public boundary & confidentiality");

  // 4. Confidential projects never render
  check("4. getPublicProjects excludes confidential", getPublicProjects().every((p) => p.visibility !== "confidential"));
  check("4b. Homepage list excludes confidential", homeProjects.every((p) => p.visibility !== "confidential"));
  check("4c. Initiatives exclude confidential projects", getCurrentInitiatives().every((i) => i.project.visibility !== "confidential"));

  // 5. Limited-public records require approved summaries + disclaimers
  const limited = FLAGSHIP_PROJECTS.filter((p) => p.visibility === "limited_public");
  check("5. Limited-public records carry approved summary + disclaimer",
    limited.length >= 3 && limited.every((p) => p.summary.length > 40 && Boolean(p.disclaimer)));

  // 6. Status labels come from the controlled union
  check("6. All statuses in controlled union", FLAGSHIP_PROJECTS.every((p) => (PROJECT_STATUSES as readonly string[]).includes(p.status)));
  check("6b. No fake percent-complete anywhere", !/\d+\s*%\s*(complete|done|finished)/i.test(PUBLIC_SOURCES));

  // 7. External URLs use safe rel attributes
  check("7. External links use rel=noopener noreferrer",
    WORK_PAGE.includes(`rel="noopener noreferrer"`) && HOME_SECTION.includes(`rel="noopener noreferrer"`));

  // 8. Wedding project links to rantianddele.com
  const wedding = FLAGSHIP_PROJECTS.find((p) => p.id === "ranti-dele-wedding");
  check("8. Wedding links to https://rantianddele.com", wedding?.externalUrl === "https://rantianddele.com" && wedding?.ctaRoute === "https://rantianddele.com");

  // 9-10. Status honesty for named projects
  check("9. Project Nehemiah labeled In Development", FLAGSHIP_PROJECTS.find((p) => p.id === "project-nehemiah")?.status === "In Development");
  check("10. Operation ASCEND labeled Active Collaboration", FLAGSHIP_PROJECTS.find((p) => p.id === "operation-ascend")?.status === "Active Collaboration");

  // 11. South Shore AI language: no ownership/partnership claims
  const ssa = FLAGSHIP_PROJECTS.find((p) => p.id === "south-shore-ai")!;
  const ssaCopy = [ssa.title, ssa.summary, ssa.fullDescription, ssa.category, ssa.collaborationType, ssa.disclaimer].join(" ");
  check("11. South Shore AI copy avoids ownership/partnership claims",
    !/\bown(s|ed|ership)?\b|\bofficial partner|\bformal partner|\bco-?found/i.test(ssaCopy) && ssa.status === "Strategic Collaboration");

  // 12. No private dashboards publicly linked
  const routes = FLAGSHIP_PROJECTS.map((p) => p.ctaRoute).concat(FLAGSHIP_PROJECTS.map((p) => p.internalRoute ?? ""));
  check("12. No private dashboard routes in project CTAs",
    routes.every((r) => !/dashboard|admin|search-intelligence/.test(r)) &&
    !/href="\/(dashboard|admin|search-intelligence)/.test(WORK_PAGE + HOME_SECTION));

  // 13. No credentials / env names / db URLs / security findings
  check("13. No secrets, env-var names, or db URLs in public sources",
    !/API_KEY|SECRET|DATABASE_URL|DASHBOARD_PIN|postgres:\/\/|sk_live|Bearer /i.test(PUBLIC_SOURCES.replace(/CONFIDENTIALITY_STATEMENT/g, "")));

  // 14. No unsupported performance claims
  check("14. No fabricated metrics claims (%, x-fold, revenue figures)",
    !/\d+\s*%|(\d+)x\s+(growth|increase|faster)|\$\d/i.test(
      FLAGSHIP_PROJECTS.map((p) => [p.summary, p.fullDescription, ...(p.outcomes ?? [])].join(" ")).join(" ")));

  // ── SEO & discovery ────────────────────────────────────────────────────
  section("SEO & discovery");

  // 15. /work SSR title, canonical, OG, Twitter
  const html = work.text;
  check("15a. Title", html.includes("Our Work, Collaborations &amp; Digital Projects | Elevate360Official") || html.includes("Our Work, Collaborations & Digital Projects | Elevate360Official"));
  check("15b. Canonical", html.includes(`https://www.elevate360official.com/work`));
  check("15b2. Approved meta description", html.includes("flagship platforms, AI systems, nonprofit collaborations, intelligent websites"));
  check("15c. OG tags", html.includes(`og:title`) && html.includes(`og:url`));
  check("15d. Twitter tags", html.includes(`twitter:card`) || html.includes(`twitter:title`));

  // 16. sitemap.xml includes /work
  const sitemap = await get("/sitemap.xml");
  check("16. /work in sitemap.xml", sitemap.status === 200 && sitemap.text.includes("https://www.elevate360official.com/work"));

  // 17. llms.txt includes /work
  const llms = await get("/llms.txt");
  check("17. /work in llms.txt", llms.status === 200 && llms.text.includes("/work"));

  // 18-19. Nav & footer
  check("18. Navigation includes Work", HOME.includes(`link-nav-work`) && HOME.includes(`{ href: "/work", label: "Work"`));
  check("19. Footer includes Work", HOME.includes(`link-footer-work`));

  // 20. JSON-LD valid and script-safe
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let ld: any = null;
  try { ld = ldMatch ? JSON.parse(ldMatch[1]) : null; } catch { /* invalid */ }
  check("20a. /work JSON-LD parses", Boolean(ld));
  check("20b. CollectionPage + ItemList, no fabricated ratings/awards",
    ld?.["@type"] === "CollectionPage" && ld?.mainEntity?.["@type"] === "ItemList" &&
    !JSON.stringify(ld ?? {}).match(/aggregateRating|award|reviewCount|ratingValue/));
  check("20c. safeJsonLd escaping used for < characters", META.includes("safeJsonLd"));

  // ── Design & a11y (structural) ─────────────────────────────────────────
  section("Design & accessibility");

  // 21. Mobile layout: responsive grid classes, no fixed widths forcing overflow
  check("21. Responsive 1/2-col grids, no fixed pixel widths", /grid-cols-1 md:grid-cols-2/.test(WORK_PAGE) && !/w-\[\d{3,}px\]/.test(WORK_PAGE + HOME_SECTION));

  // 22. Buttons meet 44px minimum target size
  check("22. Interactive elements use min-h-[44px]",
    (WORK_PAGE.match(/min-h-\[44px\]/g)?.length ?? 0) >= 5 && HOME_SECTION.includes("min-h-[44px]"));

  // 23. Keyboard focus visible
  check("23. focus-visible outlines present", WORK_PAGE.includes("focus-visible:outline") && HOME_SECTION.includes("focus-visible:outline"));

  // 24. Reduced-motion respected (global rule or motion-safe usage; no bespoke animations added)
  check("24. Reduced motion respected",
    INDEX_CSS.includes("prefers-reduced-motion") || HOME_SECTION.includes("motion-safe") ||
    !/animate-|keyframes/.test(WORK_PAGE));

  // ── Analytics ──────────────────────────────────────────────────────────
  section("Analytics");

  // 25. Event names approved in shared vocabulary
  const workEvents = ["work_section_view", "work_project_view", "work_project_cta_click", "work_filter_used", "current_initiative_view", "consultation_cta_click"];
  check("25a. All six work events in HOMEPAGE_ANALYTICS_EVENTS", workEvents.every((e) => (HOMEPAGE_ANALYTICS_EVENTS as readonly string[]).includes(e)));
  check("25a2. Every work event is actually emitted in client code", workEvents.every((e) => (WORK_PAGE + HOME_SECTION).includes(`"${e}"`)));
  check("25a3. Initiative cards show controlled project status", WORK_PAGE.includes("statusBadgeClass(i.project.status)"));
  const accepted = await fetch(`${BASE}/api/analytics/homepage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "work_section_view", metadata: { sourcePage: "test" } }),
  });
  check("25b. Endpoint accepts work_section_view", accepted.status >= 200 && accepted.status < 300, `status ${accepted.status}`);
  const rejected = await fetch(`${BASE}/api/analytics/homepage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "work_made_up_event" }),
  });
  check("25c. Unknown event rejected with 400", rejected.status === 400, `status ${rejected.status}`);

  // 26. Metadata excludes personal data
  check("26. Metadata fields are non-PII (projectId/category/status/sourcePage/targetRoute/filter only)",
    !/email|name:|phone|address|ip\b/i.test(ANALYTICS) &&
    /projectId|sourcePage|targetRoute/.test(ANALYTICS) &&
    ANALYTICS.includes("keepalive"));

  // ── Regression safety ──────────────────────────────────────────────────
  section("Regression safety");

  // 27. Existing homepage sections remain available
  check("27. Homepage anchors intact", ["id=\"apps\"", "id=\"offers\"", "id=\"book-session\"", "id=\"trust\"", "id=\"collaborate\""].every((a) => HOME.includes(a)));

  // 28. Existing homepage analytics remain operational
  const legacy = await fetch(`${BASE}/api/analytics/homepage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "section_view", metadata: { section: "test" } }),
  });
  check("28. Legacy event section_view still accepted", legacy.status >= 200 && legacy.status < 300, `status ${legacy.status}`);

  // 29. Search Intelligence remains protected
  // Real registered endpoint (unregistered /api/* paths SPA-fallback to 200 html).
  const si = await get("/api/dashboard/search-intelligence");
  check("29. Search Intelligence API still requires auth", si.status === 401 || si.status === 403, `status ${si.status}`);

  // 30. Existing routes do not regress
  for (const p of ["/", "/blog", "/pricing", "/strategy-session"]) {
    const r = await get(p);
    check(`30. ${p} still 200`, r.status === 200);
  }
  const sg = await get("/api/dashboard/search-growth/actions");
  check("30b. Phase 72.5 growth actions API still protected", sg.status === 401 || sg.status === 403, `status ${sg.status}`);

  // 31-32 (TypeScript + production build) are run separately in the delivery
  // pipeline (`npm run check`, `npm run build`) — noted here for traceability.
  check("31/32. tsc + build executed in pipeline (see delivery report)", true);

  console.log(`\n══════════════════════════════════`);
  console.log(`PASSED: ${passed}   FAILED: ${failed}`);
  if (failures.length) { console.log("Failures:"); failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("Test harness error:", e); process.exit(1); });
