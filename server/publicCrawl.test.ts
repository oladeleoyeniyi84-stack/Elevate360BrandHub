import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applySeoHead } from "./seo/injectHead";
import { canonicalUrl } from "./seo/canonical";
import { resolveRouteMeta } from "./seo/meta";
import { isKnownSpaRoute } from "./seo/spaRoutes";
import { buildLlmsTxt } from "./seo/llms";
import { generateSitemap } from "./sitemap";
import { resolveConciergePagePath } from "@shared/conciergeContext";
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

test("hermetic public-route crawl: retired guide alias stays 404 while canonical guide route remains live", async () => {
  assert.equal(await isKnownSpaRoute("/ai-growth-guide"), true);
  assert.equal(await isKnownSpaRoute("/guide"), false);
  assert.equal(PUBLIC_ROUTES.some((route) => route.path === "/ai-growth-guide"), true);
  assert.equal(PUBLIC_ROUTES.some((route) => route.path === "/guide"), false);
  assert.equal(resolveConciergePagePath("/ai-growth-guide"), "/ai-growth-guide");
  assert.equal(resolveConciergePagePath("/guide"), null);
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
  assert.doesNotMatch(sitemap, /https:\/\/www\.elevate360official\.com\/guide(?:<|\s|$)/);

  const llms = buildLlmsTxt();
  assert.match(llms, /https:\/\/www\.elevate360official\.com\/sitemap\.xml/);
  assert.doesNotMatch(llms, /dashboard|\/api\//i);
});
test("homepage and press kit do not advertise unsupported trust metrics", () => {
  const home = readFileSync(resolve("client/src/pages/Home.tsx"), "utf8");
  const pressKit = readFileSync(resolve("client/src/pages/PressKit.tsx"), "utf8");
  const faq = readFileSync(resolve("client/src/components/FAQSection.tsx"), "utf8");
  const audience = readFileSync(resolve("client/src/components/WhoWeHelpSection.tsx"), "utf8");
  const work = readFileSync(resolve("client/src/pages/Work.tsx"), "utf8");

  for (const page of [home, pressKit]) {
    assert.doesNotMatch(page, /10,000\+|10K\+|4\.9 average rating|Trusted by Thousands|Amazon Verified Purchase/);
  }
  assert.doesNotMatch(home, /<Star|testimonialData|\/api\/testimonials|Verified Creator|Amazon Best Seller Picks/);
  assert.match(home, /label: "Founder"/);
  assert.match(pressKit, /"Founder"/);

  // The FAQ CTA must open a dialog directly instead of clicking a missing ID.
  assert.match(faq, /<ContactDialog>/);
  assert.doesNotMatch(faq, /getElementById\("contact-trigger"\)/);

  // Audience booking links must not depend on the consultations API returning data.
  assert.doesNotMatch(audience, /href: "#book-session"/);
  assert.match(audience, /href: "\/strategy-session"/);
  assert.doesNotMatch(home, /href="#book-session"|href: "#book-session"/);
  assert.doesNotMatch(work, /href="\/#contact"/);
  assert.match(work, /<ContactDialog>/);
});
