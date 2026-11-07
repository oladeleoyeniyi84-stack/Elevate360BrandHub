import { monitorRoutes } from './monitor.mjs';
import { gatewayCheck } from './gateway-client.mjs';
import { buildDiagnosticReport } from './report.mjs';
import { randomUUID } from 'node:crypto';

// Explicit operator invocation only. No timers, default route list, or repairs.
try {
  const report = await monitorRoutes({paths: process.argv.slice(2), gateway: gatewayCheck});
  console.log(JSON.stringify(buildDiagnosticReport(report, {
    generatedAt: new Date().toISOString(), runId: randomUUID(),
  })));
  process.exitCode = report.healthy ? 0 : 1;
} catch {
  console.error('{"ok":false,"reason":"invalid_monitor_configuration"}');
  process.exitCode = 2;
}
