import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, chmodSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { verifyBootGate } from './boot-gate.mjs';

const BOOT = '123e4567-e89b-42d3-a456-426614174000';
function fixture(t, enabled = true) {
  const root = mkdtempSync(join(tmpdir(), 'webops-boot-gate-'));
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
  const digest = createHash('sha256').update(bytes).digest('hex');
  const approval = {schemaVersion:1, bootId:BOOT, scheduleSha256:digest,
    approvedAt:'2026-11-23T12:00:00.000Z', approvedBy:'operator',
    containersVerified:true, firewallVerified:true, dnsVerified:true};
  const approvalPath = join(root, 'approval.json');
  writeFileSync(approvalPath, JSON.stringify(approval) + '\n', {mode:0o600});
  return {root, schedulePath, approvalPath, approval, digest};
}

test('enabled schedule requires approval bound to exact boot and schedule', t => {
  const f = fixture(t);
  assert.deepEqual(verifyBootGate(f.schedulePath, f.approvalPath, {readBootId:()=>BOOT}),
    {permitted:true, enabled:true, approvalRequired:true, bootId:BOOT,
      scheduleSha256:f.digest, containersVerified:true, firewallVerified:true, dnsVerified:true});
  for (const mutate of [
    a => { a.bootId = '223e4567-e89b-42d3-a456-426614174000'; },
    a => { a.scheduleSha256 = '0'.repeat(64); },
    a => { a.containersVerified = false; },
    a => { a.firewallVerified = false; },
    a => { a.dnsVerified = false; },
    a => { a.extra = true; },
  ]) {
    const candidate = structuredClone(f.approval); mutate(candidate);
    writeFileSync(f.approvalPath, JSON.stringify(candidate) + '\n', {mode:0o600});
    assert.throws(() => verifyBootGate(f.schedulePath, f.approvalPath, {readBootId:()=>BOOT}));
  }
});

test('disabled schedule needs no approval or boot read', t => {
  const f = fixture(t, false);
  rmSync(f.approvalPath);
  assert.deepEqual(verifyBootGate(f.schedulePath, f.approvalPath, {
    readBootId:()=>{ throw new Error('must not read boot'); },
  }), {permitted:true, enabled:false, approvalRequired:false});
});

test('unsafe approval files and changed schedule fail closed', t => {
  for (const kind of ['permissions', 'symlink', 'schedule-change']) {
    const f = fixture(t);
    if (kind === 'permissions') chmodSync(f.approvalPath, 0o644);
    if (kind === 'symlink') {
      const target = f.approvalPath + '.target';
      writeFileSync(target, JSON.stringify(f.approval), {mode:0o600});
      rmSync(f.approvalPath); symlinkSync(target, f.approvalPath);
    }
    if (kind === 'schedule-change') {
      const parsed = JSON.parse(readFileSync(f.schedulePath, 'utf8')); parsed.intervalMinutes = 120;
      writeFileSync(f.schedulePath, JSON.stringify(parsed, null, 2) + '\n', {mode:0o600});
    }
    assert.throws(() => verifyBootGate(f.schedulePath, f.approvalPath, {readBootId:()=>BOOT}));
  }
});

test('CLI blocks with a fixed result and ExecCondition-compatible status', t => {
  const f = fixture(t);
  f.approval.bootId = '223e4567-e89b-42d3-a456-426614174000';
  writeFileSync(f.approvalPath, JSON.stringify(f.approval) + '\n', {mode:0o600});
  const child = spawnSync(process.execPath, [new URL('./boot-gate.mjs', import.meta.url).pathname,
    f.schedulePath, f.approvalPath], {encoding:'utf8'});
  assert.equal(child.status, 1);
  assert.equal(child.stderr.trim(), '{"permitted":false,"reason":"boot_gate_blocked"}');
  assert.equal(child.stdout, '');
});
