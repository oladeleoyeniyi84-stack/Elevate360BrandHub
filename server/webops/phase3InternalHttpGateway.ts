import { assertApprovedGatewayTarget, type EgressGateway, type GatewayAuditEvent, type GatewayRequest, type GatewayResult, type WebOpsOriginRegistry } from "./phase3GatewayPolicy";

/**
 * Client-side protocol candidate. Does not expose a public ingress or activate a host.
 * The gateway must independently verify policy, network destination, and audit persistence.
 */
export class InternalHttpEgressGateway implements EgressGateway {
  readonly name = "phase3-internal-http-gateway";
  private readonly endpoint: string;

  constructor(
    private readonly registry: WebOpsOriginRegistry,
    endpoint: string,
    private readonly transport: typeof fetch,
    private readonly sharedToken: string,
  ) {
    if (Buffer.byteLength(sharedToken, "utf8") < 32) throw new Error("gateway_shared_token_missing_or_short");
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "http:" || parsed.username || parsed.password ||
        parsed.hostname !== "webops-egress-gateway" || parsed.port !== "8787" ||
        parsed.pathname !== "/inspect" || parsed.search || parsed.hash) {
      throw new Error("gateway_endpoint_must_be_internal");
    }
    this.endpoint = parsed.href;
  }

  async request(input: GatewayRequest): Promise<GatewayResult> {
    if (input.method !== "GET") throw new Error("gateway_get_only");
    if (input.registryVersion !== this.registry.version) {
      throw new Error("gateway_registry_version_mismatch");
    }
    assertApprovedGatewayTarget(input.url, this.registry);

    // There is exactly one outbound transport: the internal gateway endpoint.
    // There is intentionally no direct-origin retry, redirect, or fallback.
    const response = await this.transport(this.endpoint, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.sharedToken}` },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("gateway_transport_rejected");
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new Error("gateway_response_invalid");
    const obj = payload as Record<string, unknown>;
    if (!Number.isInteger(obj.status) || (obj.status as number) < 100 || (obj.status as number) > 599 ||
        !obj.audit || typeof obj.audit !== "object") {
      throw new Error("gateway_response_invalid");
    }
    const audit = obj.audit as Record<string, unknown>;
    if (audit.immutable !== true || audit.decision !== "allow" ||
        audit.requestId !== input.requestId || audit.url !== input.url ||
        audit.registryVersion !== input.registryVersion ||
        !Number.isSafeInteger(audit.sequence) || (audit.sequence as number) < 1 ||
        typeof audit.hostname !== "string" ||
        !Array.isArray(audit.resolvedAddresses) ||
        !audit.resolvedAddresses.every((x: unknown) => typeof x === "string") ||
        typeof audit.reason !== "string") {
      throw new Error("gateway_audit_invalid");
    }
    const event = Object.freeze({
      sequence: audit.sequence,
      requestId: audit.requestId,
      url: audit.url,
      hostname: audit.hostname,
      resolvedAddresses: Object.freeze([...audit.resolvedAddresses]),
      decision: "allow",
      reason: audit.reason,
      registryVersion: audit.registryVersion,
      immutable: true,
    }) as GatewayAuditEvent;
    return { response: new Response(null, { status: obj.status as number }), auditEvent: event };
  }
}
