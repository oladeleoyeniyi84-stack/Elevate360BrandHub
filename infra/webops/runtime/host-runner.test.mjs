import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, chmodSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
  const network = {id: options.networkId, driver:'bridge', internal:true, ipv6:false,
    options:{'com.docker.network.bridge.name':'br-webops-wkr'}, ipam:[{Subnet:'172.30.0.0/24', Gateway:'172.30.0.1'}]};
  const state = {worker, network, report, options, calls, timestamp, code: healthy ? 0 : 1};
  state.dependencies = {now: () => timestamp, docker: async (args, timeout) => {
    calls.push({args, timeout});
    return {code: args[0] === 'exec' ? state.code : 0,
      stdout: Buffer.from(JSON.stringify(args[0] === 'inspect' ? state.worker : args[0] === 'network' ? state.network : state.report)), stderr: Buffer.alloc(0)};
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
    assert.equal(result.capacityLow, false);
    assert.deepEqual(f.calls.map(c => c.args[0]), ['inspect', 'network', 'exec', 'inspect', 'network']);
    assert.equal(f.calls[1].args.at(-1), f.options.networkId);
    assert.deepEqual(f.calls[2].args, ['exec', f.options.containerId, 'node', '/app/monitor-cli.mjs', '/', '/work']);
    assert.equal(f.calls[2].timeout, 35000);
    assert.deepEqual(readdirSync(f.options.runDirectory), []);
    assert.equal(readdirSync(f.options.reportDirectory).length, 1);
  }
});

test('successful run surfaces low capacity without deleting retained files', async t => {
  const f = fixture(t);
  for (let i = 0; i < 695; i++)
    writeFileSync(join(f.options.reportDirectory, `report-${randomUUID()}.json`), '{}', {mode: 0o600});
  const result = await runMonitorOnce(f.options, f.dependencies);
  assert.equal(result.capacityLow, true);
  assert.equal(result.receipt.reportsRemaining, 24);
  assert.equal(readdirSync(f.options.reportDirectory).length, 696);
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
    if (f.calls.length === 3) f.worker.paused = true;
    return original(...args);
  };
  await assert.rejects(runMonitorOnce(f.options, f.dependencies), /worker_identity_or_isolation_mismatch/);
  assert.equal(f.calls.length, 4);
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
  assert.equal(f.calls.length, 0);
  assert.deepEqual(readdirSync(f.options.runDirectory), ['run.lock']);
});

test('full, locked and foreign report stores block before all Docker work', async t => {
  for (const kind of ['full', 'locked', 'foreign']) {
    const f = fixture(t);
    if (kind === 'full') for (let i = 0; i < 720; i++)
      writeFileSync(join(f.options.reportDirectory, `report-${randomUUID()}.json`), '{}', {mode: 0o600});
    if (kind === 'locked') mkdirSync(join(f.options.reportDirectory, '.report-store.lock'));
    if (kind === 'foreign') writeFileSync(join(f.options.reportDirectory, 'unexpected'), 'preserve');
    await assert.rejects(runMonitorOnce(f.options, f.dependencies));
    assert.equal(f.calls.length, 0);
    assert.deepEqual(readdirSync(f.options.runDirectory), ['run.lock']);
    if (kind === 'locked') assert.ok(readdirSync(f.options.reportDirectory).includes('.report-store.lock'));
  }
});

test('storage becoming unsafe during execution still blocks ingestion and retains lock', async t => {
  const f = fixture(t), original = f.dependencies.docker;
  f.dependencies.docker = async (...args) => {
    if (args[0][0] === 'exec') chmodSync(f.options.reportDirectory, 0o755);
    return original(...args);
  };
  await assert.rejects(runMonitorOnce(f.options, f.dependencies), /unsafe_report_directory/);
  assert.equal(f.calls.length, 5);
  assert.deepEqual(readdirSync(f.options.reportDirectory), []);
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

test('network isolation mismatch prevents worker execution and preserves failure lock', async t => {
  for (const mutate of [n => {n.internal=false;}, n => {n.driver='host';}, n => {n.ipv6=true;},
    n => {n.id='d'.repeat(64);}, n => {n.options={};}, n => {n.ipam=[];},
    n => {n.ipam[0].Subnet='172.31.0.0/24';}, n => {n.ipam[0].Gateway='172.30.0.254';}]) {
    const f = fixture(t); mutate(f.network);
    await assert.rejects(runMonitorOnce(f.options, f.dependencies), /network_identity_or_isolation_mismatch/);
    assert.equal(f.calls.some(c => c.args[0] === 'exec'), false);
    assert.deepEqual(readdirSync(f.options.runDirectory), ['run.lock']);
    assert.deepEqual(readdirSync(f.options.reportDirectory), []);
  }
});

test('network drift and inspection failure cannot produce a stored report', async t => {
  for (const failure of ['drift', 'error', 'malformed']) {
    const f = fixture(t), original = f.dependencies.docker;
    f.dependencies.docker = async (...args) => {
      if (args[0][0] === 'network' && f.calls.some(c => c.args[0] === 'exec')) {
        if (failure === 'drift') f.network.internal = false;
        if (failure === 'error') return {code:1, stdout:Buffer.alloc(0), stderr:Buffer.alloc(0)};
        if (failure === 'malformed') return {code:0, stdout:Buffer.from('invalid'), stderr:Buffer.alloc(0)};
      }
      return original(...args);
    };
    await assert.rejects(runMonitorOnce(f.options, f.dependencies));
    assert.deepEqual(readdirSync(f.options.reportDirectory), []);
    assert.deepEqual(readdirSync(f.options.runDirectory), ['run.lock']);
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
