import assert from "node:assert/strict";
import test from "node:test";
import { applySeoHead } from "./seo/injectHead";
import { canonicalUrl } from "./seo/canonical";
import { resolveRouteMeta } from "./seo/meta";
import { isKnownSpaRoute } from "./seo/spaRoutes";
import { buildLlmsTxt } from "./seo/llms";
import { generateSitemap } from "./sitemap";
import { KNOWLEDGE_ARTICLES, PUBLIC_ROUTES } from "@shared/publicRoutes";

const TEMPLATE = "<!doctype html><html><head><!-- seo:head:start --><!-- seo:head:end --></head><body></body></html>";

test("hermetic public-route crawl: every inventoried URL has a canonical HTML head", async () => {
  for (const route of PUBLIC_ROUTES) {
    const meta = await resolveRouteMeta(`${route.path}?utm_source=crawl`);
    assert.ok(meta, `metadata missing for ${route.path}`);
    assert.equal(meta.canonical, canonicalUrl(route.path));
    const html = await applySeoHead(TEMPLATE, route.path);
    assert.match(html, new RegExp(`<link rel="canonical" href="${meta.canonical}"`));
    assert.match(html, /<meta property="og:url"/);
    assert.match(html, /<meta name="twitter:card"/);
  }
});

test("hermetic public-route crawl: knowledge articles are indexable and structured", async () => {
  for (const [slug] of KNOWLEDGE_ARTICLES) {
    const path = `/knowledge/${slug}`;
    const meta = await resolveRouteMeta(path);
    assert.ok(meta?.jsonLd, `JSON-LD missing for ${path}`);
    assert.equal(meta?.canonical, canonicalUrl(path));
    assert.equal(await isKnownSpaRoute(path), true);
  }
});

test("hermetic public-route crawl: unknown pages and draft-shaped blog URLs are not SPA successes", async () => {
  assert.equal(await isKnownSpaRoute("/does-not-exist"), false);
  assert.equal(await isKnownSpaRoute("/knowledge/not-a-real-article"), false);
  // A malformed slug is rejected before any storage query; this makes the
  // assertion hermetic while exercising the draft/unknown blog route boundary.
  assert.equal(await isKnownSpaRoute("/blog/not%20a%20slug"), false);
});

test("sitemap, robots policy inputs, and llms discovery contain canonical public URLs only", () => {
  const sitemap = generateSitemap();
  for (const route of PUBLIC_ROUTES) {
    assert.match(sitemap, new RegExp(canonicalUrl(route.path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(sitemap, /\/knowledge\/building-a-digital-brand-that-lasts/);
  assert.doesNotMatch(sitemap, /\/dashboard|\/api\/|\/account/);

  const llms = buildLlmsTxt();
  assert.match(llms, /https:\/\/www\.elevate360official\.com\/sitemap\.xml/);
  assert.doesNotMatch(llms, /dashboard|\/api\//i);
});