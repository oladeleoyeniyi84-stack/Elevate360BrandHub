// Phase 72.4.1 — Search Activation & SEO Remediation test suite.
// Run with the dev server up on :5000:  npx tsx scripts/phase72_4_1_tests.ts
//
// Covers: GSC config parsing (unit), GSC sync error taxonomy + redaction
// (mocked fetch — no real Google calls, no HTTP /sync budget consumed),
// server-delivered metadata, canonical policy, BlogPosting JSON-LD,
// injection safety, llms.txt, sitemap and robots.txt.

import crypto from "crypto";
import {
  getGscConfig,
  runGscSync,
  GSC_NOT_CONFIGURED_REASON,
} from "../server/services/googleSearchConsole";
import { canonicalPath, canonicalUrl, CANONICAL_ORIGIN } from "../server/seo/canonical";
import { escapeHtml, safeJsonLd } from "../server/seo/meta";

const BASE_URL = "http://localhost:5000";
const KNOWN_SLUG = "bondedlove-relationship-tracking-app";

let pass = 0;
let fail = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}
function section(t: string) { console.log(`\n━━ ${t} ━━`); }

const realFetch = globalThis.fetch;
const ENV_KEYS = ["GOOGLE_SEARCH_CONSOLE_CREDENTIALS", "GSC_SITE_URL"] as const;
const savedEnv: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
function restoreEnv() { for (const k of ENV_KEYS) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; } }

