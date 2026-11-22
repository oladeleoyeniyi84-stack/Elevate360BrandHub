import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";
import { createPhase3GatewayServer } from "./webops/phase3GatewayServer";
import { FileGatewayAudit } from "./webops/phase3FileAudit";
import type { WebOpsOriginRegistry } from "./webops/phase3GatewayPolicy";

// Deliberate manual-only entrypoint: no scheduler, no production secrets or defaults.
// Binding is restricted to the pinned internal Docker gateway address.
const host = "172.30.0.2";
const port = 8787;
function readPrivateSecret(path: string | undefined): string {
  if (!path?.startsWith("/") || path.includes("\u0000")) throw new Error("private_token_file_required");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.nlink !== 1 || (info.mode & 0o077) !== 0 ||
        info.size < 32 || info.size > 512) throw new Error("private_token_file_invalid");
    const token = readFileSync(fd, "utf8");
    // Do not silently trim secrets; byte-for-byte matching is required.
    if (Buffer.byteLength(token, "utf8") < 32 || token.includes("\n") || token.includes("\r")) {
      throw new Error("private_token_format_invalid");
    }
    return token;
  } finally {
    closeSync(fd);
  }
}

const auditPath = process.env.WEBOPS_GATEWAY_AUDIT_FILE;
if (!auditPath?.startsWith("/")) throw new Error("durable_audit_file_required");
const token = readPrivateSecret(process.env.WEBOPS_GATEWAY_TOKEN_FILE);
const registry: WebOpsOriginRegistry = Object.freeze({
  version: 1,
  origins: Object.freeze([Object.freeze({
    origin: "https://www.elevate360official.com",
    enabled: true,
    approvedBy: "founder" as const,
    approvedAt: "2026-10-14T16:00:00Z",
  })]),
});
const audit = new FileGatewayAudit(auditPath);
const server = createPhase3GatewayServer({ registry, audit, sharedToken: token });
server.on("error", () => { process.exitCode = 1; });
server.listen(port, host);
// No public port exposure is authorized. A separate host network test must prove
// that the gateway is reachable exclusively from the internal worker network.
function shutdown() {
  server.close(() => { audit.close(); });
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
