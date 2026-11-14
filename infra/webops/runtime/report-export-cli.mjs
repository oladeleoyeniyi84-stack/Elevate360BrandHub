import { exportReports, verifyReportBundleFile } from './report-export.mjs';
try {
  if (process.argv.length !== 5) throw new Error('invalid_arguments');
  const [mode, first, second] = process.argv.slice(2);
  if (!['export', 'verify'].includes(mode)) throw new Error('invalid_mode');
  const result = mode === 'export' ? exportReports(first, second) : verifyReportBundleFile(first, second);
  process.stdout.write(JSON.stringify(result) + '\n');
} catch {
  process.stderr.write('{"ok":false,"reason":"report_export_or_verification_failed"}\n');
  process.exitCode = 2;
}
