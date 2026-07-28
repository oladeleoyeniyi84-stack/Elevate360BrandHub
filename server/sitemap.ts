import { CANONICAL_ORIGIN } from "./seo/canonical";

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
  const staticUrls: SitemapUrl[] = [
    { loc: `${BASE_URL}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${BASE_URL}/blog`, changefreq: "daily", priority: "0.9" },
    { loc: `${BASE_URL}/links`, changefreq: "monthly", priority: "0.8" },
    { loc: `${BASE_URL}/press-kit`, changefreq: "monthly", priority: "0.7" },
    { loc: `${BASE_URL}/founder`, changefreq: "monthly", priority: "0.8" },
    { loc: `${BASE_URL}/about-founder`, changefreq: "monthly", priority: "0.8" },
    { loc: `${BASE_URL}/marketplace`, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/guide`, changefreq: "monthly", priority: "0.7" },
    { loc: `${BASE_URL}/knowledge`, changefreq: "weekly", priority: "0.7" },
    { loc: `${BASE_URL}/strategy-session`, changefreq: "monthly", priority: "0.6" },
    { loc: `${BASE_URL}/pricing`, changefreq: "monthly", priority: "0.6" },
  ];

  const blogUrls: SitemapUrl[] = blogPosts.map((post) => ({
    loc: `${BASE_URL}/blog/${post.slug}`,
    changefreq: "monthly",
    priority: "0.7",
    lastmod: post.updatedAt
      ? new Date(post.updatedAt).toISOString().split("T")[0]
      : today,
  }));

  return buildSitemap([...staticUrls, ...blogUrls]);
}
