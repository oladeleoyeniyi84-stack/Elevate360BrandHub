import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, chmodSync, mkdirSync, existsSync, symlinkSync, linkSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { durableAudit, checkTarget, MAX_AUDIT_BYTES } from './gateway.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'audit-capacity-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  return join(root, 'gateway.jsonl');
}

test('audit exact capacity succeeds and subsequent writes preserve evidence', t => {
  const path = fixture(t);
  durableAudit(path)({decision:'startup'});
  const original = readFileSync(path);
  const append = durableAudit(path, {maxBytes: original.length * 2});
  append({decision:'startup'});
  const full = readFileSync(path);
  assert.equal(full.length, original.length * 2);
  assert.throws(() => append({decision:'startup'}), /audit_capacity/);
  assert.deepEqual(readFileSync(path), full);
  assert.equal(existsSync(path + '.lock'), false);
  assert.throws(() => durableAudit(path, {maxBytes:MAX_AUDIT_BYTES + 1}), /invalid_audit_limit/);
});

test('full audit prevents DNS and transport before outbound request', async t => {
  const path = fixture(t);
  writeFileSync(path, '{}\n', {mode:0o600});
  let calls = 0;
  await assert.rejects(checkTarget('https://www.elevate360official.com/', {
    audit:durableAudit(path, {maxBytes:3}),
    resolve:async () => { calls++; return []; },
    transport:async () => { calls++; return new Response('ok'); },
  }), /audit_capacity/);
  assert.equal(calls, 0);
  assert.equal(readFileSync(path, 'utf8'), '{}\n');
});

test('existing lock and incomplete records block without deletion', t => {
  const path = fixture(t);
  writeFileSync(path, '{"partial":', {mode:0o600});
  assert.throws(() => durableAudit(path)({decision:'startup'}), /audit_incomplete_record/);
  assert.equal(readFileSync(path, 'utf8'), '{"partial":');
  mkdirSync(path + '.lock');
  assert.throws(() => durableAudit(path)({decision:'startup'}), /EEXIST/);
  assert.equal(existsSync(path + '.lock'), true);
});

test('unsafe file types permissions and oversized records fail closed', t => {
  const path = fixture(t);
  const target = path + '.original';
  writeFileSync(target, '{}\n', {mode:0o600});
  symlinkSync(target, path);
  assert.throws(() => durableAudit(path)({decision:'startup'}));
  unlinkSync(path);
  linkSync(target, path);
  assert.throws(() => durableAudit(path)({decision:'startup'}), /unsafe_audit_file/);
  unlinkSync(path);
  writeFileSync(path, '{}\n', {mode:0o600});
  chmodSync(path, 0o644);
  assert.throws(() => durableAudit(path)({decision:'startup'}), /unsafe_audit_file/);
  chmodSync(path, 0o600);
  assert.throws(() => durableAudit(path)({extra:'x'.repeat(16384)}), /audit_record_limit/);
  assert.equal(readFileSync(path, 'utf8'), '{}\n');
  assert.equal(readFileSync(target, 'utf8'), '{}\n');
});
