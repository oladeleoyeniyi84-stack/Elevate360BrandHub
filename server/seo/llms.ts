// Phase 72.4.1 — /llms.txt: a machine-readable discovery and orientation
// resource for automated agents. Public, factual, stable content only —
// no dashboards, APIs, credentials, env vars, or internal architecture.
// This is intentionally NOT described as a search-engine ranking standard.

import { CANONICAL_ORIGIN } from "./canonical";

export function buildLlmsTxt(): string {
  const u = (p: string) => (p === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${p}`);
  return `# Elevate360Official

> Empowering Lives Through Technology & Words.

This file is a machine-readable discovery and orientation resource describing
the public content of ${u("/")}. It lists real, public pages only.

## About

Elevate360Official is a digital brand ecosystem founded by Oladele Oyeniyi,
spanning mobile apps (Bondedlove, Healthwisesupport, Video Crafter),
Amazon-published books, original music, and visual art.

- Homepage: ${u("/")}

## Primary Services

- Flagship work, collaborations and current initiatives: ${u("/work")}
- Apps, books, music and art links hub: ${u("/links")}
- Marketplace: ${u("/marketplace")}
- Strategy sessions: ${u("/strategy-session")}
- Pricing: ${u("/pricing")}

## Founder

- About the founder (Oladele Oyeniyi): ${u("/about-founder")}
- Founder hub: ${u("/founder")}

## Key Resources

- Guide: ${u("/guide")}
- Knowledge center: ${u("/knowledge")}
- Press kit: ${u("/press-kit")}

## Published Content

- Blog (articles and updates): ${u("/blog")}
- Sitemap: ${u("/sitemap.xml")}

## Contact

- Contact form: ${u("/")} (contact section on the homepage)
`;
}
