import type { WebOpsCrawlPage, WebOpsCrawlReport } from "./readOnlyCrawler";

export type WebOpsSeverity = "info" | "low" | "medium" | "high" | "critical";
export type WebOpsDisposition = "observe_only" | "candidate_low_risk" | "requires_founder_approval";

export type WebOpsFindingCode =
  | "crawl_empty"
  | "crawl_truncated"
  | "request_failed"
  | "request_timeout"
  | "response_too_large"
  | "redirect_target_rejected"
  | "http_4xx"
  | "http_5xx"
  | "slow_response"
  | "rejected_seed_or_redirect";

export interface WebOpsFindingEvidence {
  url?: string;
  target?: string;
  status?: number | null;
  durationMs?: number;
  error?: WebOpsCrawlPage["error"];
  reason?: string;
}

export interface WebOpsFinding {
  id: string;
  code: WebOpsFindingCode;
  severity: WebOpsSeverity;
  title: string;
  summary: string;
  disposition: WebOpsDisposition;
  productionApprovalRequired: boolean;
  automaticRemediationAllowed: false;
  evidence: Readonly<WebOpsFindingEvidence>;
}

export interface WebOpsDiagnosis {
  findings: readonly WebOpsFinding[];
  counts: Readonly<Record<WebOpsSeverity, number>>;
  highestSeverity: WebOpsSeverity | null;
  readOnly: true;
}

const severityRank: Record<WebOpsSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function stableToken(value: string): string {
  return encodeURIComponent(value.toLowerCase()).replace(/%/g, "_");
}

function makeFinding(
  code: WebOpsFindingCode,
  severity: WebOpsSeverity,
  summary: string,
  evidence: WebOpsFindingEvidence,
  disposition: WebOpsDisposition = "requires_founder_approval",
): WebOpsFinding {
  const identity = evidence.url ?? evidence.target ?? code;
  return Object.freeze({
    id: `${code}:${stableToken(identity)}`,
    code,
    severity,
    title: code.replaceAll("_", " "),
    summary,
    disposition,
    productionApprovalRequired: disposition === "requires_founder_approval",
    automaticRemediationAllowed: false as const,
    evidence: Object.freeze({ ...evidence }),
  });
}

function diagnosePage(page: WebOpsCrawlPage): WebOpsFinding[] {
  const findings: WebOpsFinding[] = [];

  if (page.error === "request_failed") {
    findings.push(makeFinding(
      "request_failed",
      "high",
      "The crawler could not complete the request.",
      { url: page.url, status: page.status, durationMs: page.durationMs, error: page.error },
    ));
  } else if (page.error === "timeout") {
    findings.push(makeFinding(
      "request_timeout",
      "high",
      "The request exceeded the configured crawler timeout.",
      { url: page.url, status: page.status, durationMs: page.durationMs, error: page.error },
    ));
  } else if (page.error === "response_too_large") {
    findings.push(makeFinding(
      "response_too_large",
      "medium",
      "The response exceeded the crawler response-size safety limit.",
      { url: page.url, status: page.status, durationMs: page.durationMs, error: page.error },
    ));
  } else if (page.error === "redirect_target_rejected") {
    findings.push(makeFinding(
      "redirect_target_rejected",
      "high",
      "A redirect attempted to leave the approved origin boundary or otherwise violated crawl policy.",
      { url: page.url, status: page.status, durationMs: page.durationMs, error: page.error },
    ));
  }

  if (page.status !== null && page.status >= 500) {
    findings.push(makeFinding(
      "http_5xx",
      "high",
      `The page returned HTTP ${page.status}.`,
      { url: page.url, status: page.status, durationMs: page.durationMs },
    ));
  } else if (page.status !== null && page.status >= 400) {
    findings.push(makeFinding(
      "http_4xx",
      "medium",
      `The page returned HTTP ${page.status}.`,
      { url: page.url, status: page.status, durationMs: page.durationMs },
      "candidate_low_risk",
    ));
  }

  if (page.durationMs >= 5000) {
    findings.push(makeFinding(
      "slow_response",
      "medium",
      "The response time exceeded 5 seconds.",
      { url: page.url, status: page.status, durationMs: page.durationMs },
      "observe_only",
    ));
  } else if (page.durationMs >= 2500) {
    findings.push(makeFinding(
      "slow_response",
      "low",
      "The response time exceeded 2.5 seconds.",
      { url: page.url, status: page.status, durationMs: page.durationMs },
      "observe_only",
    ));
  }

  return findings;
}

export function diagnoseCrawlReport(report: WebOpsCrawlReport): WebOpsDiagnosis {
  const findings: WebOpsFinding[] = [];

  if (report.pages.length === 0) {
    findings.push(makeFinding(
      "crawl_empty",
      "high",
      "The crawl produced no page observations.",
      {},
    ));
  }

  if (report.truncated) {
    findings.push(makeFinding(
      "crawl_truncated",
      "info",
      "The crawl reached its configured page bound before exhausting the queue.",
      {},
      "observe_only",
    ));
  }

  for (const page of report.pages) findings.push(...diagnosePage(page));

  for (const rejected of report.rejectedTargets) {
    findings.push(makeFinding(
      "rejected_seed_or_redirect",
      "medium",
      "A seed or redirect target was rejected by the crawl policy.",
      { target: rejected.target, reason: rejected.reason },
    ));
  }

  const counts: Record<WebOpsSeverity, number> = {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  let highestSeverity: WebOpsSeverity | null = null;

  for (const finding of findings) {
    counts[finding.severity]++;
    if (highestSeverity === null || severityRank[finding.severity] > severityRank[highestSeverity]) {
      highestSeverity = finding.severity;
    }
  }

  return Object.freeze({
    findings: Object.freeze([...findings]),
    counts: Object.freeze({ ...counts }),
    highestSeverity,
    readOnly: true as const,
  });
}
