import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { assertPublicDnsResolution, systemDnsResolver } from "./networkGuard";
import { pinnedHttpsGet } from "./pinnedHttpsTransport";
import type { AppendOnlyGatewayAudit } from "./phase3Audit";
import type { WebOpsOriginRegistry } from "./phase3GatewayPolicy";
import { createInternalGatewayHandler } from "./phase3GatewayHandler";
import { LocalFixtureEgressGateway } from "./phase3LocalGateway";

/**
 * Inactive internal HTTP gateway server factory. Construction does not call listen().
 * Operators must supply a durable audit sink; in-memory audit is NOT sufficient for staging.
 * Host firewall rules and an internal Docker-only listener remain separate admission gates.
 */
export function createPhase3GatewayServer(options: {
  registry: WebOpsOriginRegistry;
  audit: AppendOnlyGatewayAudit;
  sharedToken: string;
}): Server {
  const gateway = new LocalFixtureEgressGateway({
    registry: options.registry,
    audit: options.audit,
    dnsResolver: systemDnsResolver,
    transport: async (url, init, records) => {
      const safeRecords = await assertPublicDnsResolution(new URL(url).hostname, async () => records);
      return pinnedHttpsGet(url, { ...init, signal: AbortSignal.timeout(8000) }, safeRecords);
    },
  });
  const handler = createInternalGatewayHandler(gateway, options.sharedToken);
  return createServer(async (incoming: IncomingMessage, outgoing: ServerResponse) => {
    const reply = (code: number) => { outgoing.writeHead(code, { "cache-control": "no-store" }); outgoing.end(); };
    try {
      // Reject unknown paths/verbs without buffering, DNS resolution, or external traffic.
      if (incoming.method !== "POST" || incoming.url !== "/inspect") return reply(404);
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of incoming) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.byteLength;
        if (size > 2048) return reply(413);
        chunks.push(buffer);
      }
      const request = new Request("http://webops-egress-gateway:8787/inspect", {
        method: "POST",
        headers: incoming.headers as HeadersInit,
        body: Buffer.concat(chunks),
      });
      const response = await handler(request);
      outgoing.writeHead(response.status, {
        "cache-control": "no-store",
        "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      });
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!outgoing.headersSent) reply(502);
      else outgoing.end();
    }
  });
}
