import type { WebOpsCrawlReport } from "./readOnlyCrawler";
import { diagnoseCrawlReport, type WebOpsDiagnosis } from "./diagnostics";
import { recordDiagnosisAudit, type WebOpsAuditEvent, type WebOpsAuditSink } from "./audit";

export interface WebOpsDryRunResult {
  readonly mode: "dry_run";
  readonly diagnosis: WebOpsDiagnosis;
  readonly auditEvents: readonly WebOpsAuditEvent[];
  readonly remediationExecuted: false;
  readonly productionWrites: false;
}

/**
 * Converts an already-collected crawl report into deterministic findings and
 * development audit events. It cannot crawl, patch code, write to a database,
 * call deployment systems, or execute remediation.
 */
export function runWebOpsDryDiagnosis(params: {
  report: WebOpsCrawlReport;
  auditSink: WebOpsAuditSink;
  correlationId: string;
  subject: string;
  occurredAt: string;
}): WebOpsDryRunResult {
  const diagnosis = diagnoseCrawlReport(params.report);
  const auditEvents = recordDiagnosisAudit(params.auditSink, {
    correlationId: params.correlationId,
    subject: params.subject,
    occurredAt: params.occurredAt,
    diagnosis,
  });

  return Object.freeze({
    mode: "dry_run" as const,
    diagnosis,
    auditEvents,
    remediationExecuted: false as const,
    productionWrites: false as const,
  });
}
