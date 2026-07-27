// Phase 72.4R — persisted SEO audits: metadata + social tags, JSON-LD
// structured data, and indexability (robots/sitemap/canonicals/redirects/
// internal links).
//
// Pages are fetched from this server's own HTTP surface — i.e. the HTML that
// social scrapers and non-JS crawlers actually receive. Client-side Helmet
// rewrites tags after hydration for JS-rendering crawlers (Googlebot); that
// distinction is disclosed in every audit payload rather than papered over.
//
// Bounded by design: page caps, per-fetch timeouts, and a total run budget.

import { storage } from "../storage";
import type { SeoSchemaType } from "@shared/schema";

const CANONICAL_BASE = "https://www.elevate360official.com";
const STATIC_PATHS = [
  "/", "/blog", "/knowledge", "/links", "/press-kit", "/founder",
  "/marketplace", "/about-founder", "/strategy-session", "/guide",
];
const MAX_BLOG_PAGES = 50;
const MAX_SITEMAP_URL_CHECKS = 100;
const MAX_INTERNAL_LINK_CHECKS = 150;
const MAX_REDIRECT_HOPS = 5;
const FETCH_TIMEOUT_MS = 8000;
const RUN_BUDGET_MS = 90_000;
const MAX_HTML_BYTES = 500_000;

// Advisory SEO length ranges (issues, not failures).
const TITLE_MIN = 15;
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 160;

const ASSET_EXT_RE = /\.(png|jpe?g|webp|gif|svg|ico|css|js|mjs|map|xml|txt|json|webmanifest|mp3|mp4|pdf|woff2?)$/i;

export const SEO_AUDIT_RENDER_NOTE =
  "Audits reflect the server-delivered HTML — exactly what social scrapers (Facebook, X, LinkedIn, Slack) " +
  "and non-JS crawlers receive. Client-side Helmet updates titles/meta after hydration, which JS-rendering " +
  "crawlers like Googlebot do see; gaps flagged here are real for non-rendering bots.";

function selfBaseUrl(): string {
  return `http://127.0.0.1:${process.env.PORT || 5000}`;
}

// ── Fetch with manual redirect following ────────────────────────────────────

interface FetchedPage {
  requestedUrl: string;
  status: number; // first response status
  finalStatus: number;
  hops: number; // number of redirects followed
  chain: string[]; // urls visited
  html: string | null; // only for final 200 text/html
}

async function fetchWithChain(url: string, wantBody: boolean): Promise<FetchedPage> {
  const chain: string[] = [url];
  let current = url;
  let firstStatus = 0;
  let finalStatus = 0;
  let hops = 0;
  let html: string | null = null;

  for (let i = 0; i <= MAX_REDIRECT_HOPS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Elevate360-SEO-Audit/1.0" },
      });
      if (i === 0) firstStatus = res.status;
      finalStatus = res.status;
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc || i === MAX_REDIRECT_HOPS) break;
        current = new URL(loc, current).toString();
        chain.push(current);
        hops++;
        continue;
      }
      if (wantBody && res.status === 200 && (res.headers.get("content-type") ?? "").includes("text/html")) {
        const text = await res.text();
        html = text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
      }
      break;
    } catch {
      if (i === 0) firstStatus = 0;
      finalStatus = 0;
      break;
    } finally {
      clearTimeout(timer);
    }
  }
  return { requestedUrl: url, status: firstStatus, finalStatus, hops, chain, html };
}

// ── Tolerant HTML extraction (no parser dependency) ─────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ").trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]) : null;
}

function extractMetaContent(html: string, attr: "name" | "property", key: string): string | null {
  const tagRe = new RegExp(`<meta\\s[^>]*${attr}=["']${escapeRe(key)}["'][^>]*>`, "i");
  const tag = html.match(tagRe)?.[0];
  if (!tag) return null;
  const content = tag.match(/content=["']([^"']*)["']/i);
  return content ? decodeEntities(content[1]) : null;
}

function extractCanonical(html: string): string | null {
  const linkRe = /<link\s[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0];
    if (/rel=["']canonical["']/i.test(tag)) {
      const href = tag.match(/href=["']([^"']*)["']/i);
      return href ? decodeEntities(href[1]) : null;
    }
  }
  return null;
}

