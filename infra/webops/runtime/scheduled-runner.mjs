import { constants, openSync, closeSync, fstatSync, realpathSync, readFileSync,
  writeFileSync, fsyncSync, mkdirSync, rmdirSync, renameSync, lstatSync } from 'node:fs';
import { isAbsolute, resolve, join } from 'node:path';
import { runMonitorOnce } from './host-runner.mjs';

// Host operator configuration, never a worker-supplied activation manifest.
export function readScheduleConfig(path) {
  if (!isAbsolute(path) || realpathSync(path) !== resolve(path)) throw new Error('unsafe_schedule_config');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid() || stat.nlink !== 1 ||
        (stat.mode & 0o777) !== 0o600 || stat.size > 16384) throw new Error('unsafe_schedule_config');
    const data = readFileSync(fd);
    if (data.length > 16384) throw new Error('unsafe_schedule_config');
    return JSON.parse(data.toString('utf8'));
  } finally { closeSync(fd); }
}

export async function scheduledTick(config, {run = runMonitorOnce, now = Date.now} = {}) {
  if (!config || config.schemaVersion !== 1 || typeof config.enabled !== 'boolean')
    throw new Error('invalid_schedule_configuration');
  if (!config.enabled) return {status: 'disabled'};
  const {intervalMinutes, stateDirectory, runner} = config;
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 60 || intervalMinutes > 10080 ||
      typeof stateDirectory !== 'string' || !isAbsolute(stateDirectory) || !runner ||
      typeof runner.runDirectory !== 'string' || typeof runner.reportDirectory !== 'string')
    throw new Error('invalid_schedule_configuration');
  const directory = resolve(stateDirectory);
  for (const other of [runner.runDirectory, runner.reportDirectory].map(p => resolve(p))) {
    if (directory === other || directory.startsWith(other + '/') || other.startsWith(directory + '/'))
      throw new Error('invalid_schedule_configuration');
  }
  if (realpathSync(directory) !== directory) throw new Error('unsafe_schedule_directory');
  const fd = openSync(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  const lock = join(directory, 'tick.lock'), statePath = join(directory, 'cadence.json');
  let locked = false, completed = false;
  try {
    const info = fstatSync(fd);
    if (info.uid !== process.getuid() || (info.mode & 0o777) !== 0o700)
      throw new Error('unsafe_schedule_directory');
    try { mkdirSync(lock, {mode: 0o700}); locked = true; }
    catch (error) { if (error.code === 'EEXIST') throw new Error('schedule_locked'); throw error; }
    fsyncSync(fd);
    const time = now();
    if (!Number.isSafeInteger(time) || time < 0) throw new Error('invalid_schedule_clock');
    let state, exists = true;
    try { lstatSync(statePath); }
    catch (error) { if (error.code !== 'ENOENT') throw error; exists = false; }
    if (exists) state = readScheduleConfig(statePath);
    if (state !== undefined) {
      if (state.schemaVersion !== 1 || !Number.isSafeInteger(state.attemptedAt) || state.attemptedAt < 0 ||
          !Number.isSafeInteger(state.notBefore) || state.notBefore < state.attemptedAt + 3600000 ||
          state.notBefore > state.attemptedAt + 604800000) throw new Error('invalid_cadence_state');
      if (time < state.attemptedAt) throw new Error('schedule_clock_reversed');
      // Lowering the configured cadence never shortens an already reserved interval.
      const due = Math.max(state.notBefore, state.attemptedAt + intervalMinutes * 60000);
      if (time < due) { completed = true; return {status: 'not_due', notBefore: due}; }
    }
    const next = {schemaVersion: 1, attemptedAt: time, notBefore: time + intervalMinutes * 60000};
    if (!Number.isSafeInteger(next.notBefore)) throw new Error('invalid_schedule_clock');
    const pending = join(directory, 'cadence.pending');
    const stateFd = openSync(pending, 'wx', 0o600);
    try { writeFileSync(stateFd, JSON.stringify(next) + '\n'); fsyncSync(stateFd); }
    finally { closeSync(stateFd); }
    renameSync(pending, statePath); fsyncSync(fd);
    // Reserve before execution: a crash consumes the interval and leaves the lock.
    const result = await run(runner);
    completed = true;
    return {status: 'completed', notBefore: next.notBefore, result};
  } finally {
    try { if (locked && completed) { rmdirSync(lock); fsyncSync(fd); } }
    finally { closeSync(fd); }
  }
}
