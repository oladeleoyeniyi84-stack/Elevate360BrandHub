import { Agent, request } from "node:https";
import { Readable } from "node:stream";
import { isPublicIpAddress, type DnsLookupRecord } from "./networkGuard";

export function selectPinnedDnsRecord(records: readonly DnsLookupRecord[]): DnsLookupRecord {
  const record = records.find((candidate) => candidate.family === 4) ?? records[0];
  if (!record || (record.family !== 4 && record.family !== 6) || !isPublicIpAddress(record.address)) {
    throw new Error("pinned_dns_record_invalid");
  }
  return Object.freeze({ ...record });
}

export function assertPinnedHostname(
  requestedHostname: string,
  expectedHostname: string,
  record: DnsLookupRecord,
): DnsLookupRecord {
  if (requestedHostname.toLowerCase() !== expectedHostname.toLowerCase()) {
    throw new Error("pinned_lookup_hostname_mismatch");
  }
  if (!isPublicIpAddress(record.address) || (record.family !== 4 && record.family !== 6)) {
    throw new Error("pinned_dns_record_invalid");
  }
  return record;
}

function responseHeaders(headers: Record<string, string | string[] | undefined>): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) {
      result.append(name, value);
    }
  }
  return result;
}

/**
 * GET-only HTTPS transport that connects to the exact public IP selected from
 * the immediately preceding DNS validation. TLS verification and SNI continue
 * to use the original hostname, so certificate validation is not weakened.
 */
export async function pinnedHttpsGet(
  url: string,
  init: RequestInit,
  records: readonly DnsLookupRecord[],
): Promise<Response> {
  const target = new URL(url);
  if (target.protocol !== "https:") throw new Error("https_required");
  if ((init.method ?? "GET").toUpperCase() !== "GET") throw new Error("get_only_transport");

  const record = selectPinnedDnsRecord(records);
  const expectedHostname = target.hostname;
  const agent = new Agent({
    keepAlive: false,
    maxSockets: 1,
    lookup: (requestedHostname: string, options: any, callback: any) => {
      try {
        const pinned = assertPinnedHostname(requestedHostname, expectedHostname, record);
        if (options && typeof options === "object" && options.all === true) {
          callback(null, [{ address: pinned.address, family: pinned.family as 4 | 6 }]);
        } else {
          callback(null, pinned.address, pinned.family as 4 | 6);
        }
      } catch (error) {
        const lookupError = error instanceof Error ? error : new Error("pinned_lookup_failed");
        callback(lookupError);
      }
    },
  });

  const headers = Object.fromEntries(new Headers(init.headers).entries());

  return await new Promise<Response>((resolve, reject) => {
    const req = request(
      target,
      {
        method: "GET",
        headers,
        signal: init.signal ?? undefined,
        agent,
        servername: expectedHostname,
        family: record.family as 4 | 6,
        autoSelectFamily: false,
      },
      (incoming) => {
        const status = incoming.statusCode ?? 502;
        const noBody = status === 204 || status === 304;
        if (noBody) incoming.resume();

        const body = noBody ? null : (Readable.toWeb(incoming) as ReadableStream<Uint8Array>);
        const response = new Response(body, {
          status,
          statusText: incoming.statusMessage ?? "",
          headers: responseHeaders(incoming.headers),
        });

        incoming.once("close", () => agent.destroy());
        resolve(response);
      },
    );

    req.once("error", (error) => {
      agent.destroy();
      reject(error);
    });
    req.end();
  });
}
