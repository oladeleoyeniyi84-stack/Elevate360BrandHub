import type { WebOpsCrawlReport } from "./readOnlyCrawler";

export type WebOpsFindingSeverity = "info" | "warning" | "critical";

export type WebOpsFindingKind =
  | "request_failure"
  | "http_4xx"
  | "http_5xx"
  | "slow_response"
  | "response_too_large"
  | "redirect_target_rejected"
  | "rejected_target"
  | "crawl_truncated";

export interface WebOpsFinding {
  key: string;
  kind: WebOpsFindingKind;
  severity: WebOpsFindingSeverity;
  url?: string;
  evidence: string;
}

export interface WebOpsCrawlSummary {
  totalPages: number;
  successfulPages: number;
  redirectPages: number;
  clientErrorPages: number;
  serverErrorPages: number;
  requestFailures: number;
  rejectedTargets: number;
  averageDurationMs: number;
  maxDurationMs: number;
  truncated: boolean;
  readOnly: true;
}

function isRedirectStatus(status: number | null): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function findingKey(kind: WebOpsFindingKind, target: string): string {
  return `${kind}:${target}`;
}

/**
 * Convert a raw read-only crawl report into stable dashboard metrics.
 * This function is deterministic and has no I/O or remediation side effects.
 */
export function summarizeCrawlReport(report: WebOpsCrawlReport): WebOpsCrawlSummary {
  let successfulPages = 0;
  let redirectPages = 0;
  let clientErrorPages = 0;
  let serverErrorPages = 0;
  let requestFailures = 0;
  let totalDurationMs = 0;
  let maxDurationMs = 0;

  for (const page of report.pages) {
    totalDurationMs += page.durationMs;
    maxDurationMs = Math.max(maxDurationMs, page.durationMs);

    if (page.status === null) {
      requestFailures++;
      continue;
    }
    if (isRedirectStatus(page.status)) redirectPages++;
    else if (page.status >= 500) serverErrorPages++;
    else if (page.status >= 400) clientErrorPages++;
    else if (page.status >= 200 && page.status < 400) successfulPages++;
  }

  return {
    totalPages: report.pages.length,
    successfulPages,
    redirectPages,
    clientErrorPages,
    serverErrorPages,
    requestFailures,
    rejectedTargets: report.rejectedTargets.length,
    averageDurationMs: report.pages.length === 0 ? 0 : Math.round(totalDurationMs / report.pages.length),
    maxDurationMs,
    truncated: report.truncated,
    readOnly: true,
  };
}

/**
 * Derive deterministic findings from crawl evidence for Phase 2 observability.
 * No AI inference, database writes, code changes, or remediation actions occur here.
 */
export function deriveCrawlFindings(
  report: WebOpsCrawlReport,
  slowResponseThresholdMs = 5_000,
): WebOpsFinding[] {
  const findings: WebOpsFinding[] = [];

  for (const page of report.pages) {
    if (page.error === "timeout" || page.error === "request_failed") {
      findings.push({
        key: findingKey("request_failure", page.url),
        kind: "request_failure",
        severity: "critical",
        url: page.url,
        evidence: page.error,
      });
    }

    if (page.error === "response_too_large") {
      findings.push({
        key: findingKey("response_too_large", page.url),
        kind: "response_too_large",
        severity: "warning",
        url: page.url,
        evidence: "response exceeded configured crawl size limit",
      });
    }

    if (page.error === "redirect_target_rejected") {
      findings.push({
        key: findingKey("redirect_target_rejected", page.url),
        kind: "redirect_target_rejected",
        severity: "warning",
        url: page.url,
        evidence: "redirect target failed the approved-origin policy",
      });
    }

    if (page.status !== null && page.status >= 500) {
      findings.push({
        key: findingKey("http_5xx", page.url),
        kind: "http_5xx",
        severity: "critical",
        url: page.url,
        evidence: `HTTP ${page.status}`,
      });
    } else if (page.status !== null && page.status >= 400) {
      findings.push({
        key: findingKey("http_4xx", page.url),
        kind: "http_4xx",
        severity: "warning",
        url: page.url,
        evidence: `HTTP ${page.status}`,
      });
    }

    if (page.durationMs >= slowResponseThresholdMs) {
      findings.push({
        key: findingKey("slow_response", page.url),
        kind: "slow_response",
        severity: "warning",
        url: page.url,
        evidence: `${page.durationMs}ms response time`,
      });
    }
  }

  for (const rejected of report.rejectedTargets) {
    findings.push({
      key: findingKey("rejected_target", rejected.target),
      kind: "rejected_target",
      severity: "info",
      url: rejected.target,
      evidence: rejected.reason,
    });
  }

  if (report.truncated) {
    findings.push({
      key: findingKey("crawl_truncated", "crawl"),
      kind: "crawl_truncated",
      severity: "info",
      evidence: "crawl stopped at configured safety bounds",
    });
  }

  return findings;
}
