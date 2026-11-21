export type GatewayDecision = "allow" | "deny";

export interface ApprovedOriginEntry {
  origin: string;
  enabled: boolean;
  approvedBy: "founder";
  approvedAt: string;
}

export interface WebOpsOriginRegistry {
  version: number;
  origins: readonly ApprovedOriginEntry[];
}

export interface GatewayRequest {
  requestId: string;
  url: string;
  method: "GET";
  registryVersion: number;
}

export interface GatewayAuditEvent {
  sequence: number;
  requestId: string;
  url: string;
  hostname: string;
  resolvedAddresses: readonly string[];
  decision: GatewayDecision;
  reason: string;
  registryVersion: number;
  immutable: true;
}

export interface GatewayResult {
  response: Response;
  auditEvent: GatewayAuditEvent;
}

export interface EgressGateway {
  readonly name: string;
  request(input: GatewayRequest): Promise<GatewayResult>;
}

export function normalizeRegistry(registry: WebOpsOriginRegistry): Readonly<WebOpsOriginRegistry> {
  if (!Number.isSafeInteger(registry.version) || registry.version < 1) {
    throw new Error("origin_registry_version_invalid");
  }

  const seen = new Set<string>();
  const origins = registry.origins.map((entry) => {
    const parsed = new URL(entry.origin);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) {
      throw new Error("origin_registry_entry_invalid");
    }
    const normalized = parsed.origin.toLowerCase();
    if (seen.has(normalized)) throw new Error("origin_registry_duplicate");
    seen.add(normalized);
    if (entry.approvedBy !== "founder") throw new Error("origin_registry_approval_invalid");
    if (!Number.isFinite(Date.parse(entry.approvedAt))) throw new Error("origin_registry_timestamp_invalid");
    return Object.freeze({ ...entry, origin: normalized });
  });

  return Object.freeze({ version: registry.version, origins: Object.freeze(origins) });
}

export function assertApprovedGatewayTarget(url: string, registry: WebOpsOriginRegistry): URL {
  const normalized = normalizeRegistry(registry);
  const target = new URL(url);
  if (target.protocol !== "https:" || target.username || target.password || target.port) {
    throw new Error("gateway_target_invalid");
  }

  const approved = normalized.origins.some(
    (entry) => entry.enabled && entry.origin === target.origin.toLowerCase(),
  );
  if (!approved) throw new Error("gateway_origin_not_approved");
  return target;
}
