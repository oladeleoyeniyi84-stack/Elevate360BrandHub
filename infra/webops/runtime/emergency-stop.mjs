import { execFile } from 'node:child_process';
import { openSync, closeSync, writeFileSync, fsyncSync, renameSync, unlinkSync,
  lstatSync, realpathSync, constants } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readScheduleConfig } from './scheduled-runner.mjs';
import { localDocker } from './host-runner.mjs';

export function disableSchedule(path) {
  const config = readScheduleConfig(path), parent = dirname(resolve(path));
  const stat = lstatSync(parent);
  if (realpathSync(parent) !== parent || !stat.isDirectory() || stat.uid !== process.getuid() ||
      (stat.mode & 0o022)) throw new Error('unsafe_config_parent');
  const directory = openSync(parent, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  const pending = join(parent, '.disabled-' + randomUUID());
  let created = false;
  try {
    const fd = openSync(pending, 'wx', 0o600); created = true;
    try { writeFileSync(fd, JSON.stringify({...config, enabled: false}) + '\n'); fsyncSync(fd); }
    finally { closeSync(fd); }
    renameSync(pending, path); created = false; fsyncSync(directory);
  } finally {
    try { if (created) unlinkSync(pending); } finally { closeSync(directory); }
  }
}

export function localSystemctl(args) {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/systemctl', args, {encoding: 'buffer', timeout: 15000,
      killSignal: 'SIGKILL', maxBuffer: 65536, env: {PATH: '/usr/bin:/bin', LANG: 'C'}},
    (error, stdout, stderr) => {
      if (error && (error.killed || error.signal || !Number.isInteger(error.code))) {
        reject(new Error('systemctl_failed')); return;
      }
      resolve({code: error ? error.code : 0, stdout, stderr});
    });
  });
}

// Explicit operator action. No module-level execution, discovery, or restart.
export async function emergencyStop(options, {
  disable = disableSchedule, systemctl = localSystemctl, docker = localDocker
} = {}) {
  const {workerId, gatewayId, imageId, configPath} = options ?? {};
  if (![workerId, gatewayId].every(id => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)) ||
      workerId === gatewayId || typeof imageId !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(imageId) ||
      typeof configPath !== 'string' || !configPath.startsWith('/')) throw new Error('invalid_stop_configuration');
  const steps = [];
  const step = async (name, operation) => {
    try { await operation(); steps.push({name, ok: true}); }
    catch { steps.push({name, ok: false}); }
  };
  const command = async args => {
    const response = await systemctl(args);
    if (response.code !== 0) throw new Error('systemctl_failed');
  };
  await step('disable_configuration', () => disable(configPath));
  await step('disable_timer', () => command(['disable', '--now', 'webops-monitor.timer']));
  await step('stop_service', () => command(['stop', 'webops-monitor.service']));
  const projection = '{"id":{{json .Id}},"name":{{json .Name}},"image":{{json .Image}},"running":{{json .State.Running}}}';
  for (const [role, id] of [['worker', workerId], ['egress-gateway', gatewayId]]) {
    await step('stop_' + role, async () => {
      const inspect = async () => {
        const response = await docker(['inspect', '--format', projection, id], 10000);
        if (response.code !== 0 || response.stderr.length || !Buffer.isBuffer(response.stdout) ||
            response.stdout.length > 4096) throw new Error('inspection_failed');
        const value = JSON.parse(response.stdout.toString('utf8'));
        if (value.id !== id || value.name !== '/webops-' + role || value.image !== imageId ||
            typeof value.running !== 'boolean') throw new Error('identity_mismatch');
        return value;
      };
      const before = await inspect();
      if (before.running) {
        const result = await docker(['stop', '--time', '10', id], 15000);
        if (result.code !== 0) throw new Error('stop_failed');
      }
      if ((await inspect()).running) throw new Error('still_running');
    });
  }
  await step('verify_units_inactive', async () => {
    for (const unit of ['webops-monitor.timer', 'webops-monitor.service']) {
      const result = await systemctl(['show', '--property=ActiveState', '--value', unit]);
      if (result.code !== 0 || !['inactive', 'failed'].includes(result.stdout.toString('utf8').trim()))
        throw new Error('unit_not_stopped');
    }
    const timer = await systemctl(['show', '--property=UnitFileState', '--value', 'webops-monitor.timer']);
    if (timer.code !== 0 || !['disabled', 'masked'].includes(timer.stdout.toString('utf8').trim()))
      throw new Error('timer_not_disabled');
  });
  return {schemaVersion: 1, stopped: steps.every(s => s.ok), steps, restarted: false};
}
