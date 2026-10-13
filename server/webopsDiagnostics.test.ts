import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryWebOpsAuditSink } from "./webops/audit";
import { diagnoseCrawlReport } from "./webops/diagnostics";
import { runWebOpsDryDiagnosis } from "./webops/dryRunDiagnosis";
import type { WebOpsCrawlReport } from "./webops/readOnlyCrawler";

function report(overrides: Partial<WebOpsCrawlReport> = {}): WebOpsCrawlReport {
  return {
    pages: [],
    rejectedTargets: [],
    truncated: false,
    readOnly: true,
    ...overrides,
  };
}

test("WebOps diagnostics deterministically classify offline crawl evidence", () => {
  const diagnosis = diagnoseCrawlReport(report({
    pages: [
      {
        url: "https://www.elevate360official.com/missing",
        depth: 1,
        status: 404,
        contentType: "text/html",
        durationMs: 200,
        linksDiscovered: 0,
      },
      {
        url: "https://www.elevate360official.com/api-health",
        depth: 1,
        status: 503,
        contentType: "text/plain",
        durationMs: 6000,
        linksDiscovered: 0,
      },
      {
        url: "https://www.elevate360official.com/slow",
        depth: 1,
        status: null,
        contentType: null,
        durationMs: 8000,
        linksDiscovered: 0,
        error: "timeout",
      },
    ],
    rejectedTargets: [
      { target: "https://outside.example/redirect", reason: "origin_not_allowlisted" },
    ],
    truncated: true,
  }));

  assert.equal(diagnosis.readOnly, true);
  assert.equal(diagnosis.highestSeverity, "high");
  assert.equal(diagnosis.counts.info, 1);
  assert.equal(diagnosis.counts.medium, 4);
  assert.equal(diagnosis.counts.high, 2);
  assert.equal(diagnosis.findings.every((finding) => finding.automaticRemediationAllowed === false), true);

  const notFound = diagnosis.findings.find((finding) => finding.code === "http_4xx");
  assert.equal(notFound?.disposition, "candidate_low_risk");
  assert.equal(notFound?.productionApprovalRequired, true);

  assert.equal(Object.isFrozen(diagnosis), true);
  assert.equal(Object.isFrozen(diagnosis.findings), true);
  assert.equal(Object.isFrozen(diagnosis.findings[0]?.evidence), true);
});

test("WebOps dry-run diagnosis records immutable append-only audit evidence without remediation", () => {
  const sink = new InMemoryWebOpsAuditSink();
  const result = runWebOpsDryDiagnosis({
    report: report({
      pages: [
        {
          url: "https://www.elevate360official.com/broken",
          depth: 0,
          status: 500,
          contentType: "text/html",
          durationMs: 100,
          linksDiscovered: 0,
        },
      ],
    }),
    auditSink: sink,
    correlationId: "phase2-test-001",
    subject: "fixture://phase2",
    occurredAt: "2026-10-12T20:30:00-04:00",
  });

  assert.equal(result.mode, "dry_run");
  assert.equal(result.remediationExecuted, false);
  assert.equal(result.productionWrites, false);
  assert.deepEqual(result.auditEvents.map((event) => event.eventType), [
    "diagnosis_started",
    "diagnosis_completed",
    "review_required",
  ]);
  assert.deepEqual(result.auditEvents.map((event) => event.sequence), [1, 2, 3]);
  assert.equal(result.auditEvents.every((event) => event.immutable), true);
  assert.equal(result.auditEvents.every((event) => Object.isFrozen(event)), true);
  assert.equal(Object.isFrozen(sink.list()), true);
});

test("healthy WebOps dry-run produces no findings and no review-required audit event", () => {
  const sink = new InMemoryWebOpsAuditSink();
  const result = runWebOpsDryDiagnosis({
    report: report({
      pages: [
        {
          url: "https://www.elevate360official.com/",
          depth: 0,
          status: 200,
          contentType: "text/html",
          durationMs: 180,
          linksDiscovered: 12,
        },
      ],
    }),
    auditSink: sink,
    correlationId: "phase2-test-healthy",
    subject: "fixture://healthy",
    occurredAt: "2026-10-12T20:31:00-04:00",
  });

  assert.equal(result.diagnosis.findings.length, 0);
  assert.equal(result.diagnosis.highestSeverity, null);
  assert.deepEqual(result.auditEvents.map((event) => event.eventType), [
    "diagnosis_started",
    "diagnosis_completed",
  ]);
});

test("empty WebOps crawl is a high-severity diagnosis and remains non-remediating", () => {
  const diagnosis = diagnoseCrawlReport(report());
  assert.equal(diagnosis.highestSeverity, "high");
  assert.equal(diagnosis.findings[0]?.code, "crawl_empty");
  assert.equal(diagnosis.findings[0]?.automaticRemediationAllowed, false);
  assert.equal(diagnosis.findings[0]?.productionApprovalRequired, true);
});
