import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { verifyCapacityGate, REPORT_CAPACITY_RESERVE } from './capacity-gate.mjs';

function fixture(t, enabled = true) {
  const root = mkdtempSync(join(tmpdir(), 'webops-capacity-gate-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  for (const name of ['schedule-state', 'runner', 'reports']) mkdirSync(join(root, name), {mode:0o700});
  const schedule = enabled ? {schemaVersion:1, enabled:true, intervalMinutes:60,
    stateDirectory:join(root, 'schedule-state'), runner:{containerId:'a'.repeat(64),
      imageId:'sha256:'+'b'.repeat(64), networkId:'c'.repeat(64), paths:['/'],
      runDirectory:join(root, 'runner'), reportDirectory:join(root, 'reports')}} :
    {schemaVersion:1, enabled:false};
  const schedulePath = join(root, 'schedule.json');
  writeFileSync(schedulePath, JSON.stringify(schedule, null, 2) + '\n', {mode:0o600});
  return {root, schedulePath, reports:join(root, 'reports')};
}

function addReports(directory, count) {
  for (let i = 0; i < count; i++)
    writeFileSync(join(directory, `report-${randomUUID()}.json`), '{}', {mode:0o600});
}

test('enabled schedule passes only above the protected report reserve', t => {
  const f = fixture(t);
  addReports(f.reports, 695);
  assert.deepEqual(verifyCapacityGate(f.schedulePath), {permitted:true, enabled:true,
    capacityChecked:true, reportsRemaining:25, reserve:REPORT_CAPACITY_RESERVE});
  assert.equal(readdirSync(f.reports).length, 695);
  addReports(f.reports, 1);
  assert.throws(() => verifyCapacityGate(f.schedulePath), /report_capacity_low/);
  assert.equal(readdirSync(f.reports).length, 696);
  assert.equal(readdirSync(f.reports).includes('.report-store.lock'), false);
});

test('disabled schedule does not inspect report storage', t => {
  const f = fixture(t, false);
  assert.deepEqual(verifyCapacityGate(f.schedulePath, {inspect:()=>{
    throw new Error('must not inspect');
  }}), {permitted:true, enabled:false, capacityChecked:false});
});

test('invalid, locked and foreign stores fail closed without Docker or cleanup', t => {
  for (const kind of ['invalid-result', 'locked', 'foreign']) {
    const f = fixture(t);
    if (kind === 'invalid-result') {
      assert.throws(() => verifyCapacityGate(f.schedulePath, {inspect:()=>({reportsRemaining:25})}),
        /report_capacity_low/);
      continue;
    }
    if (kind === 'locked') mkdirSync(join(f.reports, '.report-store.lock'));
    if (kind === 'foreign') writeFileSync(join(f.reports, 'unexpected'), 'preserve', {mode:0o600});
    assert.throws(() => verifyCapacityGate(f.schedulePath));
    assert.ok(readdirSync(f.reports).includes(kind === 'locked' ? '.report-store.lock' : 'unexpected'));
  }
});

test('CLI emits fixed journal-safe output and ExecCondition status', t => {
  const f = fixture(t);
  addReports(f.reports, 696);
  const child = spawnSync(process.execPath,
    [new URL('./capacity-gate.mjs', import.meta.url).pathname, f.schedulePath], {encoding:'utf8'});
  assert.equal(child.status, 1);
  assert.equal(child.stdout, '');
  assert.equal(child.stderr.trim(), '{"permitted":false,"reason":"report_capacity_gate_blocked"}');
  assert.equal(readdirSync(f.reports).length, 696);
});
