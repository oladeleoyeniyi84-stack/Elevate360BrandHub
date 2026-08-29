import { CANONICAL_ORIGIN } from "./seo/canonical";
import { KNOWLEDGE_ARTICLES, PUBLIC_ROUTES } from "@shared/publicRoutes";

const BASE_URL = CANONICAL_ORIGIN;

interface SitemapUrl {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

function buildSitemap(urls: SitemapUrl[]): string {
  const today = new Date().toISOString().split("T")[0];
  const urlEntries = urls
    .map(
      ({ loc, changefreq, priority, lastmod }) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod ?? today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>`;
}

interface BlogPostEntry {
  slug: string;
  updatedAt: Date | string;
}

export function generateSitemap(blogPosts: BlogPostEntry[] = []): string {
  const today = new Date().toISOString().split("T")[0];

  // Canonical URLs only — no fragments (they duplicate the homepage) and no
  // dashboards/admin/API/auth routes. Phase 72.4.1 canonical policy.
  const staticUrls: SitemapUrl[] = PUBLIC_ROUTES.map((route) => ({
    loc: route.path === "/" ? `${BASE_URL}/` : `${BASE_URL}${route.path}`,
    changefreq: route.changefreq,
    priority: route.priority,
  }));
  const knowledgeUrls: SitemapUrl[] = KNOWLEDGE_ARTICLES.map(([slug, , , date]) => ({
    loc: `${BASE_URL}/knowledge/${slug}`,
    changefreq: "monthly",
    priority: "0.6",
    lastmod: date,
  }));

  const blogUrls: SitemapUrl[] = blogPosts.map((post) => ({
    loc: `${BASE_URL}/blog/${post.slug}`,
    changefreq: "monthly",
    priority: "0.7",
    lastmod: post.updatedAt
      ? new Date(post.updatedAt).toISOString().split("T")[0]
      : today,
  }));

  return buildSitemap([...staticUrls, ...knowledgeUrls, ...blogUrls]);
}
