import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync, chmodSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emergencyStop, disableSchedule } from './emergency-stop.mjs';

function fixture() {
  const options = {workerId: 'a'.repeat(64), gatewayId: 'b'.repeat(64),
    imageId: 'sha256:' + 'c'.repeat(64), configPath: '/private/config.json'};
  const calls = [], running = new Map([[options.workerId, true], [options.gatewayId, true]]);
  const deps = {
    disable: path => {calls.push(['disable', path]);},
    systemctl: async args => {calls.push(['systemctl', ...args]); return {code: 0,
      stdout: Buffer.from(args.includes('--property=UnitFileState') ? 'disabled\n' : 'inactive\n')};},
    docker: async args => {
      calls.push(['docker', ...args]); const id = args.at(-1);
      if (args[0] === 'stop') running.set(id, false);
      return {code: 0, stderr: Buffer.alloc(0), stdout: Buffer.from(JSON.stringify({id,
        name: id === options.workerId ? '/webops-worker' : '/webops-egress-gateway',
        image: options.imageId, running: running.get(id)}))};
    }
  };
  return {options, calls, running, deps};
}

test('disables scheduling before exact-ID container stops and confirms final state', async () => {
  const f = fixture(); const result = await emergencyStop(f.options, f.deps);
  assert.equal(result.stopped, true); assert.equal(result.restarted, false);
  assert.deepEqual(f.calls.slice(0, 3), [['disable', f.options.configPath],
    ['systemctl', 'disable', '--now', 'webops-monitor.timer'], ['systemctl', 'stop', 'webops-monitor.service']]);
  assert.deepEqual(f.calls.filter(c => c[1] === 'stop' && c[0] === 'docker').map(c => c.at(-1)),
    [f.options.workerId, f.options.gatewayId]);
});

test('configuration and service failures do not prevent remaining stop attempts', async () => {
  const f = fixture(); f.deps.disable = () => {throw new Error('private details');};
  f.deps.systemctl = async () => {throw new Error('private system error');};
  const result = await emergencyStop(f.options, f.deps);
  assert.equal(result.stopped, false);
  assert.equal(f.running.get(f.options.workerId), false);
  assert.equal(f.running.get(f.options.gatewayId), false);
  assert.ok(!JSON.stringify(result).includes('private'));
});

test('wrong container identity blocks its stop but still attempts the other container', async () => {
  const f = fixture(), original = f.deps.docker;
  f.deps.docker = async args => {
    const value = await original(args);
    if (args[0] === 'inspect' && args.at(-1) === f.options.workerId) {
      const parsed = JSON.parse(value.stdout); parsed.name = '/unrelated';
      value.stdout = Buffer.from(JSON.stringify(parsed));
    }
    return value;
  };
  const result = await emergencyStop(f.options, f.deps);
  assert.equal(result.stopped, false);
  assert.equal(f.running.get(f.options.workerId), true);
  assert.equal(f.running.get(f.options.gatewayId), false);
});

test('already stopped containers are verified without lifecycle commands', async () => {
  const f = fixture(); for (const id of f.running.keys()) f.running.set(id, false);
  assert.equal((await emergencyStop(f.options, f.deps)).stopped, true);
  assert.equal(f.calls.filter(c => c[0] === 'docker' && c[1] === 'stop').length, 0);
});

test('successful stop response without stopped state cannot produce success', async () => {
  const f = fixture(), original = f.deps.docker;
  f.deps.docker = args => args[0] === 'stop' ? Promise.resolve({code: 0}) : original(args);
  assert.equal((await emergencyStop(f.options, f.deps)).stopped, false);
});

test('invalid IDs cause no host operations', async () => {
  const f = fixture(); f.options.workerId = 'webops-worker';
  await assert.rejects(emergencyStop(f.options, f.deps), /invalid_stop_configuration/);
  assert.deepEqual(f.calls, []);
});

test('active units and ambiguous Docker failures never report a completed stop', async () => {
  const f = fixture(), original = f.deps.systemctl;
  f.deps.systemctl = args => args.includes('--property=ActiveState') ?
    Promise.resolve({code: 0, stdout: Buffer.from('active')}) : original(args);
  assert.equal((await emergencyStop(f.options, f.deps)).stopped, false);
  const g = fixture(); g.deps.docker = async () => {throw new Error('timed out with sensitive text');};
  const result = await emergencyStop(g.options, g.deps);
  assert.equal(result.stopped, false);
  assert.ok(result.steps.some(s => s.name === 'verify_units_inactive' && s.ok));
  assert.ok(!JSON.stringify(result).includes('sensitive'));
});

test('atomic configuration disable preserves release fields and rejects unsafe files', t => {
  const root = mkdtempSync(join(tmpdir(), 'webops-stop-')); t.after(() => rmSync(root, {recursive: true, force: true}));
  const path = join(root, 'config.json');
  writeFileSync(path, JSON.stringify({schemaVersion: 1, enabled: true, runner: {imageId: 'retained'}}), {mode: 0o600});
  disableSchedule(path);
  assert.deepEqual(JSON.parse(readFileSync(path)), {schemaVersion: 1, enabled: false, runner: {imageId: 'retained'}});
  assert.equal(statSync(path).mode & 0o777, 0o600);
  chmodSync(path, 0o644); assert.throws(() => disableSchedule(path));
  const link = join(root, 'link'); symlinkSync(path, link); assert.throws(() => disableSchedule(link));
});
