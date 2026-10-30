import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, chmodSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildDiagnosticReport } from './report.mjs';
import { runMonitorOnce, localDocker } from './host-runner.mjs';

function fixture(t, healthy = true) {
  const root = mkdtempSync(join(tmpdir(), 'webops-runner-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const options = {containerId: 'a'.repeat(64), imageId: 'sha256:' + 'b'.repeat(64), networkId: 'c'.repeat(64),
    paths: ['/', '/work'], runDirectory: join(root, 'state'), reportDirectory: join(root, 'reports')};
  for (const dir of [options.runDirectory, options.reportDirectory]) {mkdirSync(dir); chmodSync(dir, 0o700);}
  const worker = {id: options.containerId, image: options.imageId, running: true, paused: false,
    user: '1000:1000', readOnly: true, privileged: false, capDrop: ['ALL'], capAdd: null,
    securityOpt: ['no-new-privileges:true'], mounts: [], ports: {}, restart: 'no',
    memory: 134217728, nanoCpus: 250000000, pids: 64,
    networks: {internal: {NetworkID: options.networkId, IPAddress: '172.30.0.3'}}};
  const timestamp = Date.parse('2026-10-29T22:00:00Z');
  const report = JSON.parse(JSON.stringify(buildDiagnosticReport({readOnly: true, productionWrites: false,
    remediationExecuted: false, directNetworkAccess: false, healthy, complete: healthy,
    stopped: healthy ? null : 'gateway_rejected', bytes: healthy ? 4 : 0,
    checks: healthy ? options.paths.map(path => ({path, healthy: true, finding: 'healthy', status: 200, bytes: 2})) :
      [{path: '/', healthy: false, finding: 'gateway_rejected'}]},
    {runId: randomUUID(), generatedAt: new Date(timestamp).toISOString()})));
  const calls = [];
  const state = {worker, report, options, calls, timestamp, code: healthy ? 0 : 1};
  state.dependencies = {now: () => timestamp, docker: async (args, timeout) => {
    calls.push({args, timeout});
    return {code: args[0] === 'inspect' ? 0 : state.code,
      stdout: Buffer.from(JSON.stringify(args[0] === 'inspect' ? state.worker : state.report)), stderr: Buffer.alloc(0)};
  }};
  return state;
}

test('runs by immutable ID and stores healthy or unhealthy results with both statuses', async t => {
  for (const healthy of [true, false]) {
    const f = fixture(t, healthy);
    const result = await runMonitorOnce(f.options, f.dependencies);
    assert.equal(result.workerExitCode, healthy ? 0 : 1);
    assert.equal(result.ingestionExitCode, result.workerExitCode);
    assert.equal(result.receipt.stored, true);
    assert.deepEqual(f.calls.map(c => c.args[0]), ['inspect', 'exec', 'inspect']);
    assert.deepEqual(f.calls[1].args, ['exec', f.options.containerId, 'node', '/app/monitor-cli.mjs', '/', '/work']);
    assert.equal(f.calls[1].timeout, 35000);
    assert.deepEqual(readdirSync(f.options.runDirectory), []);
    assert.equal(readdirSync(f.options.reportDirectory).length, 1);
  }
});

test('wrong image or weakened isolation prevents execution and retains failure lock', async t => {
  const mutations = [w => {w.image = 'sha256:' + 'd'.repeat(64);}, w => {w.readOnly = false;},
    w => {w.mounts = [{}];}, w => {w.privileged = true;}, w => {w.networks.other = {};},
    w => {w.memory = 0;}, w => {w.securityOpt = [];}, w => {w.capAdd = ['NET_ADMIN'];}];
  for (const mutate of mutations) {
    const f = fixture(t); mutate(f.worker);
    await assert.rejects(runMonitorOnce(f.options, f.dependencies), /worker_identity_or_isolation_mismatch/);
    assert.equal(f.calls.length, 1);
    assert.deepEqual(readdirSync(f.options.runDirectory), ['run.lock']);
    assert.deepEqual(readdirSync(f.options.reportDirectory), []);
  }
});

test('stale reports, wrong route scope and exit contradictions are not stored', async t => {
  for (const mutate of [f => {f.report.generatedAt = '2020-01-01T00:00:00.000Z';},
    f => {f.report.observations[1].path = '/other';}, f => {f.code = 1;}, f => {f.code = 2;}]) {
    const f = fixture(t); mutate(f);
    await assert.rejects(runMonitorOnce(f.options, f.dependencies));
    assert.deepEqual(readdirSync(f.options.reportDirectory), []);
    assert.deepEqual(readdirSync(f.options.runDirectory), ['run.lock']);
  }
});

test('post-run identity drift rejects otherwise valid report', async t => {
  const f = fixture(t), original = f.dependencies.docker;
  f.dependencies.docker = async (...args) => {
    if (f.calls.length === 2) f.worker.paused = true;
    return original(...args);
  };
  await assert.rejects(runMonitorOnce(f.options, f.dependencies), /worker_identity_or_isolation_mismatch/);
  assert.equal(f.calls.length, 3);
  assert.deepEqual(readdirSync(f.options.reportDirectory), []);
});

test('execution ambiguity keeps lock and blocks another run before Docker', async t => {
  const f = fixture(t), original = f.dependencies.docker;
  f.dependencies.docker = (args, timeout) => args[0] === 'exec' ? Promise.reject(new Error('docker_execution_failed')) : original(args, timeout);
  await assert.rejects(runMonitorOnce(f.options, f.dependencies), /docker_execution_failed/);
  const count = f.calls.length;
  await assert.rejects(runMonitorOnce(f.options, f.dependencies), /runner_locked/);
  assert.equal(f.calls.length, count);
});

test('storage failure has no success receipt and retains failure lock', async t => {
  const f = fixture(t);
  chmodSync(f.options.reportDirectory, 0o755);
  await assert.rejects(runMonitorOnce(f.options, f.dependencies), /unsafe_report_directory/);
  assert.deepEqual(readdirSync(f.options.runDirectory), ['run.lock']);
});

test('invalid scope and overlapping state directories fail before Docker', async t => {
  for (const mutate of [f => {f.options.containerId = 'webops-worker';},
    f => {f.options.paths = ['//other.example'];}, f => {f.options.paths = ['/', '/'];},
    f => {f.options.reportDirectory = f.options.runDirectory;}]) {
    const f = fixture(t); mutate(f);
    await assert.rejects(runMonitorOnce(f.options, f.dependencies), /invalid_runner_configuration/);
    assert.equal(f.calls.length, 0);
  }
});

test('Docker adapter fixes executable/socket, bounds output and preserves exit one', async () => {
  const stdout = Buffer.from('report');
  const result = await localDocker(['exec', 'a'.repeat(64), 'node', '/app/monitor-cli.mjs', '/'], 35000,
    (file, args, options, callback) => {
      assert.equal(file, '/usr/bin/docker');
      assert.deepEqual(args.slice(0, 2), ['--host', 'unix:///var/run/docker.sock']);
      assert.equal(options.shell, undefined);
      assert.equal(options.maxBuffer, 65536);
      assert.equal(options.timeout, 35000);
      assert.equal(options.killSignal, 'SIGKILL');
      assert.deepEqual(Object.keys(options.env).sort(), ['LANG', 'PATH']);
      callback({code: 1}, stdout, Buffer.alloc(0));
    });
  assert.equal(result.code, 1);
  assert.deepEqual(result.stdout, stdout);
  for (const error of [{code: 'ENOENT'}, {code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'}, {code: 1, killed: true}])
    await assert.rejects(localDocker([], 10000, (file, args, options, callback) =>
      callback(error, Buffer.from('private'), Buffer.from('private'))), /docker_execution_failed/);
});
