import assert from "node:assert/strict";
import test from "node:test";
import { deriveCrawlFindings, summarizeCrawlReport } from "./webops/observability";
import type { WebOpsCrawlReport } from "./webops/readOnlyCrawler";

const report: WebOpsCrawlReport = {
  readOnly: true,
  truncated: true,
  rejectedTargets: [{ target: "http://localhost:3000/private", reason: "origin_not_approved" }],
  pages: [
    {
      url: "https://www.elevate360official.com/",
      depth: 0,
      status: 200,
      contentType: "text/html",
      durationMs: 120,
      linksDiscovered: 5,
    },
    {
      url: "https://www.elevate360official.com/missing",
      depth: 1,
      status: 404,
      contentType: "text/html",
      durationMs: 250,
      linksDiscovered: 0,
    },
    {
      url: "https://www.elevate360official.com/api-failure",
      depth: 1,
      status: 503,
      contentType: "text/html",
      durationMs: 6200,
      linksDiscovered: 0,
    },
    {
      url: "https://www.elevate360official.com/timeout",
      depth: 1,
      status: null,
      contentType: null,
      durationMs: 8000,
      linksDiscovered: 0,
      error: "timeout",
    },
  ],
};

test("WebOps Phase 2 summarizes crawl evidence without side effects", () => {
  assert.deepEqual(summarizeCrawlReport(report), {
    totalPages: 4,
    successfulPages: 1,
    redirectPages: 0,
    clientErrorPages: 1,
    serverErrorPages: 1,
    requestFailures: 1,
    rejectedTargets: 1,
    averageDurationMs: 3643,
    maxDurationMs: 8000,
    truncated: true,
    readOnly: true,
  });
});

test("WebOps Phase 2 derives deterministic dashboard findings", () => {
  const findings = deriveCrawlFindings(report);
  const kinds = findings.map((finding) => finding.kind);

  assert.ok(kinds.includes("http_4xx"));
  assert.ok(kinds.includes("http_5xx"));
  assert.ok(kinds.includes("request_failure"));
  assert.equal(kinds.filter((kind) => kind === "slow_response").length, 2);
  assert.ok(kinds.includes("rejected_target"));
  assert.ok(kinds.includes("crawl_truncated"));
  assert.equal(findings.some((finding) => finding.kind === "http_5xx" && finding.severity === "critical"), true);
});
