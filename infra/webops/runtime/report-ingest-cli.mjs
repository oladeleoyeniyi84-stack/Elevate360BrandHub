import { isAbsolute } from 'node:path';
import { ingestWorkerReport, readWorkerReport } from './report-ingest.mjs';

// Host-side stdin receiver only: no Docker calls, network or scheduler activation.
try {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !isAbsolute(args[0])) throw new Error('invalid_arguments');
  const receipt = ingestWorkerReport(await readWorkerReport(process.stdin), {directory: args[0]});
  console.log(JSON.stringify(receipt));
  process.exitCode = receipt.exitCode;
} catch {
  process.stdin.destroy();
  console.error('{"stored":false,"reason":"report_ingest_failed"}');
  process.exitCode = 2;
}
