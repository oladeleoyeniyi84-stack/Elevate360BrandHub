import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { guardedScheduledTick } from './guarded-scheduled-runner-cli.mjs';

const BOOT = '123e4567-e89b-42d3-a456-426614174000';
function fixture(t, enabled = true) {
  const root = mkdtempSync(join(tmpdir(), 'webops-guarded-schedule-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  for (const name of ['schedule-state', 'runner', 'reports']) mkdirSync(join(root, name), {mode:0o700});
  const schedule = enabled ? {schemaVersion:1, enabled:true, intervalMinutes:60,
    stateDirectory:join(root, 'schedule-state'), runner:{containerId:'a'.repeat(64),
      imageId:'sha256:'+'b'.repeat(64), networkId:'c'.repeat(64), paths:['/'],
      runDirectory:join(root, 'runner'), reportDirectory:join(root, 'reports')}} :
    {schemaVersion:1, enabled:false};
  const bytes = Buffer.from(JSON.stringify(schedule, null, 2) + '\n');
  const schedulePath = join(root, 'schedule.json');
  writeFileSync(schedulePath, bytes, {mode:0o600});
  const approvalPath = join(root, 'approval.json');
  writeFileSync(approvalPath, JSON.stringify({schemaVersion:1, bootId:BOOT,
    scheduleSha256:createHash('sha256').update(bytes).digest('hex'),
    approvedAt:'2026-11-27T12:00:00.000Z', approvedBy:'operator',
    containersVerified:true, firewallVerified:true, dnsVerified:true}) + '\n', {mode:0o600});
  return {root, schedule, schedulePath, approvalPath};
}

test('one approved schedule object reaches capacity check, reservation and runner', async t => {
  const f = fixture(t);
  let inspected, executed;
  const result = await guardedScheduledTick(f.schedulePath, f.approvalPath, {
    readBootId:()=>BOOT,
    inspect:directory => { inspected=directory; return {reportsRemaining:720, capacityLow:false}; },
    now:()=>1800000000000,
    run:async runner => { executed=runner; return {ingestionExitCode:0}; },
  });
  assert.equal(result.status, 'completed');
  assert.equal(inspected, f.schedule.runner.reportDirectory);
  assert.deepEqual(executed, f.schedule.runner);
  assert.deepEqual(readdirSync(f.schedule.stateDirectory), ['cadence.json']);
});

test('schedule replacement after approved read cannot change the executed object', async t => {
  const f = fixture(t);
  const original = structuredClone(f.schedule);
  let executed;
  await guardedScheduledTick(f.schedulePath, f.approvalPath, {
    readBootId:()=>BOOT,
    inspect:() => {
      const changed=structuredClone(f.schedule);
      changed.runner.containerId='d'.repeat(64);
      writeFileSync(f.schedulePath, JSON.stringify(changed, null, 2) + '\n', {mode:0o600});
      return {reportsRemaining:720, capacityLow:false};
    },
    now:()=>1800000000000,
    run:async runner => {executed=runner; return {ingestionExitCode:0};},
  });
  assert.deepEqual(executed, original.runner);
  assert.notEqual(JSON.parse(readFileSync(f.schedulePath)).runner.containerId, executed.containerId);
});

test('stale approval and low capacity block before cadence or runner', async t => {
  for (const kind of ['stale-approval','low-capacity']) {
    const f=fixture(t); let calls=0;
    if (kind==='stale-approval') {
      const changed=structuredClone(f.schedule); changed.intervalMinutes=120;
      writeFileSync(f.schedulePath, JSON.stringify(changed, null, 2) + '\n', {mode:0o600});
    }
    await assert.rejects(guardedScheduledTick(f.schedulePath,f.approvalPath,{
      readBootId:()=>BOOT,
      inspect:()=>({reportsRemaining:24,capacityLow:true}),
      run:async()=>{calls++;return {ingestionExitCode:0};},
    }));
    assert.equal(calls,0);
    assert.deepEqual(readdirSync(f.schedule.stateDirectory),[]);
  }
});

test('disabled schedule needs no approval, capacity read, cadence or Docker', async t => {
  const f=fixture(t,false); rmSync(f.approvalPath);
  const result=await guardedScheduledTick(f.schedulePath,f.approvalPath,{
    readBootId:()=>{throw new Error('must not read boot');},
    inspect:()=>{throw new Error('must not inspect');},
    now:()=>{throw new Error('must not read clock');},
    run:()=>{throw new Error('must not run');},
  });
  assert.deepEqual(result,{status:'disabled'});
});

test('CLI sanitizes rejected approval without reserving cadence', t => {
  const f=fixture(t);
  const approval=JSON.parse(readFileSync(f.approvalPath)); approval.bootId='223e4567-e89b-42d3-a456-426614174000';
  writeFileSync(f.approvalPath,JSON.stringify(approval)+'\n',{mode:0o600});
  const child=spawnSync(process.execPath,[new URL('./guarded-scheduled-runner-cli.mjs',import.meta.url).pathname,
    f.schedulePath,f.approvalPath],{encoding:'utf8'});
  assert.equal(child.status,2);assert.equal(child.stdout,'');
  assert.equal(child.stderr,'{\"status\":\"blocked\",\"reason\":\"guarded_scheduled_run_failed\"}\n');
  assert.deepEqual(readdirSync(f.schedule.stateDirectory),[]);
});
