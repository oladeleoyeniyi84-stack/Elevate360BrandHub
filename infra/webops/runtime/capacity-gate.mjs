import { pathToFileURL } from 'node:url';
import { checkReportCapacity } from './report-store.mjs';
import { readScheduleConfig, validateScheduleConfig } from './scheduled-runner.mjs';

export const REPORT_CAPACITY_RESERVE = 24;

// A cooperating pre-run gate. It serializes its capacity observation with the
// report writer, but does not create a report, call Docker or deliver messages.
export function verifyCapacityGate(schedulePath, {inspect = checkReportCapacity} = {}) {
  const schedule = readScheduleConfig(schedulePath);
  validateScheduleConfig(schedule);
  if (!schedule.enabled)
    return {permitted:true, enabled:false, capacityChecked:false};
  const capacity = inspect(schedule.runner.reportDirectory);
  if (!capacity || !Number.isInteger(capacity.reportsRemaining) ||
      typeof capacity.capacityLow !== 'boolean' ||
      capacity.capacityLow || capacity.reportsRemaining <= REPORT_CAPACITY_RESERVE)
    throw new Error('report_capacity_low');
  return {permitted:true, enabled:true, capacityChecked:true,
    reportsRemaining:capacity.reportsRemaining, reserve:REPORT_CAPACITY_RESERVE};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('invalid_arguments');
    console.log(JSON.stringify(verifyCapacityGate(process.argv[2])));
  } catch {
    console.error('{"permitted":false,"reason":"report_capacity_gate_blocked"}');
    process.exitCode = 1; // ExecCondition skips the tick without marking the service failed.
  }
}
