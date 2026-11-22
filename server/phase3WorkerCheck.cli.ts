import { workerDiagnosticMain } from "./webops/phase3WorkerDiagnostic";

// Manual-only diagnostic entrypoint: deliberately no top-level await, scheduler,
// background startup, production database access or direct HTTPS fallback.
void workerDiagnosticMain(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  () => { process.exitCode = 1; },
);
