import { constants, openSync, closeSync, fstatSync, lstatSync, readSync, realpathSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readScheduleBytes, validateScheduleConfig } from './scheduled-runner.mjs';

const APPROVAL_KEYS = Object.freeze(['approvedAt', 'approvedBy', 'bootId',
  'containersVerified', 'dnsVerified', 'firewallVerified', 'scheduleSha256', 'schemaVersion']);

function readPrivateBytes(path, maxBytes = 4096) {
  if (!isAbsolute(path) || realpathSync(path) !== resolve(path)) throw new Error('unsafe_boot_approval');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = fstatSync(fd);
    if (!before.isFile() || before.uid !== process.getuid() || before.nlink !== 1 ||
        (before.mode & 0o7777) !== 0o600 || before.size < 1 || before.size > maxBytes)
      throw new Error('unsafe_boot_approval');
    const data = Buffer.alloc(before.size + 1);
    let used = 0;
    while (used < data.length) {
      const count = readSync(fd, data, used, data.length - used, null);
      if (count === 0) break;
      used += count;
    }
    const after = fstatSync(fd), current = lstatSync(path);
    const identity = value => [value.dev, value.ino, value.size, value.mtimeMs,
      value.ctimeMs, value.mode, value.uid, value.nlink].join(':');
    if (used !== before.size || identity(before) !== identity(after) || identity(after) !== identity(current))
      throw new Error('unsafe_boot_approval');
    return data.subarray(0, used);
  } finally { closeSync(fd); }
}

function currentBootId(path) {
  if (path !== '/proc/sys/kernel/random/boot_id') throw new Error('invalid_boot_id_source');
  const value = readFileSync(path, 'utf8').trim();
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value))
    throw new Error('invalid_boot_id');
  return value;
}

export function verifyBootGate(schedulePath, approvalPath, {
  readBootId = () => currentBootId('/proc/sys/kernel/random/boot_id'),
} = {}) {
  const scheduleBytes = readScheduleBytes(schedulePath);
  return loadBootApprovedScheduleBytes(scheduleBytes, approvalPath, {readBootId}).gate;
}

export function loadBootApprovedScheduleBytes(scheduleBytes, approvalPath, {
  readBootId = () => currentBootId('/proc/sys/kernel/random/boot_id'),
} = {}) {
  if (!Buffer.isBuffer(scheduleBytes) || scheduleBytes.length < 1 || scheduleBytes.length > 16384)
    throw new Error('invalid_schedule_bytes');
  const schedule = JSON.parse(scheduleBytes.toString('utf8'));
  validateScheduleConfig(schedule);
  if (!schedule.enabled) return {schedule, gate:{permitted:true, enabled:false, approvalRequired:false}};

  const approval = JSON.parse(readPrivateBytes(approvalPath).toString('utf8'));
  if (!approval || Object.keys(approval).sort().join('\0') !== [...APPROVAL_KEYS].sort().join('\0') ||
      approval.schemaVersion !== 1 || approval.approvedBy !== 'operator' ||
      approval.containersVerified !== true || approval.firewallVerified !== true || approval.dnsVerified !== true ||
      typeof approval.scheduleSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(approval.scheduleSha256) ||
      typeof approval.approvedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(approval.approvedAt) ||
      Number.isNaN(Date.parse(approval.approvedAt))) throw new Error('invalid_boot_approval');
  const digest = createHash('sha256').update(scheduleBytes).digest('hex');
  const bootId = readBootId();
  if (approval.scheduleSha256 !== digest || approval.bootId !== bootId)
    throw new Error('stale_boot_approval');
  return {schedule, gate:{permitted:true, enabled:true, approvalRequired:true, bootId,
    scheduleSha256:digest, containersVerified:true, firewallVerified:true, dnsVerified:true}};
}

export function loadBootApprovedSchedule(schedulePath, approvalPath, options = {}) {
  return loadBootApprovedScheduleBytes(readScheduleBytes(schedulePath), approvalPath, options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error('invalid_arguments');
    console.log(JSON.stringify(verifyBootGate(process.argv[2], process.argv[3])));
  } catch {
    console.error('{"permitted":false,"reason":"boot_gate_blocked"}');
    process.exitCode = 1; // ExecCondition skips the tick without marking the service failed.
  }
}
