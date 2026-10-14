import type { EgressGateway, WebOpsOriginRegistry } from "./phase3GatewayPolicy";

export interface DiagnoseTargetResult {
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
}

export interface DiagnoseJobResult {
  mode: "diagnose";
  readOnly: true;
  remediationExecuted: false;
  productionWrites: false;
  directNetworkAccess: false;
  results: readonly DiagnoseTargetResult[];
}

export interface DiagnoseWorkerOptions {
  gateway: EgressGateway;
  registry: WebOpsOriginRegistry;
  maxTargets?: number;
}

function boundedMaxTargets(value: number | undefined): number {
  if (!Number.isFinite(value)) return 10;
  return Math.max(1, Math.min(25, Math.floor(value as number)));
}

function safeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/[\r\n\t]+/g, " ").slice(0, 180);
}

export class Phase3DiagnoseWorker {
  constructor(private readonly options: DiagnoseWorkerOptions) {}

  async run(targets: readonly string[]): Promise<DiagnoseJobResult> {
    const limit = boundedMaxTargets(this.options.maxTargets);
    const results: DiagnoseTargetResult[] = [];
    const selectedTargets = targets.slice(0, limit);

    for (let index = 0; index < selectedTargets.length; index++) {
      const url = selectedTargets[index]!;
      const requestId = `phase3-diagnose-${index + 1}`;
      try {
        const gatewayResult = await this.options.gateway.request({
          requestId,
          url,
          method: "GET",
          registryVersion: this.options.registry.version,
        });
        if (gatewayResult.response.body) {
          await gatewayResult.response.body.cancel().catch(() => undefined);
        }
        results.push({
          url,
          status: gatewayResult.response.status,
          ok: gatewayResult.response.ok,
        });
      } catch (error) {
        results.push({ url, status: null, ok: false, error: safeError(error) });
      }
    }

    return Object.freeze({
      mode: "diagnose" as const,
      readOnly: true as const,
      remediationExecuted: false as const,
      productionWrites: false as const,
      directNetworkAccess: false as const,
      results: Object.freeze(results.map((result) => Object.freeze({ ...result }))),
    });
  }
}
