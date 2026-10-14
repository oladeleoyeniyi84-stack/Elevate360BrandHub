import type { GatewayAuditEvent } from "./phase3GatewayPolicy";

export type NewGatewayAuditEvent = Omit<GatewayAuditEvent, "sequence" | "immutable">;

export interface AppendOnlyGatewayAudit {
  append(event: NewGatewayAuditEvent): GatewayAuditEvent;
  snapshot(): readonly GatewayAuditEvent[];
}

export class InMemoryAppendOnlyGatewayAudit implements AppendOnlyGatewayAudit {
  private readonly events: GatewayAuditEvent[] = [];

  append(event: NewGatewayAuditEvent): GatewayAuditEvent {
    const stored = Object.freeze({
      ...event,
      resolvedAddresses: Object.freeze([...event.resolvedAddresses]),
      sequence: this.events.length + 1,
      immutable: true as const,
    });
    this.events.push(stored);
    return stored;
  }

  snapshot(): readonly GatewayAuditEvent[] {
    return Object.freeze([...this.events]);
  }
}
