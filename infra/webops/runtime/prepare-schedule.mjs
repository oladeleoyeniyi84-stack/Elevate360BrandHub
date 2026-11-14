import { constants, openSync, fstatSync, closeSync, realpathSync, writeFileSync,
  fsyncSync, fchmodSync, linkSync, unlinkSync } from 'node:fs';
import { isAbsolute, resolve, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { validateRunnerOptions } from './host-runner.mjs';
import { validateScheduleConfig, readScheduleConfig, readScheduleBytes } from './scheduled-runner.mjs';

function normalizeCandidate(input) {
  if (!input || input.schemaVersion !== 1 || input.enabled !== false)
    throw new Error('disabled_candidate_required');
  const runner = validateRunnerOptions(input.runner);
  const candidate = {schemaVersion:1, enabled:false, intervalMinutes:input.intervalMinutes,
    stateDirectory:input.stateDirectory, runner};
  // Validate the complete future configuration without calling the scheduler.
  validateScheduleConfig({...candidate, enabled:true});
  candidate.stateDirectory = resolve(candidate.stateDirectory);
  return candidate;
}

export function verifySchedule(path, expectedSha256) {
  if (typeof expectedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(expectedSha256))
    throw new Error('invalid_candidate_digest');
  const data = readScheduleBytes(path);
  const sha256 = createHash('sha256').update(data).digest('hex');
  if (sha256 !== expectedSha256) throw new Error('candidate_digest_mismatch');
  const candidate = normalizeCandidate(JSON.parse(data.toString('utf8')));
  if (!data.equals(Buffer.from(JSON.stringify(candidate, null, 2) + '\n')))
    throw new Error('noncanonical_candidate');
  return {verified:true, path:resolve(path), sha256, enabled:false,
    identitiesVerified:false, installed:false};
}

export function prepareSchedule(input, directory) {
  const candidate = normalizeCandidate(input);
  const runner = candidate.runner;
  if (!isAbsolute(directory) || realpathSync(directory) !== resolve(directory))
    throw new Error('unsafe_candidate_directory');
  directory = resolve(directory);
  for (const state of [candidate.stateDirectory, runner.runDirectory, runner.reportDirectory])
    if (directory === state || directory.startsWith(state + '/') || state.startsWith(directory + '/'))
      throw new Error('candidate_state_overlap');
  const dirFd = openSync(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  let pending;
  try {
    const info = fstatSync(dirFd);
    if (info.uid !== process.getuid() || (info.mode & 0o7777) !== 0o700)
      throw new Error('unsafe_candidate_directory');
    const data = Buffer.from(JSON.stringify(candidate, null, 2) + '\n');
    if (data.length > 16384) throw new Error('candidate_too_large');
    const sha256 = createHash('sha256').update(data).digest('hex');
    const path = join(directory, 'schedule-' + sha256 + '.json');
    const temporary = join(directory, '.schedule-' + randomUUID() + '.pending');
    const fd = openSync(temporary, 'wx', 0o600);
    pending = temporary;
    try { fchmodSync(fd, 0o600); writeFileSync(fd, data); fsyncSync(fd); } finally { closeSync(fd); }
    linkSync(pending, path); unlinkSync(pending); pending = undefined; fsyncSync(dirFd);
    return {prepared:true, path, sha256, enabled:false, identitiesVerified:false, installed:false};
  } finally {
    try { if (pending) unlinkSync(pending); } finally { closeSync(dirFd); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] === '--verify-only') {
      if (process.argv.length !== 5) throw new Error('invalid_arguments');
      console.log(JSON.stringify(verifySchedule(process.argv[3], process.argv[4])));
    } else {
    if (process.argv.length !== 4) throw new Error('invalid_arguments');
    console.log(JSON.stringify(prepareSchedule(readScheduleConfig(process.argv[2]), process.argv[3])));
    }
  } catch {
    console.error('{"prepared":false,"reason":"schedule_preparation_failed"}');
    process.exitCode = 2;
  }
}
