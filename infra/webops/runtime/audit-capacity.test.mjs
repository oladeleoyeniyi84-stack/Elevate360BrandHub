import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
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

test('ambiguous audit writes retain lock and block later outbound requests', async t => {
  for (const failure of ['partial-write', 'zero-write', 'sync', 'close']) {
    const path = fixture(t);
    durableAudit(path)({decision:'startup'});
    const original = readFileSync(path);
    const method = failure === 'sync' ? 'fsyncSync' : failure === 'close' ? 'closeSync' : 'writeSync';
    const real = fs[method];
    let calls = 0;
    const mocked = t.mock.method(fs, method, (...args) => {
      calls++;
      if (failure === 'partial-write' && calls === 1) {
        return real(args[0], args[1], args[2], 5);
      }
      if (failure === 'zero-write') return 0;
      // Permit cleanup to close the descriptor after an injected close failure.
      if (failure === 'close' && calls > 1) return real(...args);
      throw new Error('injected_io_failure');
    });
    syncBuiltinESMExports();
    try {
      assert.throws(() => durableAudit(path)({decision:'attempt'}));
    } finally {
      mocked.mock.restore();
      syncBuiltinESMExports();
    }
    assert.equal(existsSync(path + '.lock'), true, failure);
    const after = readFileSync(path);
    assert.deepEqual(after.subarray(0, original.length), original);
    if (failure === 'partial-write') assert.equal(after.length, original.length + 5);
    if (failure === 'zero-write') assert.deepEqual(after, original);
    if (failure === 'sync' || failure === 'close') {
      assert.equal(after.at(-1), 10); // A complete line is not proof of durable success.
      assert.ok(after.length > original.length);
    }
    let networkCalls = 0;
    await assert.rejects(checkTarget('https://www.elevate360official.com/', {
      audit: durableAudit(path),
      resolve: async () => { networkCalls++; return []; },
      transport: async () => { networkCalls++; return new Response('ok'); },
    }), /EEXIST/);
    assert.equal(networkCalls, 0);
    assert.deepEqual(readFileSync(path), after);
    assert.equal(existsSync(path + '.lock'), true);
  }
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
