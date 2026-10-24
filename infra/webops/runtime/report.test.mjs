import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiagnosticReport } from './report.mjs';

const metadata = { generatedAt: '2026-10-22T00:00:00Z', runId: '12345678-1234-1234-1234-123456789abc' };
const base = { readOnly: true, remediationExecuted: false, productionWrites: false,
  directNetworkAccess: false, bytes: 4, stopped: null, complete: true, healthy: true,
  checks: [{path:'/',healthy:true,finding:'healthy',status:200,bytes:4}] };

test('builds a bounded immutable healthy report without proposals',()=>{
  const report=buildDiagnosticReport(base,metadata);
  assert.equal(report.schemaVersion,1);assert.equal(report.outcome.healthy,true);
  assert.deepEqual(report.proposals,[]);assert.equal(report.controls.automaticRemediationAllowed,false);
  assert.ok(Object.isFrozen(report));assert.ok(Object.isFrozen(report.observations));
});

test('deduplicates proposal types and never authorizes execution',()=>{
  const report=buildDiagnosticReport({...base,healthy:false,complete:false,stopped:'gateway_rejected',bytes:0,
    checks:[{path:'/',healthy:false,finding:'gateway_rejected'},
      {path:'/work',healthy:false,finding:'gateway_rejected'}]},metadata);
  assert.equal(report.proposals.length,1);
  assert.deepEqual(report.proposals[0],{
    id:'gateway_rejected:_2F',finding:'gateway_rejected',severity:'high',
    proposedAction:'review_gateway_denial',productionApprovalRequired:true,
    automaticRemediationAllowed:false,execution:'not_executed'});
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