function extractJsonLdBlocks(html: string): { parsed: unknown[]; parseErrors: number } {
  const parsed: unknown[] = [];
  let parseErrors = 0;
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      parsed.push(JSON.parse(m[1].trim()));
    } catch {
      parseErrors++;
    }
  }
  return { parsed, parseErrors };
}

function extractInternalLinks(html: string): string[] {
  const out = new Set<string>();
  const re = /<a\s[^>]*href=["'](\/[^"'#?\s]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    if (path.startsWith("//")) continue;
    if (path.startsWith("/api/")) continue;
    if (ASSET_EXT_RE.test(path)) continue;
    out.add(path === "" ? "/" : path);
  }
  return Array.from(out);
}

// ── JSON-LD schema walking + minimal validation ─────────────────────────────

interface FoundSchema {
  type: string;
  node: Record<string, unknown>;
}

function collectSchemaNodes(value: unknown, out: FoundSchema[]): void {
  if (Array.isArray(value)) {
    for (const v of value) collectSchemaNodes(v, out);
    return;
  }
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  const rawType = obj["@type"];
  const types = Array.isArray(rawType) ? rawType : rawType ? [rawType] : [];
  for (const t of types) {
    if (typeof t === "string") out.push({ type: t, node: obj });
  }
  if (obj["@graph"]) collectSchemaNodes(obj["@graph"], out);
}

/** Minimal required/recommended property validation per audited type. */
function validateSchemaNode(type: SeoSchemaType, node: Record<string, unknown>): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const has = (k: string) => node[k] !== undefined && node[k] !== null && node[k] !== "";
  const require = (k: string) => { if (!has(k)) issues.push(`missing required "${k}"`); };
  const recommend = (k: string) => { if (!has(k)) issues.push(`missing recommended "${k}"`); };

  switch (type) {
    case "Organization": require("name"); require("url"); recommend("logo"); break;
    case "Person": require("name"); recommend("url"); break;
    case "WebSite": require("name"); require("url"); break;
    case "BreadcrumbList": {
      const items = node["itemListElement"];
      if (!Array.isArray(items) || items.length === 0) issues.push('missing required "itemListElement"');
      break;
    }
    case "Article": require("headline"); recommend("datePublished"); recommend("author"); recommend("image"); break;
    case "FAQPage": {
      const main = node["mainEntity"];
      if (!main || (Array.isArray(main) && main.length === 0)) issues.push('missing required "mainEntity"');
      break;
    }
    case "Product": require("name"); recommend("offers"); recommend("image"); break;
    case "LocalBusiness": require("name"); require("address"); break;
  }
  const requiredMissing = issues.filter((i) => i.startsWith("missing required")).length;
  return { valid: requiredMissing === 0, issues };
}

/** Which schema types are *expected* per page kind — never over-required. */
function expectedSchemaTypes(path: string): SeoSchemaType[] {
  if (path === "/") return ["Organization", "WebSite", "Person"];
  if (path.startsWith("/blog/")) return ["Article"];
  // BreadcrumbList / FAQPage / Product / LocalBusiness are audited when found,
  // but not demanded anywhere they do not clearly apply.
  return [];
}

const AUDITED_TYPES: SeoSchemaType[] = [
  "Organization", "Person", "WebSite", "BreadcrumbList", "Article", "FAQPage", "Product", "LocalBusiness",
];

// ── Row shapes handed to storage ────────────────────────────────────────────

export interface PageAuditRow {
  path: string;
  httpStatus: number;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  descriptionLength: number;
  canonical: string | null;
  canonicalOk: boolean | null;
  robotsMeta: string | null;
  noindex: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  issues: string[];
}

export interface SchemaAuditRow {
  path: string;
  schemaType: string;
  expected: boolean;
  present: boolean;
  valid: boolean | null;
  issues: string[];
}

export interface IndexabilityRow {
  kind: string;
  url: string;
  ok: boolean;
  httpStatus: number | null;
  detail: string | null;
}

export interface SeoAuditResult {
  runId: number;
  status: "success" | "partial" | "error";
  pagesAudited: number;
  issuesFound: number;
}

// ── The audit run ────────────────────────────────────────────────────────────

