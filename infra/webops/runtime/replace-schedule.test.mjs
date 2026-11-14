import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync,statSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareSchedule} from './prepare-schedule.mjs';
import {replaceSchedule,initializeSchedule} from './replace-schedule.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'replace-schedule-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const dir=join(root,'config'),out=join(root,'candidates');for(const p of [dir,out])mkdirSync(p,{mode:0o700});
 const old={schemaVersion:1,enabled:false,intervalMinutes:60,stateDirectory:join(root,'schedule'),runner:{
 containerId:'a'.repeat(64),imageId:'sha256:'+'b'.repeat(64),networkId:'c'.repeat(64),paths:['/'],
 runDirectory:join(root,'run'),reportDirectory:join(root,'reports')}};
 for(const p of [old.stateDirectory,old.runner.runDirectory,old.runner.reportDirectory]){
 mkdirSync(p,{mode:0o700});writeFileSync(join(p,'preserved'),'evidence',{mode:0o600});}
 const targetPath=join(dir,'schedule.json'),previous=Buffer.from(JSON.stringify(old)+'\n');writeFileSync(targetPath,previous,{mode:0o600});
 const next=structuredClone(old);next.runner.containerId='d'.repeat(64);
 const receipt=prepareSchedule(next,out),calls=[];
 const systemctl=async args=>{calls.push(args);return {code:0,stdout:Buffer.from(args.includes('--property=ActiveState')?'inactive\n':'disabled\n')};};
 return {root,dir,old,previous,calls,systemctl,args:{candidatePath:receipt.path,candidateSha256:receipt.sha256,targetPath,previousSha256:hash(previous)}};
}
test('disabled replacement preserves exact backup and all persistent state',async t=>{
 const f=fixture(t),r=await replaceSchedule(f.args,{systemctl:f.systemctl});
 assert.equal(r.installed,true);assert.equal(r.activated,false);assert.equal(r.identitiesVerified,false);
 assert.deepEqual(readFileSync(r.backupPath),f.previous);
 assert.equal(hash(readFileSync(f.args.targetPath)),f.args.candidateSha256);
 assert.equal(statSync(f.args.targetPath).mode&0o777,0o600);
 assert.equal(statSync(f.args.targetPath).nlink,1);
 assert.equal(f.calls.length,6);assert.ok(f.calls.every(x=>x[0]==='show'));
 assert.ok(!readdirSync(f.dir).includes('.schedule-replacement.lock'));
 for(const p of [f.old.stateDirectory,f.old.runner.runDirectory,f.old.runner.reportDirectory])assert.equal(readFileSync(join(p,'preserved'),'utf8'),'evidence');
});
test('active failed unknown units and enabled timer block replacement and retain lock',async t=>{
 for(const value of ['active','failed','activating','unknown','']){
 const f=fixture(t);await assert.rejects(replaceSchedule(f.args,{systemctl:async()=>({code:0,stdout:Buffer.from(value)})}));
 assert.deepEqual(readFileSync(f.args.targetPath),f.previous);assert.ok(readdirSync(f.dir).includes('.schedule-replacement.lock'));}
 const f=fixture(t);await assert.rejects(replaceSchedule(f.args,{systemctl:async args=>({code:0,stdout:Buffer.from(args.includes('--property=ActiveState')?'inactive':'enabled')})}));
 assert.deepEqual(readFileSync(f.args.targetPath),f.previous);
});
test('stale digest enabled previous and changed state paths never overwrite target',async t=>{
 for(const change of ['digest','enabled','paths']){
 const f=fixture(t);
 if(change==='digest')f.args.previousSha256='0'.repeat(64);
 else {const old=structuredClone(f.old);if(change==='enabled')old.enabled=true;else old.stateDirectory=join(f.root,'different');
 const bytes=JSON.stringify(old);writeFileSync(f.args.targetPath,bytes);f.args.previousSha256=hash(bytes);}
 const before=readFileSync(f.args.targetPath);
 await assert.rejects(replaceSchedule(f.args,{systemctl:f.systemctl}));assert.deepEqual(readFileSync(f.args.targetPath),before);
 }
});
test('candidate drift and symlink target are rejected without replacing content',async t=>{
 const f=fixture(t);writeFileSync(f.args.candidatePath,'tampered');
 await assert.rejects(replaceSchedule(f.args,{systemctl:f.systemctl}));assert.equal(f.calls.length,0);
 const g=fixture(t),link=join(g.dir,'link');symlinkSync(g.args.targetPath,link);g.args.targetPath=link;
 await assert.rejects(replaceSchedule(g.args,{systemctl:g.systemctl}));assert.deepEqual(readFileSync(link),g.previous);
});
test('existing lock or backup is preserved and blocks replacement',async t=>{
 for(const kind of ['lock','backup']){
 const f=fixture(t),path=join(f.dir,kind==='lock'?'.schedule-replacement.lock':'schedule-previous-'+f.args.previousSha256+'.json');
 if(kind==='lock')mkdirSync(path);else writeFileSync(path,'retained');
 await assert.rejects(replaceSchedule(f.args,{systemctl:f.systemctl}));assert.deepEqual(readFileSync(f.args.targetPath),f.previous);
 if(kind==='backup')assert.equal(readFileSync(path,'utf8'),'retained');}
});
test('configuration drift during second service check preserves changed file and recovery evidence',async t=>{
 const f=fixture(t);let count=0;
 const systemctl=async args=>{if(++count===4)writeFileSync(f.args.targetPath,'administrator edit');return f.systemctl(args);};
 await assert.rejects(replaceSchedule(f.args,{systemctl}),/previous_config_changed/);
 assert.equal(readFileSync(f.args.targetPath,'utf8'),'administrator edit');
 assert.ok(readdirSync(f.dir).some(x=>x.endsWith('.pending')));
 assert.ok(readdirSync(f.dir).includes('.schedule-replacement.lock'));
 assert.deepEqual(readFileSync(join(f.dir,'schedule-previous-'+f.args.previousSha256+'.json')),f.previous);
});

