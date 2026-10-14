import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type DnsLookupRecord = { address: string; family: number };
export type DnsResolver = (hostname: string) => Promise<readonly DnsLookupRecord[]>;

function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = octets;

  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized === "::" || normalized === "::1") return false;

  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isIP(mapped) === 4 && isPublicIpv4(mapped);
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
  if (/^fe[89ab]/.test(normalized)) return false;
  if (normalized.startsWith("ff")) return false;
  if (normalized.startsWith("2001:db8:")) return false;

  // Fail closed: for crawler egress, only globally routable 2000::/3 space is accepted.
  const first = normalized[0];
  return first === "2" || first === "3";
}

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address.split("%")[0]);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

export const systemDnsResolver: DnsResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => ({ address: record.address, family: record.family }));
};

export async function assertPublicDnsResolution(
  hostname: string,
  resolver: DnsResolver = systemDnsResolver,
): Promise<readonly DnsLookupRecord[]> {
  let records: readonly DnsLookupRecord[];
  try {
    records = await resolver(hostname);
  } catch {
    throw new Error("dns_resolution_failed");
  }

  if (records.length === 0) throw new Error("dns_resolution_empty");
  if (records.some((record) => !isPublicIpAddress(record.address))) {
    throw new Error("dns_resolution_unsafe");
  }
  return Object.freeze(records.map((record) => Object.freeze({ ...record })));
}
