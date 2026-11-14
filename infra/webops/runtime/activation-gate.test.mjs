import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateActivation, REQUIRED_APPROVALS, REQUIRED_EVIDENCE } from './activation-gate.mjs';

const recordedAt = '2026-10-23T00:00:00Z';
const reference = name => ({decision:'passed',reference:`evidence/${name}.json`,recordedAt});
const approval = name => ({decision:'approved',reference:`approval/${name}`,recordedAt});
const safeControls = {
  origin:'https://www.elevate360official.com',mode:'read_only_monitoring',
  cadenceMinutes:1440,maxRoutesPerRun:14,maxAcceptedBodyBytesPerRun:2097152,maxRunSeconds:30,
  productionWritesAllowed:false,automaticRemediationAllowed:false,
  productionCredentialsRequired:false,additionalPaidResourcesAllowed:false,
  monthlyAdditionalSpendCeilingUsd:0,killSwitch:'disable_schedule_and_stop_runtime',
};
const complete = {
  schemaVersion:1,controls:safeControls,
  evidence:Object.fromEntries(REQUIRED_EVIDENCE.map(name=>[name,reference(name)])),
  approvals:Object.fromEntries(REQUIRED_APPROVALS.map(name=>[name,approval(name)])),
};

test('complete reference checklist never authenticates evidence or authorizes activation',()=>{
  const result=evaluateActivation(complete);
  assert.equal(result.checklistComplete,true);
  assert.equal(result.authorizationVerified,false);
  assert.equal(result.evidenceVerified,false);
  assert.equal(result.readyForManualActivation,false);
  assert.deepEqual(result.blockers,['independent_release_verification_required']);
  assert.equal(result.activationPerformed,false);
  assert.equal(result.schedulerChanged,false);
  assert.equal(result.productionWritesPerformed,false);
  assert.equal(result.remediationPerformed,false);
  assert.ok(Object.isFrozen(result.blockers));
});

test('missing evidence and approvals produce explicit blockers',()=>{
  const result=evaluateActivation({schemaVersion:1,controls:safeControls,evidence:{},approvals:{}});
  assert.equal(result.readyForManualActivation,false);
  assert.equal(result.checklistComplete,false);
  assert.equal(result.blockers.length,REQUIRED_EVIDENCE.length+REQUIRED_APPROVALS.length+1);
  assert.ok(result.blockers.includes('evidence_missing:cloud_firewall_snapshot'));
  assert.ok(result.blockers.includes('approval_missing:read_only_schedule'));
});

test('development reference cannot activate even when every approval field is populated',()=>{
  const input=structuredClone(complete);
  input.approvals.read_only_schedule={decision:'approved',reference:'daily-development-task',recordedAt};
  const result=evaluateActivation(input);
  assert.equal(result.readyForManualActivation,false);
  assert.equal(result.checklistComplete,true);
  assert.equal(result.authorizationVerified,false);
  assert.ok(result.blockers.includes('independent_release_verification_required'));
});

test('caller supplied verification and readiness flags cannot bypass verification',()=>{
  const input=structuredClone(complete);
  Object.assign(input,{authorizationVerified:true,evidenceVerified:true,readyForManualActivation:true});
  for(const record of Object.values(input.approvals)) record.verified=true;
  const result=evaluateActivation(input);
  assert.equal(result.readyForManualActivation,false);
  assert.equal(result.authorizationVerified,false);
  assert.equal(result.evidenceVerified,false);
});

test('unsafe control expansion fails closed',()=>{
  for(const patch of [
    {origin:'https://example.com'},{mode:'automatic_remediation'},{cadenceMinutes:5},
    {maxRoutesPerRun:15},{maxAcceptedBodyBytesPerRun:2097153},{maxRunSeconds:31},
    {productionWritesAllowed:true},{automaticRemediationAllowed:true},
    {productionCredentialsRequired:true},{additionalPaidResourcesAllowed:true},
    {monthlyAdditionalSpendCeilingUsd:1},{killSwitch:'none'},
  ]) {
    const result=evaluateActivation({...complete,controls:{...safeControls,...patch}});
    assert.equal(result.readyForManualActivation,false);
    assert.ok(result.blockers.includes('controls_invalid_or_unsafe'));
  }
});

test('unverified or malformed records are never treated as passed',()=>{
  const input=structuredClone(complete);
  input.evidence.host_reboot_persistence.decision='claimed';
  input.approvals.merge_to_main.reference='bad ref with spaces';
  const result=evaluateActivation(input);
  assert.ok(result.blockers.includes('evidence_missing:host_reboot_persistence'));
  assert.ok(result.blockers.includes('approval_missing:merge_to_main'));
});

test('invalid top-level manifests throw a fixed error',()=>{
  for(const value of [null,{},[],{schemaVersion:2}])
    assert.throws(()=>evaluateActivation(value),/invalid_activation_manifest/);
});

test('checked-in activation candidate remains blocked by default',()=>{
  const candidate=JSON.parse(readFileSync(new URL('./activation-candidate.json',import.meta.url),'utf8'));
  const result=evaluateActivation(candidate);
  assert.equal(result.readyForManualActivation,false);
  assert.ok(result.blockers.includes('controls_invalid_or_unsafe'));
  assert.ok(result.blockers.includes('approval_missing:read_only_schedule'));
});
