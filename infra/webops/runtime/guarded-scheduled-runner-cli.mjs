import { pathToFileURL } from 'node:url';
import { loadBootApprovedSchedule } from './boot-gate.mjs';
import { verifyCapacityForSchedule } from './capacity-gate.mjs';
import { scheduledTick } from './scheduled-runner.mjs';

export async function guardedScheduledTick(schedulePath, approvalPath, {
  readBootId, inspect, run, now,
} = {}) {
  const {schedule} = loadBootApprovedSchedule(schedulePath, approvalPath,
    readBootId ? {readBootId} : {});
  verifyCapacityForSchedule(schedule, inspect ? {inspect} : {});
  return scheduledTick(schedule, {
    ...(run ? {run} : {}),
    ...(now ? {now} : {}),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error('invalid_arguments');
    const result = await guardedScheduledTick(process.argv[2], process.argv[3]);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.status === 'completed' ? result.result.ingestionExitCode : 0;
  } catch {
    process.stderr.write('{\"status\":\"blocked\",\"reason\":\"guarded_scheduled_run_failed\"}\n');
    process.exitCode = 2;
  }
}
