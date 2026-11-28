import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,readdirSync,statSync,writeFileSync,chmodSync,symlinkSync,linkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareSchedule,verifySchedule} from './prepare-schedule.mjs';
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

test('verification checks trusted digest without changing candidate or creating state',t=>{
  const f=fixture(t), receipt=prepareSchedule(f.config,f.output);
  const before=readFileSync(receipt.path), metadata=statSync(receipt.path);
  assert.equal(verifySchedule(receipt.path,receipt.sha256).verified,true);
  assert.throws(()=>verifySchedule(receipt.path,'z'.repeat(64)),/invalid_candidate_digest/);
  assert.throws(()=>verifySchedule(receipt.path,'0'.repeat(64)),/candidate_digest_mismatch/);
  writeFileSync(receipt.path,Buffer.concat([before,Buffer.from(' ')]));
  assert.throws(()=>verifySchedule(receipt.path,receipt.sha256),/candidate_digest_mismatch/);
  writeFileSync(receipt.path,before);
  assert.equal(statSync(receipt.path).ino,metadata.ino);
  assert.deepEqual(readdirSync(f.root),['candidates']);
  assert.equal(readdirSync(f.output).length,1);
});

test('matching digest cannot authorize enabled invalid or noncanonical candidates',t=>{
  for(const mutate of [c=>{c.enabled=true;},c=>{c.runner.networkId='network';},c=>{c.extra=true;}]) {
    const f=fixture(t),receipt=prepareSchedule(f.config,f.output);
    const c=JSON.parse(readFileSync(receipt.path));mutate(c);
    const data=JSON.stringify(c,null,2)+'\n';writeFileSync(receipt.path,data);
    assert.throws(()=>verifySchedule(receipt.path,createHash('sha256').update(data).digest('hex')));
  }
});

test('verification rejects unsafe permissions links and missing files',t=>{
  const f=fixture(t),receipt=prepareSchedule(f.config,f.output);
  chmodSync(receipt.path,0o644);
  assert.throws(()=>verifySchedule(receipt.path,receipt.sha256),/unsafe_schedule_config/);
  chmodSync(receipt.path,0o600);
  const linked=join(f.output,'linked');symlinkSync(receipt.path,linked);
  assert.throws(()=>verifySchedule(linked,receipt.sha256),/unsafe_schedule_config/);
  linkSync(receipt.path,join(f.output,'hardlink'));
  assert.throws(()=>verifySchedule(receipt.path,receipt.sha256),/unsafe_schedule_config/);
  assert.throws(()=>verifySchedule(join(f.output,'missing'),receipt.sha256));
});

test('verification CLI succeeds read-only and sanitizes failures',t=>{
  const f=fixture(t),receipt=prepareSchedule(f.config,f.output);
  const cli=new URL('./prepare-schedule.mjs',import.meta.url);
  const invoke=digest=>spawnSync(process.execPath,[cli.pathname,'--verify-only',receipt.path,digest],{encoding:'utf8'});
  const ok=invoke(receipt.sha256);assert.equal(ok.status,0);assert.equal(JSON.parse(ok.stdout).verified,true);
  const failed=invoke('0'.repeat(64));assert.equal(failed.status,2);assert.equal(failed.stdout,'');
  assert.equal(failed.stderr,'{"prepared":false,"reason":"schedule_preparation_failed"}\n');
  assert.deepEqual(readdirSync(f.root),['candidates']);assert.equal(readdirSync(f.output).length,1);
});
