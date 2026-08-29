import { PUBLIC_ROUTE_PATHS, KNOWLEDGE_ARTICLE_SLUGS } from "@shared/publicRoutes";
import { canonicalPath } from "./canonical";
import { resolveRouteMeta } from "./meta";

// These are application surfaces that intentionally remain outside public
// discovery. They still need an SPA document for authenticated users, but are
// excluded from sitemap.xml, llms.txt, and robots.txt where applicable.
const APPLICATION_ROUTE_PATHS = new Set([
  "/dashboard", "/ops", "/growth", "/experiments", "/personalization", "/mesh",
  "/command-grid", "/orchestrator", "/revenue", "/executive", "/content-factory",
  "/authority", "/marketplace-admin", "/memory-explorer", "/founder-intelligence",
  "/revenue-intelligence", "/growth-automation", "/cognitive-os", "/funnel-analytics",
  "/revenue-analytics", "/search-intelligence", "/admin/ai-content", "/checkout/success",
  "/thank-you", "/account",
]);

/**
 * Whether a request is a real SPA route. Dynamic blog URLs are checked against
 * published storage data, so unpublished drafts and unknown slugs are HTTP
 * 404s rather than successful shells with a client-side error.
 */
export async function isKnownSpaRoute(rawUrl: string): Promise<boolean> {
  const path = canonicalPath(rawUrl);
  if (PUBLIC_ROUTE_PATHS.has(path) || APPLICATION_ROUTE_PATHS.has(path)) return true;
  if (path.startsWith("/knowledge/")) {
    return KNOWLEDGE_ARTICLE_SLUGS.has(path.slice("/knowledge/".length));
  }
  if (!path.startsWith("/blog/")) return false;
  const meta = await resolveRouteMeta(path);
  return Boolean(meta && meta.canonical === `https://www.elevate360official.com${path}`);
}