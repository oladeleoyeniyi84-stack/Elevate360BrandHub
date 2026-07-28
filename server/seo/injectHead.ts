// Phase 72.4.1 — swaps the <!-- seo:head:start/end --> region of the SPA
// template with per-route server-delivered metadata. Fail-open by design:
// any error leaves the template's safe home-page defaults untouched.

import { resolveRouteMeta, renderHeadHtml } from "./meta";

const REGION_RE = /<!-- seo:head:start[\s\S]*?<!-- seo:head:end -->/;

export async function applySeoHead(html: string, rawUrl: string): Promise<string> {
  try {
    const meta = await resolveRouteMeta(rawUrl);
    if (!meta || !REGION_RE.test(html)) return html;
    const block =
      `<!-- seo:head:start (server-rendered) -->\n    ` +
      renderHeadHtml(meta) +
      `\n    <!-- seo:head:end -->`;
    // Function replacement: title/description content must never be
    // interpreted as $-replacement patterns.
    return html.replace(REGION_RE, () => block);
  } catch {
    return html;
  }
}
