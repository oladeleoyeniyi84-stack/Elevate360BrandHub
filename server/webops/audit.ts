import type { WebOpsDiagnosis } from "./diagnostics";

export type WebOpsAuditEventType =
  | "diagnosis_started"
  | "diagnosis_completed"
  | "review_required"
  | "remediation_proposal_created";

export interface WebOpsAuditEventInput {
  eventType: WebOpsAuditEventType;
  actor: "webops_agent" | "founder" | "system";
  subject: string;
  correlationId: string;
  occurredAt: string;
  details?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface WebOpsAuditEvent extends WebOpsAuditEventInput {
  readonly sequence: number;
  readonly immutable: true;
}

export interface WebOpsAuditSink {
  append(event: WebOpsAuditEventInput): WebOpsAuditEvent;
  list(): readonly WebOpsAuditEvent[];
}

/**
 * Development-only append-only audit sink.
 * No database, filesystem, network, or production writes are performed.
 */
export class InMemoryWebOpsAuditSink implements WebOpsAuditSink {
  private readonly events: WebOpsAuditEvent[] = [];

  append(input: WebOpsAuditEventInput): WebOpsAuditEvent {
    if (!input.correlationId.trim()) throw new Error("correlationId_required");
    if (!input.subject.trim()) throw new Error("subject_required");
    const timestamp = Date.parse(input.occurredAt);
    if (!Number.isFinite(timestamp)) throw new Error("occurredAt_invalid");

    const event = Object.freeze({
      ...input,
      details: input.details ? Object.freeze({ ...input.details }) : undefined,
      sequence: this.events.length + 1,
      immutable: true as const,
    });
    this.events.push(event);
    return event;
  }

  list(): readonly WebOpsAuditEvent[] {
    return Object.freeze([...this.events]);
  }
}

export function recordDiagnosisAudit(
  sink: WebOpsAuditSink,
  params: {
    correlationId: string;
    subject: string;
    occurredAt: string;
    diagnosis: WebOpsDiagnosis;
  },
): readonly WebOpsAuditEvent[] {
  const started = sink.append({
    eventType: "diagnosis_started",
    actor: "webops_agent",
    subject: params.subject,
    correlationId: params.correlationId,
    occurredAt: params.occurredAt,
    details: { readOnly: true },
  });

  const completed = sink.append({
    eventType: "diagnosis_completed",
    actor: "webops_agent",
    subject: params.subject,
    correlationId: params.correlationId,
    occurredAt: params.occurredAt,
    details: {
      findingCount: params.diagnosis.findings.length,
      highestSeverity: params.diagnosis.highestSeverity ?? "none",
      readOnly: params.diagnosis.readOnly,
    },
  });

  const events: WebOpsAuditEvent[] = [started, completed];
  if (params.diagnosis.findings.some((finding) => finding.productionApprovalRequired)) {
    events.push(sink.append({
      eventType: "review_required",
      actor: "webops_agent",
      subject: params.subject,
      correlationId: params.correlationId,
      occurredAt: params.occurredAt,
      details: { founderApprovalRequired: true },
    }));
  }

  return Object.freeze(events);
}