async function main() {
  // ── A. GSC config parsing (unit) ──────────────────────────────────────────
  section("A. GSC configuration parsing");
  delete process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS;
  delete process.env.GSC_SITE_URL;
  let cfg = getGscConfig();
  check("missing env → not configured with actionable reason", !cfg.configured && cfg.reason === GSC_NOT_CONFIGURED_REASON);

  process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS = "{not json";
  process.env.GSC_SITE_URL = "sc-domain:elevate360official.com";
  cfg = getGscConfig();
  check("malformed JSON → typed reason, no throw", !cfg.configured && /not valid JSON/.test((cfg as any).reason));

  process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS = JSON.stringify({ client_email: "x@y.iam.gserviceaccount.com" });
  cfg = getGscConfig();
  check("missing private_key → typed reason", !cfg.configured && /client_email\/private_key/.test((cfg as any).reason));

  const { privateKey: pkObj } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = pkObj.export({ type: "pkcs8", format: "pem" }).toString();
  const escapedPem = pem.replace(/\n/g, "\\n");
  process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS = JSON.stringify({ client_email: "sa@test.iam.gserviceaccount.com", private_key: pem }).replace(/\\n/g, "\\n");
  // JSON.stringify already produced \n escapes inside the string — emulate the
  // "pasted with literal \n" Render case explicitly:
  process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS = `{"client_email":"sa@test.iam.gserviceaccount.com","private_key":"${escapedPem}"}`;
  cfg = getGscConfig();
  check("valid creds with escaped \\n newlines → configured", cfg.configured === true);
  check("private key newlines restored", cfg.configured && cfg.config.privateKey.includes("\n") && cfg.config.privateKey.startsWith("-----BEGIN"));
  check("siteUrl taken from GSC_SITE_URL verbatim", cfg.configured && cfg.config.siteUrl === "sc-domain:elevate360official.com");

  // ── B. GSC sync error taxonomy + redaction (mocked fetch) ─────────────────
  section("B. GSC sync taxonomy (mocked Google API)");
  const FAKE_TOKEN = "ya29." + "A".repeat(80);
  type Scenario = "token401" | "query403" | "query429" | "ok";
  let scenario: Scenario = "token401";
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token")) {
      if (scenario === "token401") {
        return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Invalid JWT: " + "B".repeat(120) }), { status: 401 });
      }
      return new Response(JSON.stringify({ access_token: FAKE_TOKEN, expires_in: 3600 }), { status: 200 });
    }
    if (url.includes("searchconsole.googleapis.com")) {
      if (scenario === "query403") return new Response(JSON.stringify({ error: { code: 403, message: "User does not have sufficient permission for site. token=" + "C".repeat(90) } }), { status: 403 });
      if (scenario === "query429") return new Response(JSON.stringify({ error: { code: 429, message: "Quota exceeded" } }), { status: 429 });
      const body = JSON.parse(String(init?.body ?? "{}"));
      const dims: string[] = body.dimensions ?? [];
      const key2 = dims[1] === "query" ? "elevate360" : dims[1] === "page" ? `${CANONICAL_ORIGIN}/blog` : "USA";
      const rows = body.startRow > 0 ? [] : [{ keys: [dims[0] === "date" ? "2026-07-20" : "elevate360", key2], clicks: 5, impressions: 100, ctr: 0.05, position: 8.2 }];
      return new Response(JSON.stringify({ rows }), { status: 200 });
    }
    return realFetch(input, init);
  }) as typeof fetch;

  try {
    scenario = "token401";
    let run = await runGscSync({ days: 2 });
    check("token 401 → status error", run.status === "error");
    check("token failure classified auth_failed", /auth_failed/.test(run.reason ?? ""));
    check("token failure redacted (no 60+ char secrets)", !/[A-Za-z0-9_\-]{60,}/.test(run.reason ?? ""), run.reason);

    scenario = "query403";
    run = await runGscSync({ days: 2 });
    const errText = JSON.stringify(run.setErrors ?? run.reason ?? "");
    check("query 403 → error status, permission_denied kind", run.status === "error" && /permission_denied/.test(errText));
    check("403 message names service account + property", /sa@test\.iam\.gserviceaccount\.com/.test(errText) && /sc-domain:elevate360official\.com/.test(errText));
    check("403 snippet redacted", !/C{60,}/.test(errText), errText.slice(0, 200));

    scenario = "query429";
    run = await runGscSync({ days: 2 });
    check("query 429 → rate_limited kind", run.status === "error" && /rate_limited/.test(JSON.stringify(run.setErrors ?? run.reason ?? "")));

    scenario = "ok";
    run = await runGscSync({ days: 2 });
    check("mocked success → status success", run.status === "success", JSON.stringify(run.setErrors ?? {}));
    check("mocked success imported rows", run.rows.queries > 0 && run.rows.pages > 0);
  } finally {
    globalThis.fetch = realFetch;
    restoreEnv();
  }

  // ── C. Canonical policy (unit) ────────────────────────────────────────────
  section("C. Canonical policy");
  check("home keeps trailing slash", canonicalUrl("/") === `${CANONICAL_ORIGIN}/`);
  check("strips query + tracking params", canonicalUrl("/blog?utm_source=x&fbclid=1") === `${CANONICAL_ORIGIN}/blog`);
  check("strips fragments", canonicalUrl("/guide#top") === `${CANONICAL_ORIGIN}/guide`);
  check("strips trailing slash on non-home", canonicalUrl("/blog/") === `${CANONICAL_ORIGIN}/blog`);
  check("collapses duplicate slashes", canonicalPath("//blog///post") === "/blog/post");
  check("never canonicalizes a route to homepage", canonicalUrl("/about-founder") === `${CANONICAL_ORIGIN}/about-founder`);

  // ── D. Escaping (unit) ────────────────────────────────────────────────────
  section("D. Escaping");
  check("escapeHtml neutralizes tags/quotes", escapeHtml(`<img src=x onerror="a('b')">`) === "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;");
  const ld = safeJsonLd({ headline: `Bad</script><script>alert(1)</script>` });
  check("safeJsonLd cannot close its script tag", !ld.includes("</script") && ld.includes("\\u003c"));

  // ── E. Server-delivered metadata (HTTP) ───────────────────────────────────
  section("E. Server-delivered metadata");
  const get = async (p: string) => { const r = await realFetch(`${BASE_URL}${p}`); return { status: r.status, ct: r.headers.get("content-type") ?? "", text: await r.text() }; };

  const home = await get("/");
  check("/ title", home.text.includes("<title>Elevate360Official | Empowering Lives Through Technology &amp; Words</title>"));
  check("/ canonical", home.text.includes(`<link rel="canonical" href="${CANONICAL_ORIGIN}/" />`));

  const routes: Array<[string, string]> = [
    ["/blog", "Blog | Elevate360Official"],
    ["/about-founder", "About Oladele Oyeniyi | Elevate360Official"],
    ["/founder", "Founder Authority | Oladele Oyeniyi — Elevate360Official"],
    ["/guide", "Guide | Elevate360Official"],
    ["/knowledge", "Knowledge Center | Elevate360Official"],
    ["/links", "Links | Elevate360Official"],
    ["/press-kit", "Press Kit | Elevate360Official"],
    ["/marketplace", "Marketplace | Elevate360Official"],
    ["/strategy-session", "Strategy Session | Elevate360Official"],
  ];
  const seen = new Map<string, string>();
  for (const [p, title] of routes) {
    const r = await get(p);
    const esc = escapeHtml(title);
    check(`${p} unique title + self-canonical`, r.text.includes(`<title>${esc}</title>`) && r.text.includes(`href="${CANONICAL_ORIGIN}${p}"`));
    const m = r.text.match(/<meta name="description" content="([^"]*)"/);
    check(`${p} description present & unique`, !!m && m[1].length >= 50 && !Array.from(seen.values()).includes(m[1]), m?.[1]?.slice(0, 60));
    if (m) seen.set(p, m[1]);
  }

  // ── F. BlogPosting JSON-LD (HTTP) ─────────────────────────────────────────
  section("F. BlogPosting structured data");
  const post = await get(`/blog/${KNOWN_SLUG}`);
  const canonical = `${CANONICAL_ORIGIN}/blog/${KNOWN_SLUG}`;
  check("article self-canonical", post.text.includes(`<link rel="canonical" href="${canonical}" />`));
  check("article og:type=article", post.text.includes(`<meta property="og:type" content="article" />`));
  const ldMatch = post.text.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"BlogPosting".*?)<\/script>/);
  check("BlogPosting JSON-LD delivered in initial HTML", !!ldMatch);
  if (ldMatch) {
    const node = JSON.parse(ldMatch[1]);
    check("@id = canonical#article", node["@id"] === `${canonical}#article`);
    check("headline present", typeof node.headline === "string" && node.headline.length > 0);
    check("author = Person Oladele Oyeniyi → /about-founder", node.author?.["@type"] === "Person" && node.author?.name === "Oladele Oyeniyi" && node.author?.url === `${CANONICAL_ORIGIN}/about-founder`);
    check("publisher Organization with logo", node.publisher?.["@type"] === "Organization" && node.publisher?.logo?.url?.includes("/social-preview/"));
    check("datePublished/dateModified from real columns", typeof node.datePublished === "string" && typeof node.dateModified === "string");
    check("no fabricated image/keywords fields", !("image" in node) && !("keywords" in node));
    check("mainEntityOfPage canonical", node.mainEntityOfPage?.["@id"] === canonical);
  }
  check("no duplicate client Article JSON-LD source", (post.text.match(/"@type":"(Article|BlogPosting)"/g) ?? []).length === 1);

  const missing = await get("/blog/this-post-does-not-exist");
  check("unknown slug → blog fallback, no article node", missing.text.includes("<title>Blog Post | Elevate360Official</title>") && !missing.text.includes('"@type":"BlogPosting"'));
  check("unknown slug canonical falls back to /blog", missing.text.includes(`href="${CANONICAL_ORIGIN}/blog"`));

  // ── G. Injection safety ───────────────────────────────────────────────────
  section("G. Injection safety");
  const inj = await get(`/blog/${encodeURIComponent('"><script>alert(31337)</script>')}`);
  check("hostile slug not reflected", !inj.text.includes("alert(31337)"));
  const unknown = await get("/definitely-not-a-real-route-xyz");
  check("unknown route keeps safe home defaults", unknown.text.includes(`href="${CANONICAL_ORIGIN}/"`) && !unknown.text.includes("not-a-real-route"));

  // ── H. llms.txt / sitemap / robots ────────────────────────────────────────
  section("H. llms.txt, sitemap, robots");
  const llms = await get("/llms.txt");
  check("llms.txt 200 text/plain", llms.status === 200 && llms.ct.includes("text/plain"));
  check("llms.txt canonical URLs + orientation wording", llms.text.includes(`${CANONICAL_ORIGIN}/blog`) && /machine-readable discovery and orientation/.test(llms.text));
  check("llms.txt exposes no APIs/dashboards/env names", !/\/api\/|dashboard|DASHBOARD_PIN|SESSION_SECRET|CREDENTIALS/i.test(llms.text));
  check("llms.txt makes no ranking claims", !/rank|SEO standard/i.test(llms.text));

  const sm = await get("/sitemap.xml");
  check("sitemap has no #fragment URLs", !sm.text.includes("#"));
  check("sitemap gained /about-founder and /guide", sm.text.includes(`${CANONICAL_ORIGIN}/about-founder`) && sm.text.includes(`${CANONICAL_ORIGIN}/guide`));
  check("sitemap includes published article", sm.text.includes(canonical));
  check("all sitemap locs on canonical origin", (sm.text.match(/<loc>([^<]+)<\/loc>/g) ?? []).every((l) => l.includes(CANONICAL_ORIGIN)));

  const robots = await get("/robots.txt");
  check("robots allows all + references sitemap and llms.txt", /Allow: \//.test(robots.text) && robots.text.includes("sitemap.xml") && robots.text.includes("llms.txt") && !/Disallow: \/llms/.test(robots.text));

  // ── I. API fallback regression guard ──────────────────────────────────────
  section("I. Regression guards");
  const blogApi = await realFetch(`${BASE_URL}/api/blog/${KNOWN_SLUG}`);
  check("blog API still JSON", (blogApi.headers.get("content-type") ?? "").includes("application/json"));
  const spa = await get("/api/definitely-not-real");
  check("note: unregistered /api/* served as SPA shell (known: assert JSON CT in API tests)", spa.status === 200);

  console.log(`\n══════ RESULT: ${pass} passed, ${fail} failed ══════`);
  if (fail) { console.log("Failures:", failures.join(" | ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { restoreEnv(); globalThis.fetch = realFetch; console.error("FATAL:", e); process.exit(1); });
