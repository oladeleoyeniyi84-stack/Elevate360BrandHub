import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, readdirSync, writeFileSync, chmodSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { storeDiagnosticReport } from './report-store.mjs';
import { exportReports, verifyReportBundle } from './report-export.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'webops-export-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const source = join(root, 'source'), destination = join(root, 'destination');
  for (const p of [source, destination]) mkdirSync(p, {mode: 0o700});
  const receipt = storeDiagnosticReport({readOnly: true, remediationExecuted: false, productionWrites: false,
    directNetworkAccess: false, bytes: 4, stopped: null, complete: true, healthy: true,
    checks: [{path: '/', healthy: true, finding: 'healthy', status: 200, bytes: 4}]},
    {runId: randomUUID(), generatedAt: '2026-11-01T12:00:00Z'}, {directory: source});
  return {source, destination, name: receipt.name};
}
test('exports exact bytes and verifies a copied bundle without deleting originals', t => {
  const f = fixture(t), original = readFileSync(join(f.source, f.name));
  const receipt = exportReports(f.source, f.destination), path = join(f.destination, receipt.name);
  const bytes = readFileSync(path);
  assert.equal(receipt.reports, 1); assert.equal(receipt.sourceDeleted, false);
  assert.equal(receipt.immutable, false); assert.equal(receipt.authentic, false);
  assert.equal(verifyReportBundle(bytes, receipt.sha256).verified, true);
  assert.deepEqual(Buffer.from(JSON.parse(bytes).entries[0].base64, 'base64'), original);
  assert.deepEqual(readFileSync(join(f.source, f.name)), original);
  assert.equal(statSync(path).mode & 0o777, 0o600);
  const cli = new URL('./report-export-cli.mjs', import.meta.url).pathname;
  const child = spawnSync(process.execPath, [cli, 'verify', path, receipt.sha256], {encoding: 'utf8'});
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(child.stdout).verified, true);
});
test('digest, entry hashes, run identity and report validation reject tampering', t => {
  const f = fixture(t), receipt = exportReports(f.source, f.destination);
  const bytes = readFileSync(join(f.destination, receipt.name));
  assert.throws(() => verifyReportBundle(bytes, '0'.repeat(64)), /digest/);
  for (const mutate of [b => {b.entries[0].sha256 = '0'.repeat(64);},
    b => {b.entries.push(b.entries[0]);}, b => {b.entries[0].name = '../secret';},
    b => {b.entries[0].bytes++;}, b => {b.entries[0].base64 += '\n';},
    b => {
      const report = JSON.parse(Buffer.from(b.entries[0].base64, 'base64'));
      report.controls.productionWrites = true;
      const data = Buffer.from(JSON.stringify(report));
      Object.assign(b.entries[0], {base64: data.toString('base64'), bytes: data.length, sha256: hash(data)});
    }]) {
    const bundle = JSON.parse(bytes); mutate(bundle); const changed = Buffer.from(JSON.stringify(bundle));
    assert.throws(() => verifyReportBundle(changed, hash(changed)));
  }
});
test('existing store lock blocks export and is never cleared', t => {
  const f = fixture(t); mkdirSync(join(f.source, '.report-store.lock'));
  assert.throws(() => exportReports(f.source, f.destination));
  assert.ok(readdirSync(f.source).includes('.report-store.lock'));
  assert.deepEqual(readdirSync(f.destination), []);
});
test('foreign, symlink, malformed and permissive entries block publication', t => {
  for (const kind of ['foreign', 'symlink', 'malformed', 'permissions']) {
    const f = fixture(t), path = join(f.source, f.name);
    if (kind === 'foreign') writeFileSync(join(f.source, 'private.env'), 'secret');
    if (kind === 'symlink') {rmSync(path); symlinkSync('/missing', path);}
    if (kind === 'malformed') writeFileSync(path, '{}');
    if (kind === 'permissions') chmodSync(path, 0o644);
    assert.throws(() => exportReports(f.source, f.destination));
    assert.deepEqual(readdirSync(f.destination), []);
    assert.ok(!readdirSync(f.source).includes('.report-store.lock'));
  }
});
test('overlap, unsafe destinations and empty stores cannot produce success', t => {
  const f = fixture(t);
  assert.throws(() => exportReports(f.source, f.source), /overlapping/);
  chmodSync(f.destination, 0o755);
  assert.throws(() => exportReports(f.source, f.destination), /unsafe_export_directory/);
  chmodSync(f.destination, 0o700); rmSync(join(f.source, f.name));
  assert.throws(() => exportReports(f.source, f.destination), /invalid_export_count/);
});
test('repeated exports preserve previous bundles and CLI errors omit file contents', t => {
  const f = fixture(t), first = exportReports(f.source, f.destination);
  const before = readFileSync(join(f.destination, first.name));
  const second = exportReports(f.source, f.destination);
  assert.notEqual(first.name, second.name); assert.equal(first.sha256, second.sha256);
  assert.deepEqual(readFileSync(join(f.destination, first.name)), before);
  const child = spawnSync(process.execPath, [new URL('./report-export-cli.mjs', import.meta.url).pathname,
    'verify', join(f.destination, first.name), 'invalid'], {encoding: 'utf8'});
  assert.equal(child.status, 2); assert.equal(child.stdout, '');
  assert.equal(child.stderr, '{"ok":false,"reason":"report_export_or_verification_failed"}\n');
});
