// Phase 72.4.1 — one reusable route→metadata resolver for server-delivered
// <head> content. Values for routes that also render a client <SEO> component
// mirror those components exactly, so the crawler-visible head and the
// hydrated head never disagree.

import { storage } from "../storage";
import { canonicalPath, canonicalUrl, CANONICAL_ORIGIN } from "./canonical";
import { getPublicProjects } from "@shared/flagshipProjects";

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

// Static public routes. Titles/descriptions for pages with a client <SEO>
// component (/blog, /links, /press-kit, /marketplace, /founder) are verbatim
// copies of those components' props.
const STATIC_ROUTE_META: Record<string, { title: string; description: string; ogType?: "article" }> = {
  "/": {
    title: "Elevate360Official | Empowering Lives Through Technology & Words",
    description:
      "Elevate360Official by Oladele Oyeniyi — a digital brand ecosystem of mobile apps (Bondedlove, Healthwisesupport, Video Crafter), Amazon books, original music, and art. Empowering lives through technology and words.",
  },
  "/blog": {
    title: "Blog | Elevate360Official",
    description:
      "Read insights, inspiration, and updates from Elevate360Official on technology, creativity, wellness, relationships, and intentional growth.",
  },
  "/links": {
    title: "Links | Elevate360Official",
    description:
      "Explore all official Elevate360Official links — apps, books, music, art, and brand channels by Oladele Oyeniyi.",
  },
  "/press-kit": {
    title: "Press Kit | Elevate360Official",
    description:
      "Official press kit for Elevate360Official — founder profile, brand overview, product portfolio, and media assets.",
  },
  "/marketplace": {
    title: "Marketplace | Elevate360Official",
    description:
      "Premium digital products from Elevate360Official — tools, templates, and resources delivered instantly.",
  },
  "/founder": {
    title: "Founder Authority | Oladele Oyeniyi — Elevate360Official",
    description:
      "Media features, milestones, credentials, and awards establishing the authority of Oladele Oyeniyi, founder of Elevate360Official.",
    ogType: "article",
  },
  "/about-founder": {
    title: "About Oladele Oyeniyi | Elevate360Official",
    description:
      "Meet Oladele Oyeniyi — founder of Elevate360Official, author, app developer, artist and music producer empowering lives through technology and words.",
  },
  "/guide": {
    title: "Guide | Elevate360Official",
    description:
      "A practical guide to the Elevate360Official ecosystem — how to get the most from our apps, books, music and resources.",
  },
  "/knowledge": {
    title: "Knowledge Center | Elevate360Official",
    description:
      "Browse the Elevate360Official knowledge center — articles and resources on wellness, relationships, creativity and technology.",
  },
  "/strategy-session": {
    title: "Strategy Session | Elevate360Official",
    description:
      "Book a strategy session with Elevate360Official — personalized guidance on brand, content and digital product strategy.",
  },
  "/pricing": {
    title: "Pricing | Elevate360Official",
    description:
      "Simple, transparent pricing for Elevate360Official products and services — apps, digital products and consultations.",
  },
  "/work": {
    title: "Our Work, Collaborations & Digital Projects | Elevate360Official",
    description:
      "Explore Elevate360Official’s flagship platforms, AI systems, nonprofit collaborations, intelligent websites, digital experiences, analytics infrastructure, and current initiatives.",
  },
};

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
      jsonLd: path === "/work" ? buildWorkJsonLd() : undefined,
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