test('initial installation publishes disabled private bytes without touching state',async t=>{
 const f=fixture(t);rmSync(f.args.targetPath);
 const r=await initializeSchedule(f.args,{systemctl:f.systemctl});
 assert.equal(r.operation,'initialize');assert.equal(r.enabled,false);assert.equal(r.activated,false);
 assert.equal(r.previousSha256,undefined);assert.equal(r.backupPath,undefined);
 assert.equal(hash(readFileSync(f.args.targetPath)),f.args.candidateSha256);
 assert.equal(statSync(f.args.targetPath).nlink,1);assert.equal(statSync(f.args.targetPath).mode&0o777,0o600);
 assert.deepEqual(readdirSync(f.dir),['schedule.json']);
 for(const p of [f.old.stateDirectory,f.old.runner.runDirectory,f.old.runner.reportDirectory])assert.equal(readFileSync(join(p,'preserved'),'utf8'),'evidence');
});
test('initial installation never replaces existing file or dangling symlink',async t=>{
 for(const dangling of [false,true]){
 const f=fixture(t);if(dangling){rmSync(f.args.targetPath);symlinkSync(join(f.root,'absent'),f.args.targetPath);}
 await assert.rejects(initializeSchedule(f.args,{systemctl:f.systemctl}),/schedule_already_exists/);
 if(!dangling)assert.deepEqual(readFileSync(f.args.targetPath),f.previous);
 assert.ok(readdirSync(f.dir).includes('.schedule-replacement.lock'));
 }
});
test('late creation blocks initialization and preserves pending evidence',async t=>{
 const f=fixture(t);rmSync(f.args.targetPath);let calls=0;
 const systemctl=async args=>{if(++calls===4)writeFileSync(f.args.targetPath,'other installer',{mode:0o600});return f.systemctl(args);};
 await assert.rejects(initializeSchedule(f.args,{systemctl}),/schedule_already_exists/);
 assert.equal(readFileSync(f.args.targetPath,'utf8'),'other installer');
 assert.ok(readdirSync(f.dir).some(x=>x.endsWith('.pending')));
});
test('initialization cannot bypass stopped-unit requirements or run as implicit replacement',async t=>{
 const f=fixture(t);rmSync(f.args.targetPath);
 await assert.rejects(initializeSchedule(f.args,{systemctl:async()=>({code:1,stdout:Buffer.from('')})}));
 assert.throws(()=>statSync(f.args.targetPath),/ENOENT/);
 const g=fixture(t);rmSync(g.args.targetPath);
 await assert.rejects(replaceSchedule(g.args,{systemctl:g.systemctl}),/ENOENT/);
 assert.throws(()=>statSync(g.args.targetPath),/ENOENT/);
});
