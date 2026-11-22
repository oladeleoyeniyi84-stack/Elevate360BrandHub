import { readFileSync, statSync } from "node:fs";
import { InternalHttpEgressGateway } from "./phase3InternalHttpGateway";
import { Phase3DiagnoseWorker } from "./phase3Worker";
import type { WebOpsOriginRegistry } from "./phase3GatewayPolicy";

export const initialReadOnlyRegistry: WebOpsOriginRegistry = Object.freeze({
  version: 1,
  origins: Object.freeze([Object.freeze({
    origin: "https://www.elevate360official.com",
    enabled: true,
    approvedBy: "founder" as const,
    approvedAt: "2026-10-14T16:00:00Z",
  })]),
});

/**
 * Bounded worker-side inspection. A false result is returned as failure; no direct
 * HTTPS request or fallback exists in this function. No scheduling is installed.
 */
export async function runWorkerInspectionDiagnostic(
  target: string,
  sharedToken: string,
  transport: typeof fetch,
): Promise<boolean> {
  const gateway = new InternalHttpEgressGateway(
    initialReadOnlyRegistry,
    "http://webops-egress-gateway:8787/inspect",
    transport,
    sharedToken,
  );
  const worker = new Phase3DiagnoseWorker({ gateway, registry: initialReadOnlyRegistry, maxTargets: 1 });
  const result = await worker.run([target]);
  return result.readOnly === true && result.productionWrites === false &&
    result.directNetworkAccess === false && result.results.length === 1 &&
    result.results[0]?.ok === true;
}

/** Runtime entry point: require a private mounted secret file; never accept it as CLI text. */
export async function workerDiagnosticMain(
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  if (args.length !== 1) return 2;
  if (!env.WEBOPS_GATEWAY_TOKEN_FILE?.startsWith("/")) return 2;
  try {
    const info = statSync(env.WEBOPS_GATEWAY_TOKEN_FILE);
    if (!info.isFile() || (info.mode & 0o077) !== 0 || info.size < 32 || info.size > 512) return 2;
    const secret = readFileSync(env.WEBOPS_GATEWAY_TOKEN_FILE, "utf8").trimEnd();
    if (Buffer.byteLength(secret, "utf8") < 32) return 2;
    return await runWorkerInspectionDiagnostic(args[0]!, secret, fetch) ? 0 : 1;
  } catch {
    return 1;
  }
}
