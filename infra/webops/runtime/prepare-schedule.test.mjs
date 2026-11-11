import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareSchedule} from './prepare-schedule.mjs';
import {readScheduleConfig,scheduledTick} from './scheduled-runner.mjs';

function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'schedule-prepare-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const output=join(root,'candidates'); mkdirSync(output,{mode:0o700});
  const config={schemaVersion:1,enabled:false,intervalMinutes:60,stateDirectory:join(root,'schedule'),
    runner:{containerId:'a'.repeat(64),imageId:'sha256:'+'b'.repeat(64),networkId:'c'.repeat(64),paths:['/','/work'],
      runDirectory:join(root,'runner'),reportDirectory:join(root,'reports')}};
  return {root,output,config};
}

test('prepared replacement remains disabled with private verified bytes and no state writes',async t=>{
  const f=fixture(t), receipt=prepareSchedule(f.config,f.output);
  const data=readFileSync(receipt.path);
  assert.equal(receipt.sha256,createHash('sha256').update(data).digest('hex'));
  assert.equal(statSync(receipt.path).mode & 0o777,0o600);
  assert.equal(receipt.installed,false); assert.equal(receipt.identitiesVerified,false);
  assert.deepEqual(await scheduledTick(readScheduleConfig(receipt.path),{run:()=>{throw Error('unexpected');}}),{status:'disabled'});
  assert.deepEqual(readdirSync(f.root),['candidates']);
  assert.throws(()=>prepareSchedule(f.config,f.output),/EEXIST/);
  assert.equal(readdirSync(f.output).length,1);
});

test('enabled invalid identities unsafe scope and overlapping state fail before publication',t=>{
  for(const mutate of [c=>{c.enabled=true;},c=>{c.runner.containerId='worker';},c=>{c.runner.paths=['//elsewhere'];},
    c=>{c.intervalMinutes=1;},c=>{c.stateDirectory=c.runner.runDirectory;},c=>{c.runner.reportDirectory=c.runner.runDirectory;}]) {
    const f=fixture(t); mutate(f.config); assert.throws(()=>prepareSchedule(f.config,f.output));
    assert.deepEqual(readdirSync(f.output),[]);
  }
});

test('invalid enabled runner is rejected before cadence or lock mutation',async t=>{
  const f=fixture(t); mkdirSync(f.config.stateDirectory,{mode:0o700});
  f.config.enabled=true; f.config.runner.imageId='mutable:latest';
  await assert.rejects(scheduledTick(f.config),/invalid_runner_configuration/);
  assert.deepEqual(readdirSync(f.config.stateDirectory),[]);
});
