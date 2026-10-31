import { execFile } from 'node:child_process';
import { constants, openSync, closeSync, fstatSync, realpathSync, mkdirSync, rmdirSync, fsyncSync } from 'node:fs';
import { resolve, isAbsolute, join } from 'node:path';
import { decodeWorkerReport, ingestWorkerReport } from './report-ingest.mjs';

const HEX = /^[0-9a-f]{64}$/;
const IMAGE = /^sha256:[0-9a-f]{64}$/;
const PROJECTION = '{"id":{{json .Id}},"image":{{json .Image}},"running":{{json .State.Running}},' +
  '"paused":{{json .State.Paused}},"user":{{json .Config.User}},"readOnly":{{json .HostConfig.ReadonlyRootfs}},' +
  '"privileged":{{json .HostConfig.Privileged}},"capDrop":{{json .HostConfig.CapDrop}},' +
  '"capAdd":{{json .HostConfig.CapAdd}},"securityOpt":{{json .HostConfig.SecurityOpt}},' +
  '"mounts":{{json .Mounts}},"networks":{{json .NetworkSettings.Networks}},' +
  '"ports":{{json .HostConfig.PortBindings}},"restart":{{json .HostConfig.RestartPolicy.Name}},' +
  '"memory":{{json .HostConfig.Memory}},"nanoCpus":{{json .HostConfig.NanoCpus}},"pids":{{json .HostConfig.PidsLimit}}}';

export function localDocker(args, timeoutMs, execute = execFile) {
  return new Promise((resolve, reject) => {
    execute('/usr/bin/docker', ['--host', 'unix:///var/run/docker.sock', ...args],
      {encoding: 'buffer', timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 65536,
        env: {PATH: '/usr/bin:/bin', LANG: 'C'}}, (error, stdout, stderr) => {
        if (error && (error.killed || error.signal || !Number.isInteger(error.code))) {
          reject(new Error('docker_execution_failed')); return;
        }
        resolve({code: error ? error.code : 0, stdout, stderr});
      });
  });
}

function validateOptions(options) {
  const {containerId, imageId, networkId, paths, runDirectory, reportDirectory} = options;
  if (!HEX.test(containerId) || !IMAGE.test(imageId) || !HEX.test(networkId) ||
      !Array.isArray(paths) || paths.length < 1 || paths.length > 14 || new Set(paths).size !== paths.length ||
      typeof runDirectory !== 'string' || !isAbsolute(runDirectory) ||
      typeof reportDirectory !== 'string' || !isAbsolute(reportDirectory)) throw new Error('invalid_runner_configuration');
  for (const path of paths) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') ||
        path.length > 1024 || /[\\\x00-\x20\x7f?#]/.test(path) ||
        new URL(path, 'https://www.elevate360official.com').pathname !== path)
      throw new Error('invalid_runner_configuration');
  }
  const run = resolve(runDirectory), reports = resolve(reportDirectory);
  if (run === reports || run.startsWith(reports + '/') || reports.startsWith(run + '/'))
    throw new Error('invalid_runner_configuration');
  return {containerId, imageId, networkId, paths: [...paths], runDirectory: run, reportDirectory: reports};
}

function verifyWorker(worker, expected) {
  const networks = Object.values(worker.networks ?? {});
  if (worker.id !== expected.containerId || worker.image !== expected.imageId ||
      worker.running !== true || worker.paused !== false || worker.user !== '1000:1000' ||
      worker.readOnly !== true || worker.privileged !== false ||
      JSON.stringify(worker.capDrop) !== '["ALL"]' || (worker.capAdd?.length ?? 0) !== 0 ||
      !worker.securityOpt?.includes('no-new-privileges:true') ||
      !Array.isArray(worker.mounts) || worker.mounts.length !== 0 ||
      networks.length !== 1 || networks[0].NetworkID !== expected.networkId ||
      networks[0].IPAddress !== '172.30.0.3' || Object.keys(worker.ports ?? {}).length !== 0 ||
      worker.restart !== 'no' || !Number.isInteger(worker.memory) || worker.memory < 1 || worker.memory > 134217728 ||
      !Number.isInteger(worker.nanoCpus) || worker.nanoCpus < 1 || worker.nanoCpus > 250000000 ||
      !Number.isInteger(worker.pids) || worker.pids < 1 || worker.pids > 64)
    throw new Error('worker_identity_or_isolation_mismatch');
}

// Explicit single invocation, never a scheduler. Expected IDs come from a trusted
// release review, not the worker report. A failed attempt leaves a durable lock.
export async function runMonitorOnce(options, {docker = localDocker, now = Date.now} = {}) {
  const expected = validateOptions(options);
  if (realpathSync(expected.runDirectory) !== expected.runDirectory) throw new Error('unsafe_runner_directory');
  const fd = openSync(expected.runDirectory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  let locked = false, completed = false;
  const lockPath = join(expected.runDirectory, 'run.lock');
  try {
    const info = fstatSync(fd);
    if (!info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o777) !== 0o700)
      throw new Error('unsafe_runner_directory');
    try { mkdirSync(lockPath, {mode: 0o700}); locked = true; }
    catch (error) { if (error.code === 'EEXIST') throw new Error('runner_locked'); throw error; }
    fsyncSync(fd);
    const inspect = async () => {
      const result = await docker(['inspect', '--format', PROJECTION, expected.containerId], 10000);
      if (result.code !== 0 || result.stderr.length || !Buffer.isBuffer(result.stdout) || result.stdout.length > 65536)
        throw new Error('worker_inspection_failed');
      verifyWorker(JSON.parse(result.stdout.toString('utf8')), expected);
    };
    await inspect();
    const startedAt = now();
    const result = await docker(['exec', expected.containerId, 'node', '/app/monitor-cli.mjs', ...expected.paths], 35000);
    const endedAt = now();
    if (![0, 1].includes(result.code) || result.stderr.length) throw new Error('worker_execution_failed');
    const {monitor, metadata} = decodeWorkerReport(result.stdout);
    const stamp = Date.parse(metadata.generatedAt);
    if (result.code !== (monitor.healthy ? 0 : 1) ||
        !Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt ||
        stamp < startedAt - 5000 || stamp > endedAt + 5000 ||
        monitor.checks.some((check, i) => check.path !== expected.paths[i]) ||
        (monitor.complete && monitor.checks.length !== expected.paths.length))
      throw new Error('worker_report_scope_or_exit_mismatch');
    await inspect();
    const receipt = ingestWorkerReport(result.stdout, {directory: expected.reportDirectory});
    completed = true;
    return Object.freeze({workerExitCode: result.code, ingestionExitCode: receipt.exitCode,
      containerId: expected.containerId, imageId: expected.imageId, receipt});
  } finally {
    try {
      // Keep locks after any ambiguous failure; never auto-retry a possibly live exec.
      if (locked && completed) { rmdirSync(lockPath); fsyncSync(fd); }
    } finally { closeSync(fd); }
  }
}
