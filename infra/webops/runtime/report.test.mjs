import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiagnosticReport } from './report.mjs';
import { monitorRoutes } from './monitor.mjs';

const metadata = { generatedAt: '2026-10-22T00:00:00Z', runId: '12345678-1234-4234-8234-123456789abc' };
const base = { readOnly: true, remediationExecuted: false, productionWrites: false,
  directNetworkAccess: false, bytes: 4, stopped: null, complete: true, healthy: true,
  checks: [{path:'/',healthy:true,finding:'healthy',status:200,bytes:4}] };

test('builds a bounded immutable healthy report without proposals',()=>{
  const report=buildDiagnosticReport(base,metadata);
  assert.equal(report.schemaVersion,1);assert.equal(report.outcome.healthy,true);
  assert.deepEqual(report.proposals,[]);assert.equal(report.controls.automaticRemediationAllowed,false);
  assert.ok(Object.isFrozen(report));assert.ok(Object.isFrozen(report.observations));
});

test('deduplicates observation and stop proposals and never authorizes execution',()=>{
  const report=buildDiagnosticReport({...base,healthy:false,complete:false,stopped:'gateway_rejected',bytes:0,
    checks:[{path:'/',healthy:false,finding:'gateway_rejected'}]},metadata);
  assert.equal(report.proposals.length,1);
  assert.deepEqual(report.proposals[0],{
    id:'gateway_rejected:_2F',finding:'gateway_rejected',severity:'high',
    proposedAction:'review_gateway_denial',productionApprovalRequired:true,
    automaticRemediationAllowed:false,execution:'not_executed'});
});

test('rejects contradictory health, completion, stop and byte claims', () => {
  const failure = { path: '/', healthy: false, finding: 'gateway_rejected' };
  const denied = { ...base, healthy: false, complete: false, bytes: 0,
    stopped: 'gateway_rejected', checks: [failure] };
  for (const input of [
    { ...base, healthy: false }, { ...base, complete: false }, { ...base, bytes: 5 },
    { ...base, checks: [], bytes: 0 }, { ...base, checks: [base.checks[0], base.checks[0]], bytes: 8 },
    { ...denied, healthy: true }, { ...denied, complete: true },
    { ...denied, stopped: null }, { ...denied, stopped: 'gateway_unavailable' },
    { ...denied, checks: [failure, { ...base.checks[0], path: '/work' }], bytes: 4 },
    { ...denied, checks: [failure, { ...failure, path: '/work' }] },
    { ...denied, checks: [], stopped: 'request_limit' },
    { ...denied, checks: [], stopped: 'byte_limit' },
    { ...denied, checks: [] },
    { ...denied, stopped: 'request_limit', checks: [{ ...failure, finding: 'request_limit' }] },
  ]) assert.throws(() => buildDiagnosticReport(input, metadata), /invalid_diagnostic_input/);
});

test('rejects unsafe, normalized and duplicate paths and malformed UUIDs', () => {
  for (const path of ['//other.example/', '/a/../b', '/%2e%2e/b', '/a?secret=1',
    '/a#fragment', '/a\\b', '/a b', '/a\n', '/é', '/\ud800']) {
    assert.throws(() => buildDiagnosticReport({ ...base, checks: [{ ...base.checks[0], path }] }, metadata),
      /invalid_diagnostic_input/);
  }
  for (const runId of ['-'.repeat(36), 'a'.repeat(36), '12345678-1234-4234-1234-123456789abc'])
    assert.throws(() => buildDiagnosticReport(base, { ...metadata, runId }), /invalid_diagnostic_input/);
});

test('accepts real monitor outcomes including cancellation and all failure modes', async () => {
  const success = async () => ({ ok: true, status: 200, bytes: 4 });
  const aborted = new AbortController(); aborted.abort();
  const cases = [
    { gateway: success },
    { gateway: success, maxRequests: 1 },
    { gateway: success, maxBytes: 4 },
    { gateway: success, maxBytes: 3 },
    { gateway: success, signal: aborted.signal },
    { gateway: async () => ({ ok: false }) },
    { gateway: async () => { throw new Error('private details'); } },
    { gateway: async () => null },
    { gateway: () => new Promise(() => {}), timeoutMs: 5 },
  ];
  const observed = new Set();
  for (const options of cases) {
    const result = await monitorRoutes({ paths: ['/', '/work'], ...options });
    const report = buildDiagnosticReport(result, metadata);
    observed.add(result.stopped);
    assert.equal(report.outcome.healthy, result.healthy);
    assert.equal(report.outcome.acceptedBodyBytes, result.bytes);
    assert.equal(JSON.stringify(report).includes('private details'), false);
    assert.ok(report.proposals.every(p => p.execution === 'not_executed'));
  }
  assert.equal(observed.size, 7);
});

test('rejects unsafe claims, arbitrary findings, leaked fields and bad metadata',()=>{
  for(const input of [
    {...base,productionWrites:true}, {...base,remediationExecuted:true},
    {...base,checks:[{path:'/',healthy:false,finding:'secret',reason:'leak'}]},
    {...base,checks:[{path:'/',healthy:true,finding:'healthy',status:200,bytes:4,secret:'ignored'}],bytes:-1},
  ]) assert.throws(()=>buildDiagnosticReport(input,metadata),/invalid_diagnostic_input/);
  assert.throws(()=>buildDiagnosticReport(base,{...metadata,runId:'bad'}),/invalid_diagnostic_input/);
});

test('copies only the allowed observation fields',()=>{
  const report=buildDiagnosticReport({...base,checks:[{...base.checks[0],secret:'excluded'}]},metadata);
  assert.equal(JSON.stringify(report).includes('excluded'),false);
});

test('creates a proposal for a run-level stop without a failing observation',()=>{
  const report=buildDiagnosticReport({...base,healthy:false,complete:false,stopped:'request_limit'},metadata);
  assert.equal(report.proposals[0].id,'request_limit:run');
  assert.equal(report.proposals[0].execution,'not_executed');
});
