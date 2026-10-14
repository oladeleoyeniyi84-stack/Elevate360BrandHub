import { isPublicIpAddress, type DnsResolver } from "./networkGuard";
import type { AppendOnlyGatewayAudit } from "./phase3Audit";
import {
  assertApprovedGatewayTarget,
  type EgressGateway,
  type GatewayRequest,
  type GatewayResult,
  type WebOpsOriginRegistry,
} from "./phase3GatewayPolicy";

export type GatewayTransport = (
  url: string,
  init: RequestInit,
  resolvedAddresses: readonly { address: string; family: number }[],
) => Promise<Response>;

export interface LocalFixtureGatewayOptions {
  registry: WebOpsOriginRegistry;
  dnsResolver: DnsResolver;
  transport: GatewayTransport;
  audit: AppendOnlyGatewayAudit;
}

export class LocalFixtureEgressGateway implements EgressGateway {
  readonly name = "phase3-local-fixture-gateway";

  constructor(private readonly options: LocalFixtureGatewayOptions) {}

  async request(input: GatewayRequest): Promise<GatewayResult> {
    if (input.method !== "GET") throw new Error("gateway_get_only");
    if (input.registryVersion !== this.options.registry.version) {
      throw new Error("gateway_registry_version_mismatch");
    }

    const target = assertApprovedGatewayTarget(input.url, this.options.registry);
    let records: readonly { address: string; family: number }[] = [];

    try {
      records = await this.options.dnsResolver(target.hostname);
      if (records.length === 0) throw new Error("gateway_dns_empty");
      if (records.some((record) => !isPublicIpAddress(record.address))) {
        throw new Error("gateway_dns_unsafe");
      }

      const response = await this.options.transport(
        target.toString(),
        {
          method: "GET",
          redirect: "manual",
          headers: { accept: "text/html,application/xhtml+xml;q=0.9" },
        },
        Object.freeze(records.map((record) => Object.freeze({ ...record }))),
      );

      const auditEvent = this.options.audit.append({
        requestId: input.requestId,
        url: target.toString(),
        hostname: target.hostname,
        resolvedAddresses: records.map((record) => record.address),
        decision: "allow",
        reason: "approved_public_target",
        registryVersion: input.registryVersion,
      });

      return { response, auditEvent };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "gateway_request_failed";
      this.options.audit.append({
        requestId: input.requestId,
        url: target.toString(),
        hostname: target.hostname,
        resolvedAddresses: records.map((record) => record.address),
        decision: "deny",
        reason,
        registryVersion: input.registryVersion,
      });
      throw new Error(`gateway_denied:${reason}`);
    }
  }
}
