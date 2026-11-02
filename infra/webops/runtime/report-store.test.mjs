import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, chmodSync,
  symlinkSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { storeDiagnosticReport } from './report-store.mjs';

const monitor = {readOnly: true, remediationExecuted: false, productionWrites: false,
  directNetworkAccess: false, bytes: 4, stopped: null, complete: true, healthy: true,
  checks: [{path: '/', healthy: true, finding: 'healthy', status: 200, bytes: 4, secret: 'omit-me'}]};
const metadata = () => ({runId: randomUUID(), generatedAt: '2026-10-27T12:00:00Z'});
function directory(t) {
  const dir = mkdtempSync(join(tmpdir(), 'webops-reports-'));
  chmodSync(dir, 0o700);
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return dir;
}

test('stores only a sanitized validated report with private permissions and matching digest', t => {
  const dir = directory(t);
  const result = storeDiagnosticReport(monitor, metadata(), {directory: dir});
  assert.equal(result.stored, true);
  assert.equal(result.immutable, false);
  assert.equal(result.reportsRemaining, 719);
  assert.deepEqual(readdirSync(dir), [result.name]);
  const bytes = readFileSync(join(dir, result.name));
  assert.equal(bytes.includes('omit-me'), false);
  assert.equal(result.bytes, bytes.length);
  assert.equal(result.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(statSync(join(dir, result.name)).mode & 0o777, 0o600);
  assert.equal(JSON.parse(bytes).outcome.healthy, true);
});

test('duplicate run cannot overwrite existing evidence', t => {
  const dir = directory(t), meta = metadata();
  const first = storeDiagnosticReport(monitor, meta, {directory: dir});
  const before = readFileSync(join(dir, first.name));
  assert.throws(() => storeDiagnosticReport(monitor, meta, {directory: dir}), /duplicate_report_run/);
  assert.deepEqual(readFileSync(join(dir, first.name)), before);
  assert.deepEqual(readdirSync(dir), [first.name]);
});

test('capacity stops writes and never prunes old reports', t => {
  const dir = directory(t);
  const result = storeDiagnosticReport(monitor, metadata(), {directory: dir, maxReports: 1});
  assert.equal(result.reportsRemaining, 0);
  assert.throws(() => storeDiagnosticReport(monitor, metadata(), {directory: dir, maxReports: 1}), /report_store_full/);
  assert.deepEqual(readdirSync(dir), [result.name]);
});

test('existing lock blocks writers without deleting the lock', t => {
  const dir = directory(t);
  mkdirSync(join(dir, '.report-store.lock'));
  assert.throws(() => storeDiagnosticReport(monitor, metadata(), {directory: dir}), /report_store_locked/);
  assert.deepEqual(readdirSync(dir), ['.report-store.lock']);
});

test('unsafe directory permissions and symlink directories are rejected', t => {
  const root = directory(t), dir = join(root, 'reports'), alias = join(root, 'alias');
  mkdirSync(dir, {mode: 0o755});
  assert.throws(() => storeDiagnosticReport(monitor, metadata(), {directory: dir}), /unsafe_report_directory/);
  chmodSync(dir, 0o700);
  symlinkSync(dir, alias);
  assert.throws(() => storeDiagnosticReport(monitor, metadata(), {directory: alias}), /unsafe_report_directory/);
  assert.deepEqual(readdirSync(dir), []);
});

test('foreign files and symlink report entries are preserved and block storage', t => {
  const dir = directory(t);
  writeFileSync(join(dir, 'gateway.jsonl'), 'audit evidence', {mode: 0o600});
  assert.throws(() => storeDiagnosticReport(monitor, metadata(), {directory: dir}), /unexpected_report_store_entry/);
  assert.equal(readFileSync(join(dir, 'gateway.jsonl'), 'utf8'), 'audit evidence');
  rmSync(join(dir, 'gateway.jsonl'));
  symlinkSync('/does-not-exist', join(dir, `report-${randomUUID()}.json`));
  assert.throws(() => storeDiagnosticReport(monitor, metadata(), {directory: dir}), /unexpected_report_store_entry/);
  assert.equal(readdirSync(dir).length, 1);
});

test('invalid reports and storage limits leave no filesystem changes', t => {
  const dir = directory(t);
  assert.throws(() => storeDiagnosticReport({...monitor, productionWrites: true}, metadata(), {directory: dir}), /invalid_diagnostic_input/);
  for (const maxReports of [0, 721, 1.5, NaN])
    assert.throws(() => storeDiagnosticReport(monitor, metadata(), {directory: dir, maxReports}), /invalid_report_store_configuration/);
  assert.deepEqual(readdirSync(dir), []);
});

test('competing processes cannot exceed the final available slot', {timeout: 5000}, async t => {
  const dir = directory(t);
  const moduleUrl = new URL('./report-store.mjs', import.meta.url).href;
  const run = () => new Promise((resolve, reject) => {
    const source = `import {storeDiagnosticReport} from ${JSON.stringify(moduleUrl)};
      try { storeDiagnosticReport(${JSON.stringify(monitor)}, ${JSON.stringify(metadata())},
        {directory:${JSON.stringify(dir)},maxReports:1}); }
      catch(error) { if (!['report_store_locked','report_store_full'].includes(error.message)) {
        console.error(error); process.exit(3); } process.exit(2); }`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {stdio: ['ignore', 'ignore', 'pipe']});
    let errors = '';
    child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject);
    child.on('exit', code => code === 0 || code === 2 ? resolve(code) : reject(new Error(errors)));
  });
  const codes = await Promise.all([run(), run(), run()]);
  assert.equal(codes.filter(code => code === 0).length, 1);
  const files = readdirSync(dir);
  assert.equal(files.length, 1);
  assert.equal(JSON.parse(readFileSync(join(dir, files[0]))).schemaVersion, 1);
});
