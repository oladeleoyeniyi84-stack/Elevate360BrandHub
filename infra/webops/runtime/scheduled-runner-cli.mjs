import { readScheduleConfig, scheduledTick } from './scheduled-runner.mjs';

try {
  if (process.argv.length !== 3) throw new Error('invalid_arguments');
  const result = await scheduledTick(readScheduleConfig(process.argv[2]));
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = result.status === 'completed' ? result.result.ingestionExitCode : 0;
} catch {
  process.stderr.write('{"status":"blocked","reason":"scheduled_run_failed"}\n');
  process.exitCode = 2;
}