export async function runSeoAudit(): Promise<SeoAuditResult> {
  const runId = await storage.createSeoAuditRun();
  const base = selfBaseUrl();
  const t0 = Date.now();
  const withinBudget = () => Date.now() - t0 < RUN_BUDGET_MS;

  const pageRows: PageAuditRow[] = [];
  const schemaRows: SchemaAuditRow[] = [];
  const indexRows: IndexabilityRow[] = [];
  const statusByPath = new Map<string, number>();
  const internalLinkPool = new Set<string>();
  let budgetExceeded = false;

  try {
    const posts = await storage.getBlogPosts(true);
    const paths = [
      ...STATIC_PATHS,
      ...posts.slice(0, MAX_BLOG_PAGES).map((p) => `/blog/${p.slug}`),
    ];

    // 1) Per-page metadata + social + structured-data audit.
    for (const path of paths) {
      if (!withinBudget()) { budgetExceeded = true; break; }
      const fetched = await fetchWithChain(`${base}${path}`, true);
      statusByPath.set(path, fetched.finalStatus);

      if (fetched.hops > 0) {
        indexRows.push({
          kind: "redirect",
          url: path,
          ok: fetched.hops <= 1 && fetched.finalStatus === 200,
          httpStatus: fetched.finalStatus,
          detail: `${fetched.hops} redirect hop(s): ${fetched.chain.join(" → ")}`.slice(0, 500),
        });
      }

      const issues: string[] = [];
      if (fetched.finalStatus !== 200) {
        issues.push(`page returned HTTP ${fetched.finalStatus || "unreachable"}`);
        pageRows.push({
          path, httpStatus: fetched.finalStatus, title: null, titleLength: 0,
          metaDescription: null, descriptionLength: 0, canonical: null, canonicalOk: null,
          robotsMeta: null, noindex: false, ogTitle: null, ogDescription: null, ogImage: null,
          twitterTitle: null, twitterDescription: null, twitterImage: null, issues,
        });
        continue;
      }

      const html = fetched.html ?? "";
      const title = extractTitle(html);
      const description = extractMetaContent(html, "name", "description");
      const canonical = extractCanonical(html);
      const robotsMeta = extractMetaContent(html, "name", "robots");
      const noindex = !!robotsMeta && /noindex/i.test(robotsMeta);
      const ogTitle = extractMetaContent(html, "property", "og:title");
      const ogDescription = extractMetaContent(html, "property", "og:description");
      const ogImage = extractMetaContent(html, "property", "og:image");
      const twitterTitle = extractMetaContent(html, "name", "twitter:title");
      const twitterDescription = extractMetaContent(html, "name", "twitter:description");
      const twitterImage = extractMetaContent(html, "name", "twitter:image");

      if (!title) issues.push("title missing");
      else if (title.length < TITLE_MIN) issues.push(`title short (${title.length} < ${TITLE_MIN})`);
      else if (title.length > TITLE_MAX) issues.push(`title long (${title.length} > ${TITLE_MAX})`);
      if (!description) issues.push("meta description missing");
      else if (description.length < DESC_MIN) issues.push(`description short (${description.length} < ${DESC_MIN})`);
      else if (description.length > DESC_MAX) issues.push(`description long (${description.length} > ${DESC_MAX})`);

      const expectedCanonical = `${CANONICAL_BASE}${path === "/" ? "/" : path}`;
      let canonicalOk: boolean | null = null;
      if (!canonical) {
        issues.push("canonical missing");
      } else {
        const normalize = (u: string) => u.replace(/\/+$/, "") || "/";
        canonicalOk = normalize(canonical) === normalize(expectedCanonical);
        if (!canonicalOk) {
          issues.push(`canonical points to ${canonical} (expected ${expectedCanonical})`);
          indexRows.push({
            kind: "canonical", url: path, ok: false, httpStatus: 200,
            detail: `canonical=${canonical} expected=${expectedCanonical}`.slice(0, 500),
          });
        }
      }
      if (noindex) {
        issues.push("robots meta contains noindex");
        indexRows.push({ kind: "noindex", url: path, ok: false, httpStatus: 200, detail: robotsMeta });
      }
      if (!ogTitle) issues.push("og:title missing");
      if (!ogDescription) issues.push("og:description missing");
      if (!ogImage) issues.push("og:image missing");
      if (!twitterTitle) issues.push("twitter:title missing");
      if (!twitterDescription) issues.push("twitter:description missing");
      if (!twitterImage) issues.push("twitter:image missing");

      pageRows.push({
        path, httpStatus: 200, title, titleLength: title?.length ?? 0,
        metaDescription: description, descriptionLength: description?.length ?? 0,
        canonical, canonicalOk, robotsMeta, noindex,
        ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, twitterImage, issues,
      });

      // Structured data on this page.
      const { parsed, parseErrors } = extractJsonLdBlocks(html);
      const found: FoundSchema[] = [];
      for (const block of parsed) collectSchemaNodes(block, found);
      const expected = expectedSchemaTypes(path);
      const foundByType = new Map<string, FoundSchema[]>();
      for (const f of found) {
        if (!foundByType.has(f.type)) foundByType.set(f.type, []);
        foundByType.get(f.type)!.push(f);
      }
      const typesToRecord = new Set<SeoSchemaType>([
        ...expected,
        ...AUDITED_TYPES.filter((t) => foundByType.has(t)),
      ]);
      for (const type of Array.from(typesToRecord)) {
        const nodes = foundByType.get(type) ?? [];
        if (nodes.length === 0) {
          schemaRows.push({
            path, schemaType: type, expected: expected.includes(type), present: false, valid: null,
            issues: [`expected for this page kind but not found in server-delivered HTML`],
          });
        } else {
          const results = nodes.map((n) => validateSchemaNode(type, n.node));
          const valid = results.every((r) => r.valid);
          const nodeIssues = results.flatMap((r) => r.issues);
          if (parseErrors > 0) nodeIssues.push(`${parseErrors} JSON-LD block(s) failed to parse`);
          schemaRows.push({
            path, schemaType: type, expected: expected.includes(type), present: true, valid,
            issues: nodeIssues.slice(0, 12),
          });
        }
      }
      if (parseErrors > 0 && typesToRecord.size === 0) {
        schemaRows.push({
          path, schemaType: "Organization", expected: false, present: false, valid: null,
          issues: [`${parseErrors} JSON-LD block(s) failed to parse`],
        });
      }

      for (const link of extractInternalLinks(html)) internalLinkPool.add(link);
    }

    // 2) robots.txt + sitemap.xml.
    let robotsTxtOk = false;
    let sitemapOk = false;
    let sitemapUrlCount = 0;
    let sitemapUrlsChecked = 0;

    if (withinBudget()) {
      const robots = await fetchWithChain(`${base}/robots.txt`, true);
      robotsTxtOk = robots.finalStatus === 200;
      const robotsBody = robots.html ?? "";
      const robotsDetail: string[] = [];
      if (robotsTxtOk) {
        // fetchWithChain only keeps text/html bodies; robots.txt is text/plain,
        // so refetch body cheaply when needed.
        const raw = robotsBody || (await (async () => {
          try {
            const res = await fetch(`${base}/robots.txt`, { headers: { "User-Agent": "Elevate360-SEO-Audit/1.0" } });
            return res.ok ? await res.text() : "";
          } catch { return ""; }
        })());
        if (!/sitemap\s*:/i.test(raw)) robotsDetail.push("no Sitemap: directive");
        if (/^\s*disallow:\s*\/\s*$/im.test(raw)) robotsDetail.push("contains global Disallow: /");
      }
      indexRows.push({
        kind: "robots_txt", url: "/robots.txt", ok: robotsTxtOk && !/global Disallow/.test(robotsDetail.join()),
        httpStatus: robots.finalStatus, detail: robotsDetail.join("; ") || null,
      });
    }

    if (withinBudget()) {
      let sitemapUrls: string[] = [];
      try {
        const res = await fetch(`${base}/sitemap.xml`, { headers: { "User-Agent": "Elevate360-SEO-Audit/1.0" } });
        if (res.ok) {
          const xml = await res.text();
          const locRe = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
          let m: RegExpExecArray | null;
          while ((m = locRe.exec(xml)) !== null) sitemapUrls.push(m[1]);
          sitemapOk = sitemapUrls.length > 0;
          sitemapUrlCount = sitemapUrls.length;
          indexRows.push({
            kind: "sitemap", url: "/sitemap.xml", ok: sitemapOk, httpStatus: res.status,
            detail: `${sitemapUrls.length} URLs`,
          });
        } else {
          indexRows.push({ kind: "sitemap", url: "/sitemap.xml", ok: false, httpStatus: res.status, detail: "sitemap.xml not available" });
        }
      } catch (err) {
        indexRows.push({ kind: "sitemap", url: "/sitemap.xml", ok: false, httpStatus: null, detail: `fetch failed: ${err instanceof Error ? err.message : "error"}`.slice(0, 300) });
      }

      // 3) Sitemap URL validity — checked against this server by path.
      const seenPaths = new Set<string>();
      for (const raw of sitemapUrls.slice(0, MAX_SITEMAP_URL_CHECKS)) {
        if (!withinBudget()) { budgetExceeded = true; break; }
        let path: string;
        try {
          path = new URL(raw).pathname || "/";
        } catch {
          indexRows.push({ kind: "sitemap_url", url: raw.slice(0, 500), ok: false, httpStatus: null, detail: "malformed URL in sitemap" });
          continue;
        }
        if (seenPaths.has(path)) continue;
        seenPaths.add(path);
        sitemapUrlsChecked++;
        const cached = statusByPath.get(path);
        if (cached !== undefined) {
          if (cached !== 200) indexRows.push({ kind: "sitemap_url", url: path, ok: false, httpStatus: cached, detail: "sitemap URL returns non-200" });
          continue;
        }
        const check = await fetchWithChain(`${base}${path}`, false);
        statusByPath.set(path, check.finalStatus);
        if (check.hops > 0) {
          indexRows.push({
            kind: "redirect", url: path, ok: check.hops <= 1 && check.finalStatus === 200,
            httpStatus: check.finalStatus, detail: `${check.hops} redirect hop(s) from sitemap URL`.slice(0, 300),
          });
        }
        if (check.finalStatus !== 200) {
          indexRows.push({ kind: "sitemap_url", url: path, ok: false, httpStatus: check.finalStatus, detail: "sitemap URL returns non-200" });
        }
      }
    }

    // 4) Broken internal destinations (from audited pages' server HTML).
    let internalLinksChecked = 0;
    for (const link of Array.from(internalLinkPool).slice(0, MAX_INTERNAL_LINK_CHECKS)) {
      if (!withinBudget()) { budgetExceeded = true; break; }
      if (statusByPath.has(link)) {
        internalLinksChecked++;
        const st = statusByPath.get(link)!;
        if (st !== 200) indexRows.push({ kind: "internal_link", url: link, ok: false, httpStatus: st, detail: "internal link destination returns non-200" });
        continue;
      }
      const check = await fetchWithChain(`${base}${link}`, false);
      statusByPath.set(link, check.finalStatus);
      internalLinksChecked++;
      if (check.finalStatus !== 200) {
        indexRows.push({ kind: "internal_link", url: link, ok: false, httpStatus: check.finalStatus, detail: "internal link destination returns non-200" });
      }
    }

    // 5) Persist everything (chunked in storage).
    await storage.insertSeoPageAudits(runId, pageRows);
    await storage.insertSeoSchemaAudits(runId, schemaRows);
    await storage.insertSeoIndexabilityAudits(runId, indexRows);

    const issuesFound =
      pageRows.reduce((n, r) => n + r.issues.length, 0) +
      schemaRows.filter((r) => (r.expected && !r.present) || r.valid === false).length +
      indexRows.filter((r) => !r.ok).length;

    const status = budgetExceeded ? "partial" : "success";
    await storage.finishSeoAuditRun(runId, {
      status,
      pagesAudited: pageRows.length,
      issuesFound,
      detail: {
        renderMode: "server_html",
        robotsTxtOk,
        sitemapOk,
        sitemapUrlCount,
        sitemapUrlsChecked,
        internalLinksChecked,
        budgetExceeded,
      },
    });
    return { runId, status, pagesAudited: pageRows.length, issuesFound };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await storage.finishSeoAuditRun(runId, { status: "error", errorText: message.slice(0, 2000) }).catch(() => {});
    return { runId, status: "error", pagesAudited: pageRows.length, issuesFound: 0 };
  }
}
