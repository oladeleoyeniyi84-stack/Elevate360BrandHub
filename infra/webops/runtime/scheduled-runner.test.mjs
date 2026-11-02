import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, chmodSync, symlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { scheduledTick, readScheduleConfig } from './scheduled-runner.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'webops-schedule-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const stateDirectory = join(root, 'schedule'); mkdirSync(stateDirectory, {mode: 0o700});
  const config = {schemaVersion: 1, enabled: true, intervalMinutes: 60, stateDirectory,
    runner: {runDirectory: join(root, 'runner'), reportDirectory: join(root, 'reports')}};
  let time = 1800000000000, count = 0;
  const deps = {now: () => time, run: async options => {
    assert.deepEqual(options, config.runner); count++;
    assert.equal(JSON.parse(readFileSync(join(stateDirectory, 'cadence.json'))).attemptedAt, time);
    return {ingestionExitCode: 1};
  }};
  return {root, config, deps, count: () => count, setTime: n => {time = n;}, initial: time};
}

test('disabled configuration does not access host state or execute', async () => {
  assert.deepEqual(await scheduledTick({schemaVersion: 1, enabled: false}, {
    run: () => {throw new Error('must not execute');}, now: () => {throw new Error('must not read clock');}
  }), {status: 'disabled'});
});

test('durable reservation blocks repeated ticks and permits the next due unhealthy run', async t => {
  const f = fixture(t);
  assert.equal((await scheduledTick(f.config, f.deps)).result.ingestionExitCode, 1);
  assert.equal((await scheduledTick(structuredClone(f.config), f.deps)).status, 'not_due');
  assert.equal(f.count(), 1);
  const configPath = join(f.root, 'config.json');
  writeFileSync(configPath, JSON.stringify(f.config), {mode: 0o600});
  const child = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import {readScheduleConfig,scheduledTick} from ${JSON.stringify(new URL('./scheduled-runner.mjs', import.meta.url).href)};
     console.log(JSON.stringify(await scheduledTick(readScheduleConfig(process.argv[1]), {now: () => ${f.initial}})));`,
    configPath], {encoding: 'utf8'});
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(child.stdout).status, 'not_due');
  f.setTime(f.initial + 3600000);
  assert.equal((await scheduledTick(f.config, f.deps)).status, 'completed');
  assert.equal(f.count(), 2);
  assert.deepEqual(readdirSync(f.config.stateDirectory), ['cadence.json']);
});

test('interval changes cannot shorten existing reservation; clock reversal blocks', async t => {
  const f = fixture(t); f.config.intervalMinutes = 120;
  await scheduledTick(f.config, f.deps);
  f.config.intervalMinutes = 60; f.setTime(f.initial + 3600000);
  assert.equal((await scheduledTick(f.config, f.deps)).status, 'not_due');
  f.setTime(f.initial - 1);
  await assert.rejects(scheduledTick(f.config, f.deps), /clock_reversed/);
  assert.equal(f.count(), 1);
});

test('in-flight overlap and failed attempts remain blocked without retry', async t => {
  const f = fixture(t); let rejectRun;
  const pending = scheduledTick(f.config, {...f.deps, run: () => new Promise((_, reject) => {rejectRun = reject;})});
  await assert.rejects(scheduledTick(f.config, f.deps), /schedule_locked/);
  rejectRun(new Error('ambiguous execution'));
  await assert.rejects(pending, /ambiguous/);
  f.setTime(f.initial + 7200000);
  await assert.rejects(scheduledTick(f.config, f.deps), /schedule_locked/);
  assert.equal(f.count(), 0);
});

test('unsafe or corrupted state never reaches runner', async t => {
  for (const kind of ['symlink', 'corrupt', 'permissions', 'pending']) {
    const f = fixture(t), path = join(f.config.stateDirectory, 'cadence.json');
    if (kind === 'symlink') symlinkSync(join(f.root, 'missing'), path);
    if (kind === 'corrupt') writeFileSync(path, '{}', {mode: 0o600});
    if (kind === 'permissions') chmodSync(f.config.stateDirectory, 0o755);
    if (kind === 'pending') writeFileSync(join(f.config.stateDirectory, 'cadence.pending'), 'interrupted');
    await assert.rejects(scheduledTick(f.config, f.deps));
    assert.equal(f.count(), 0);
  }
});

test('out-of-range cadence and overlapping directories fail before execution', async t => {
  for (const intervalMinutes of [0, 59, 10081, 60.5, '60']) {
    const f = fixture(t); f.config.intervalMinutes = intervalMinutes;
    await assert.rejects(scheduledTick(f.config, f.deps), /invalid_schedule_configuration/);
  }
  const f = fixture(t); f.config.runner.runDirectory = f.config.stateDirectory;
  await assert.rejects(scheduledTick(f.config, f.deps), /invalid_schedule_configuration/);
});

test('operator CLI reads private config, stays disabled and sanitizes invalid input', t => {
  const f = fixture(t), path = join(f.root, 'config.json');
  writeFileSync(path, JSON.stringify({schemaVersion: 1, enabled: false}), {mode: 0o600});
  assert.equal(readScheduleConfig(path).enabled, false);
  const cli = new URL('./scheduled-runner-cli.mjs', import.meta.url);
  let child = spawnSync(process.execPath, [cli.pathname, path], {encoding: 'utf8'});
  assert.equal(child.status, 0); assert.deepEqual(JSON.parse(child.stdout), {status: 'disabled'});
  writeFileSync(path, 'private invalid input');
  child = spawnSync(process.execPath, [cli.pathname, path], {encoding: 'utf8'});
  assert.equal(child.status, 2); assert.equal(child.stdout, '');
  assert.equal(child.stderr, '{"status":"blocked","reason":"scheduled_run_failed"}\n');
  chmodSync(path, 0o644); assert.throws(() => readScheduleConfig(path), /unsafe_schedule_config/);
});
