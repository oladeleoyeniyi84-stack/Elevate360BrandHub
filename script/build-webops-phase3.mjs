// Isolated build only. It does not start containers, deploy, schedule, or publish ports.
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
const outdir = "dist/webops-phase3";
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: {
    "webops-worker-check": "server/phase3WorkerCheck.cli.ts",
    "webops-gateway-server": "server/phase3Gateway.cli.ts",
  },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir,
  outExtension: { ".js": ".mjs" },
  packages: "external",
  sourcemap: false,
  minify: false,
  logLevel: "info",
  banner: { js: "#!/usr/bin/env node" },
});
// Staging artifacts remain unapproved until tests and actual host isolation pass.
