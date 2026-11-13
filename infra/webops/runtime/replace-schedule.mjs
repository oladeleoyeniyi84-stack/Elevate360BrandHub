import {constants,openSync,closeSync,fstatSync,realpathSync,mkdirSync,rmdirSync,
  writeFileSync,fchmodSync,fsyncSync,renameSync} from 'node:fs';
import {dirname,resolve,join,isAbsolute} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readScheduleBytes,validateScheduleConfig} from './scheduled-runner.mjs';
import {verifySchedule} from './prepare-schedule.mjs';
import {localSystemctl} from './emergency-stop.mjs';

const digest = data => createHash('sha256').update(data).digest('hex');
const statePaths = config => [config.stateDirectory,config.runner.runDirectory,config.runner.reportDirectory].map(path => resolve(path));

// Explicit operator replacement only. Never starts/stops services or resets state.
export async function replaceSchedule({candidatePath,candidateSha256,targetPath,previousSha256},
  {systemctl=localSystemctl}={}) {
  if (![candidateSha256,previousSha256].every(x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x)) ||
      !isAbsolute(targetPath) || resolve(candidatePath)===resolve(targetPath)) throw Error('invalid_replacement');
  verifySchedule(candidatePath,candidateSha256);
  const bytes=readScheduleBytes(candidatePath);
  if(digest(bytes)!==candidateSha256) throw Error('candidate_changed');
  const candidate=JSON.parse(bytes);
  const parent=dirname(resolve(targetPath));
  if(realpathSync(parent)!==parent) throw Error('unsafe_config_parent');
  for(const path of statePaths(candidate))
    if(parent===path || parent.startsWith(path+'/') || path.startsWith(parent+'/')) throw Error('config_state_overlap');
  const fd=openSync(parent,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);
  const lock=join(parent,'.schedule-replacement.lock');
  let locked=false,completed=false;
  const stopped=async()=>{
    for(const unit of ['webops-monitor.timer','webops-monitor.service']) {
      const r=await systemctl(['show','--property=ActiveState','--value',unit]);
      if(r.code!==0 || r.stdout.toString('utf8').trim()!=='inactive') throw Error('units_not_inactive');
    }
    const r=await systemctl(['show','--property=UnitFileState','--value','webops-monitor.timer']);
    if(r.code!==0 || !['disabled','masked'].includes(r.stdout.toString('utf8').trim())) throw Error('timer_not_disabled');
  };
  const current=()=>{
    const data=readScheduleBytes(targetPath);
    if(digest(data)!==previousSha256) throw Error('previous_config_changed');
    const old=JSON.parse(data);
    if(old.enabled!==false) throw Error('previous_config_enabled');
    validateScheduleConfig({...old,enabled:true});
    if(JSON.stringify(statePaths(old))!==JSON.stringify(statePaths(candidate))) throw Error('state_paths_changed');
    return data;
  };
  const save=(path,data)=>{
    const file=openSync(path,'wx',0o600);
    try {fchmodSync(file,0o600);writeFileSync(file,data);fsyncSync(file);} finally {closeSync(file);}
  };
  try {
    const info=fstatSync(fd);
    if(info.uid!==process.getuid() || (info.mode&0o7777)!==0o700) throw Error('unsafe_config_parent');
    mkdirSync(lock,{mode:0o700});locked=true;fsyncSync(fd);
    await stopped();
    const previous=current();
    const backupPath=join(parent,'schedule-previous-'+previousSha256+'.json');
    save(backupPath,previous);fsyncSync(fd);
    const pending=join(parent,'.schedule-'+randomUUID()+'.pending');
    save(pending,bytes);fsyncSync(fd);
    await stopped();
    current();
    renameSync(pending,targetPath);fsyncSync(fd);
    if(digest(readScheduleBytes(targetPath))!==candidateSha256) throw Error('installed_config_mismatch');
    completed=true;
    return {installed:true,enabled:false,sha256:candidateSha256,previousSha256,backupPath,
      activated:false,identitiesVerified:false};
  } finally {
    try {if(locked && completed){rmdirSync(lock);fsyncSync(fd);}} finally {closeSync(fd);}
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if(process.argv.length!==6) throw Error('invalid_arguments');
    const [candidatePath,candidateSha256,targetPath,previousSha256]=process.argv.slice(2);
    console.log(JSON.stringify(await replaceSchedule({candidatePath,candidateSha256,targetPath,previousSha256})));
  } catch {
    console.error('{"installationConfirmed":false,"reason":"schedule_replacement_failed","inspectionRequired":true}');
    process.exitCode=2;
  }
}
