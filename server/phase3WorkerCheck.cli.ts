import { workerDiagnosticMain } from "./webops/phase3WorkerDiagnostic";

// Build this standalone entrypoint into /app/webops-worker-check only after
// pinned-image review. There is no automatic scheduler or startup hook.
const code = await workerDiagnosticMain(process.argv.slice(2));
process.exitCode = code;
