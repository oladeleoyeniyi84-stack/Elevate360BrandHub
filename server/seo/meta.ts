// Phase 72.4.1 — one reusable route→metadata resolver for server-delivered
// <head> content. Values for routes that also render a client <SEO> component
// mirror those components exactly, so the crawler-visible head and the
// hydrated head never disagree.

import { storage } from "../storage";
import { canonicalPath, canonicalUrl, CANONICAL_ORIGIN } from "./canonical";
import { getPublicProjects } from "@shared/flagshipProjects";
import { KNOWLEDGE_ARTICLES, PUBLIC_ROUTES } from "@shared/publicRoutes";

const SITE_NAME = "Elevate360Official";
const DEFAULT_IMAGE = `${CANONICAL_ORIGIN}/social-preview/elevate360-logo-share.png`;
const IMAGE_ALT = "Elevate360Official brand preview"; // matches client SEO.tsx

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** JSON-LD serializer that cannot terminate its own <script> block. */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export interface ResolvedMeta {
  title: string;
  description: string;
  canonical: string;
  ogType: "website" | "article";
  image: string;
  jsonLd?: unknown;
}

const STATIC_ROUTE_META = Object.fromEntries(
  [
    ...PUBLIC_ROUTES.filter((route) => route.path !== "/guide"),
    {
      path: "/ai-growth-guide",
      title: "Free AI Business Growth Blueprint 2026 | Elevate360Official",
      description:
        "Download Elevate360Official's free seven-page AI Business Growth Blueprint 2026 with 15 practical ways to save time, attract customers, and grow responsibly.",
      changefreq: "monthly" as const,
      priority: "0.8",
      ogType: "article" as const,
    },
  ].map((route) => [route.path, route]),
) as Record<string, (typeof PUBLIC_ROUTES)[number]>;

// Phase 72.6 — /work structured data. Built from the shared public project
// configuration (confidential records already excluded there). No fabricated
// ratings, awards, review counts, or metrics — names/descriptions/URLs only.
function buildWorkJsonLd(): Record<string, unknown> {
  const canonical = canonicalUrl("/work");
  const projects = getPublicProjects();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    name: "Our Work, Collaborations & Digital Projects",
    url: canonical,
    description:
      "Flagship platforms, strategic collaborations, current initiatives, and creative digital experiences built by Elevate360Official.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${CANONICAL_ORIGIN}/`,
      logo: { "@type": "ImageObject", url: DEFAULT_IMAGE },
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: projects.map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "CreativeWork",
          name: p.title,
          description: p.summary,
          url: p.externalUrl ?? canonical,
        },
      })),
    },
  };
}

function buildWebPageJsonLd(path: string, title: string, description: string): Record<string, unknown> {
  const canonical = canonicalUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    name: title,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${CANONICAL_ORIGIN}/` },
    publisher: { "@type": "Organization", name: SITE_NAME, url: `${CANONICAL_ORIGIN}/` },
  };
}

// Strict slug shape — anything else is treated as unknown, so request input
// is never reflected into the response head.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,199}$/;

function blogFallback(): ResolvedMeta {
  // Mirrors BlogPost.tsx's not-found fallbacks exactly.
  return {
    title: "Blog Post | Elevate360Official",
    description: "Read this article from Elevate360Official.",
    canonical: canonicalUrl("/blog"),
    ogType: "website",
    image: DEFAULT_IMAGE,
  };
}

interface BlogPostRow {
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export function buildBlogPostingJsonLd(post: BlogPostRow, canonical: string): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonical}#article`,
    headline: post.title,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    author: { "@type": "Person", name: "Oladele Oyeniyi", url: `${CANONICAL_ORIGIN}/about-founder` },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${CANONICAL_ORIGIN}/`,
      logo: { "@type": "ImageObject", url: DEFAULT_IMAGE },
    },
  };
  // Only real column data — no fabricated image/keywords (no such columns).
  if (post.excerpt) node.description = post.excerpt;
  if (post.createdAt) node.datePublished = new Date(post.createdAt).toISOString();
  if (post.updatedAt) node.dateModified = new Date(post.updatedAt).toISOString();
  if (post.category) node.articleSection = post.category;
  return node;
}

/**
 * Resolve metadata for a request URL. Returns null for unknown routes —
 * the template's home-page defaults then remain untouched.
 */
export async function resolveRouteMeta(rawUrl: string): Promise<ResolvedMeta | null> {
  const path = canonicalPath(rawUrl);

  const staticMeta = STATIC_ROUTE_META[path];
  if (staticMeta) {
    return {
      title: staticMeta.title,
      description: staticMeta.description,
      canonical: canonicalUrl(path),
      ogType: staticMeta.ogType ?? "website",
      image: DEFAULT_IMAGE,
        jsonLd: path === "/work"
          ? buildWorkJsonLd()
          : buildWebPageJsonLd(path, staticMeta.title, staticMeta.description),
    };
  }

  if (path.startsWith("/blog/")) {
    const slug = path.slice("/blog/".length);
    if (!SLUG_RE.test(slug)) return blogFallback();
    try {
      const post = await storage.getBlogPostBySlug(slug);
      if (!post || !post.published) return blogFallback();
      const canonical = canonicalUrl(`/blog/${post.slug}`); // slug from DB, not the request
      return {
        title: `${post.title} | ${SITE_NAME}`, // matches BlogPost.tsx
        description: post.excerpt || "Read this article from Elevate360Official.",
        canonical,
        ogType: "article",
        image: DEFAULT_IMAGE,
        jsonLd: buildBlogPostingJsonLd(post, canonical),
      };
    } catch {
      return blogFallback();
    }
  }

  if (path.startsWith("/knowledge/")) {
    const slug = path.slice("/knowledge/".length);
    const article = KNOWLEDGE_ARTICLES.find(([articleSlug]) => articleSlug === slug);
    if (!article) return null;
    const [, title, description, datePublished] = article;
    const canonical = canonicalUrl(path);
    return {
      title: `${title} | ${SITE_NAME}`,
      description,
      canonical,
      ogType: "article",
      image: DEFAULT_IMAGE,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${canonical}#article`,
        headline: title,
        description,
        datePublished,
        dateModified: datePublished,
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
        author: { "@type": "Person", name: "Oladele Oyeniyi", url: `${CANONICAL_ORIGIN}/about-founder` },
        publisher: { "@type": "Organization", name: SITE_NAME, url: `${CANONICAL_ORIGIN}/` },
      },
    };
  }

  return null;
}

export function renderHeadHtml(m: ResolvedMeta): string {
  const t = escapeHtml(m.title);
  const d = escapeHtml(m.description);
  const c = escapeHtml(m.canonical);
  const img = escapeHtml(m.image);
  const lines = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${c}" />`,
    `<meta property="og:type" content="${m.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${c}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:secure_url" content="${img}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtml(IMAGE_ALT)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ];
  if (m.jsonLd) {
    lines.push(`<script type="application/ld+json">${safeJsonLd(m.jsonLd)}</script>`);
  }
  return lines.join("\n    ");
}
