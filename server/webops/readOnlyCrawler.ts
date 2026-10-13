import { normalizeApprovedOrigins, validateCrawlTarget } from "./crawlPolicy";
import { assertPublicDnsResolution, systemDnsResolver, type DnsResolver } from "./networkGuard";
import { pinnedHttpsGet } from "./pinnedHttpsTransport";

export interface WebOpsCrawlPage {
  url: string;
  depth: number;
  status: number | null;
  contentType: string | null;
  durationMs: number;
  linksDiscovered: number;
  redirectTarget?: string;
  error?:
    | "request_failed"
    | "timeout"
    | "response_too_large"
    | "redirect_target_rejected"
    | "dns_resolution_rejected";
}

export interface WebOpsRejectedTarget {
  target: string;
  reason: string;
}

export interface WebOpsCrawlReport {
  pages: WebOpsCrawlPage[];
  rejectedTargets: WebOpsRejectedTarget[];
  truncated: boolean;
  readOnly: true;
}

export interface ReadOnlyCrawlerOptions {
  approvedOrigins: readonly string[];
  seedUrls: readonly string[];
  maxPages?: number;
  maxDepth?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  userAgent?: string;
  fetcher?: (url: string, init: RequestInit) => Promise<Response>;
  dnsResolver?: DnsResolver;
}

interface QueueItem {
  url: string;
  depth: number;
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value as number)));
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function readTextWithLimit(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) {
    if (response.body) await response.body.cancel().catch(() => undefined);
    throw new Error("response_too_large");
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("response_too_large");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

function extractReferences(html: string): string[] {
  const references: string[] = [];
  const attributePattern = /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/gi;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(html)) !== null) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (value) references.push(value);
  }

  return references;
}

/**
 * Read-only crawler for approved public HTTPS origins.
 *
 * Safety properties:
 * - exact-origin allowlist; redirects are never followed automatically;
 * - DNS validation rejects private/reserved/non-public resolved addresses;
 * - the default HTTPS transport pins the connection to the validated address,
 *   preventing a second DNS lookup between validation and connection;
 * - bounded page count, depth, response size and per-request timeout;
 * - sequential requests (concurrency is fixed at one);
 * - only GET requests; no cookies or production credentials;
 * - no database writes, code changes, or remediation actions.
 *
 * Infrastructure-level outbound firewall/egress policy remains an independent
 * defense-in-depth control before a production autonomous pilot.
 */
export async function crawlApprovedPublicPages(
  options: ReadOnlyCrawlerOptions,
): Promise<WebOpsCrawlReport> {
  const approvedOrigins = normalizeApprovedOrigins(options.approvedOrigins);
  const maxPages = boundedInteger(options.maxPages, 25, 1, 100);
  const maxDepth = boundedInteger(options.maxDepth, 2, 0, 3);
  const timeoutMs = boundedInteger(options.timeoutMs, 8000, 1000, 15000);
  const maxResponseBytes = boundedInteger(options.maxResponseBytes, 512_000, 1024, 1_000_000);
  const dnsResolver = options.dnsResolver ?? systemDnsResolver;
  const userAgent = options.userAgent ?? "Elevate360WebOps/0.3 (read-only site health crawler)";

  const queue: QueueItem[] = [];
  const visited = new Set<string>();
  const rejectedTargets: WebOpsRejectedTarget[] = [];
  const pages: WebOpsCrawlPage[] = [];

  for (const seed of options.seedUrls) {
    const decision = validateCrawlTarget(seed, approvedOrigins);
    if (decision.allowed) {
      queue.push({ url: decision.url, depth: 0 });
    } else {
      rejectedTargets.push({ target: seed, reason: decision.reason });
    }
  }

  let truncated = false;

  while (queue.length > 0) {
    if (pages.length >= maxPages) {
      truncated = true;
      break;
    }

    const item = queue.shift()!;
    if (visited.has(item.url)) continue;
    visited.add(item.url);

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    let dnsRejected = false;

    try {
      const hostname = new URL(item.url).hostname;
      let dnsRecords;
      try {
        dnsRecords = await assertPublicDnsResolution(hostname, dnsResolver);
      } catch (error) {
        dnsRejected = true;
        const reason = error instanceof Error ? error.message : "dns_resolution_failed";
        rejectedTargets.push({ target: item.url, reason });
        throw error;
      }

      const requestInit: RequestInit = {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml;q=0.9" },
      };
      const response = options.fetcher
        ? await options.fetcher(item.url, requestInit)
        : await pinnedHttpsGet(item.url, requestInit, dnsRecords);
      const durationMs = Date.now() - startedAt;
      const contentType = response.headers.get("content-type");
      const page: WebOpsCrawlPage = {
        url: item.url,
        depth: item.depth,
        status: response.status,
        contentType,
        durationMs,
        linksDiscovered: 0,
      };

      if (isRedirect(response.status)) {
        if (response.body) await response.body.cancel().catch(() => undefined);
        const location = response.headers.get("location");
        if (location) {
          const decision = validateCrawlTarget(location, approvedOrigins, item.url);
          if (!decision.allowed) {
            page.error = "redirect_target_rejected";
            rejectedTargets.push({ target: location, reason: decision.reason });
          } else {
            page.redirectTarget = decision.url;
            if (item.depth < maxDepth && !visited.has(decision.url)) {
              queue.push({ url: decision.url, depth: item.depth + 1 });
            }
          }
        }
        pages.push(page);
        continue;
      }

      if (response.ok && contentType && /text\/html|application\/xhtml\+xml/i.test(contentType)) {
        let html: string;
        try {
          html = await readTextWithLimit(response, maxResponseBytes);
        } catch (error) {
          if (error instanceof Error && error.message === "response_too_large") {
            page.error = "response_too_large";
            pages.push(page);
            continue;
          }
          throw error;
        }

        const refs = extractReferences(html);
        for (const ref of refs) {
          const decision = validateCrawlTarget(ref, approvedOrigins, item.url);
          if (!decision.allowed) continue;
          page.linksDiscovered++;
          if (item.depth < maxDepth && !visited.has(decision.url)) {
            queue.push({ url: decision.url, depth: item.depth + 1 });
          }
        }
      }

      if (!(response.ok && contentType && /text\/html|application\/xhtml\+xml/i.test(contentType))) {
        if (response.body) await response.body.cancel().catch(() => undefined);
      }
      pages.push(page);
    } catch {
      pages.push({
        url: item.url,
        depth: item.depth,
        status: null,
        contentType: null,
        durationMs: Date.now() - startedAt,
        linksDiscovered: 0,
        error: dnsRejected ? "dns_resolution_rejected" : controller.signal.aborted ? "timeout" : "request_failed",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return { pages, rejectedTargets, truncated, readOnly: true };
}
