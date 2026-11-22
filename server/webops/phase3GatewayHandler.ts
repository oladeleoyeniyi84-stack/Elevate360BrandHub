import { timingSafeEqual } from "node:crypto";
import type { EgressGateway, GatewayRequest } from "./phase3GatewayPolicy";

/**
 * Internal gateway protocol handler only. Hosting, pinned-TLS egress transport,
 * durable audit persistence, and host firewall validation remain separate gates.
 */
export function createInternalGatewayHandler(gateway: EgressGateway, sharedToken: string) {
  if (Buffer.byteLength(sharedToken, "utf8") < 32) {
    throw new Error("gateway_shared_token_missing_or_short");
  }
  const expected = Buffer.from(sharedToken, "utf8");

  return async (request: Request): Promise<Response> => {
    const deny = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store" } });
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/inspect" || url.search || url.hash) return deny(404);
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return deny(401);
    const actual = Buffer.from(authorization.slice(7), "utf8");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return deny(401);
    if (request.headers.get("content-type") !== "application/json") return deny(415);
    const length = request.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > 2048)) return deny(413);

    let body = "";
    try {
      if (!request.body) return deny(400);
      const reader = request.body.getReader();
      let total = 0;
      const parts: Uint8Array[] = [];
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          total += part.value.byteLength;
          if (total > 2048) { await reader.cancel(); return deny(413); }
          parts.push(part.value);
        }
      } finally { reader.releaseLock(); }
      body = new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(parts.map(part => Buffer.from(part))),
      );
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return deny(400);
      const record = parsed as Record<string, unknown>;
      if (Object.keys(record).sort().join(",") !== "method,registryVersion,requestId,url" ||
          record.method !== "GET" || typeof record.url !== "string" ||
          typeof record.requestId !== "string" || record.requestId.length < 1 ||
          record.requestId.length > 96 || !/^[a-zA-Z0-9_-]+$/.test(record.requestId) ||
          !Number.isSafeInteger(record.registryVersion)) return deny(400);

      const result = await gateway.request(record as unknown as GatewayRequest);
      if (result.response.body) await result.response.body.cancel().catch(() => undefined);
      return Response.json(
        { status: result.response.status, audit: result.auditEvent },
        { headers: { "cache-control": "no-store" } },
      );
    } catch {
      // No stack traces, credentials, request bodies or target details in the response.
      return deny(502);
    }
  };
}
