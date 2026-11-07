import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, chmodSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PassThrough, Readable } from 'node:stream';
import { buildDiagnosticReport } from './report.mjs';
import { decodeWorkerReport, ingestWorkerReport, readWorkerReport } from './report-ingest.mjs';

function report(healthy = true) {
  return buildDiagnosticReport({readOnly: true, productionWrites: false, remediationExecuted: false,
    directNetworkAccess: false, bytes: healthy ? 2 : 0, complete: healthy, healthy,
    stopped: healthy ? null : 'gateway_rejected', checks: healthy ?
      [{path: '/', healthy: true, finding: 'healthy', status: 200, bytes: 2}] :
      [{path: '/', healthy: false, finding: 'gateway_rejected'}]},
    {runId: randomUUID(), generatedAt: '2026-10-28T12:00:00Z'});
}
const encode = data => Buffer.from(JSON.stringify(data));
function directory(t) {
  const dir = mkdtempSync(join(tmpdir(), 'webops-ingest-'));
  chmodSync(dir, 0o700);
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return dir;
}

test('valid healthy and unhealthy worker envelopes survive host handoff exactly', t => {
  const dir = directory(t);
  for (const healthy of [true, false]) {
    const envelope = report(healthy);
    const receipt = ingestWorkerReport(encode(envelope), {directory: dir});
    assert.equal(receipt.exitCode, healthy ? 0 : 1);
    assert.equal(receipt.stored, true);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, receipt.name))), envelope);
  }
});

test('changed origins, controls, proposals, schema and extra fields cannot enter storage', t => {
  const dir = directory(t);
  const mutations = [
    r => {r.scope.origin = 'https://other.example';},
    r => {r.controls.automaticRemediationAllowed = true;},
    r => {r.controls.productionWrites = true;},
    r => {r.proposals[0].execution = 'executed';},
    r => {r.schemaVersion = 2;},
    r => {r.secret = 'private';},
    r => {r.observations[0].secret = 'private';},
    r => {r.outcome.healthy = true;},
    r => {r.scope.routeCount = 14;},
  ];
  for (const mutate of mutations) {
    const value = JSON.parse(JSON.stringify(report(false))); mutate(value);
    assert.throws(() => ingestWorkerReport(encode(value), {directory: dir}), /invalid_worker_report/);
  }
  assert.deepEqual(readdirSync(dir), []);
});

test('invalid, multiple, oversized and malformed UTF-8 input is rejected', () => {
  for (const input of [Buffer.alloc(0), Buffer.alloc(65537), Buffer.from('{}\n{}'),
    Buffer.from('null'), Buffer.from('{'), Buffer.from([0xff]), 'not a buffer'])
    assert.throws(() => decodeWorkerReport(input), /invalid_worker_report/);
});

test('stream receiver accepts chunked bytes and releases listeners', async () => {
  const input = encode(report());
  const stream = Readable.from([input.subarray(0, 50), input.subarray(50)]);
  assert.deepEqual(await readWorkerReport(stream), input);
  for (const event of ['data', 'end', 'error', 'close']) assert.equal(stream.listenerCount(event), 0);
});

test('stream receiver bounds size and time and rejects incomplete delivery', async () => {
  await assert.rejects(readWorkerReport(Readable.from([Buffer.alloc(65537)])), /worker_report_input_failed/);
  const stalled = new PassThrough();
  await assert.rejects(readWorkerReport(stalled, {timeoutMs: 5}), /worker_report_input_failed/);
  assert.equal(stalled.destroyed, true);
  const closed = new PassThrough(), pending = readWorkerReport(closed);
  closed.destroy();
  await assert.rejects(pending, /worker_report_input_failed/);
});

test('CLI stores worker reports and distinguishes unhealthy results from ingestion failures', t => {
  const dir = directory(t);
  const cli = fileURLToPath(new URL('./report-ingest-cli.mjs', import.meta.url));
  for (const healthy of [true, false]) {
    const result = spawnSync(process.execPath, [cli, dir], {input: encode(report(healthy)), timeout: 2000});
    assert.equal(result.status, healthy ? 0 : 1);
    assert.equal(JSON.parse(result.stdout).stored, true);
    assert.equal(result.stderr.length, 0);
  }
  const result = spawnSync(process.execPath, [cli, dir], {input: 'private malformed content', timeout: 2000});
  assert.equal(result.status, 2);
  assert.equal(result.stdout.length, 0);
  assert.equal(result.stderr.toString(), '{"stored":false,"reason":"report_ingest_failed"}\n');
  assert.equal(readdirSync(dir).length, 2);
});

test('storage failure propagates without false receipt or replacing evidence', t => {
  const dir = directory(t), value = report();
  const first = ingestWorkerReport(encode(value), {directory: dir});
  assert.throws(() => ingestWorkerReport(encode(value), {directory: dir}), /duplicate_report_run/);
  assert.deepEqual(readdirSync(dir), [first.name]);
});
