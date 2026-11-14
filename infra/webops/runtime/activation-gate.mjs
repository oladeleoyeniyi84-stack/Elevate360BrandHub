export const REQUIRED_EVIDENCE = Object.freeze([
  'source_reconciliation',
  'candidate_image',
  'revised_live_validation',
  'cloud_firewall_snapshot',
  'host_reboot_persistence',
  'audit_retention',
  'rollback_procedure',
]);

export const REQUIRED_APPROVALS = Object.freeze([
  'merge_to_main',
  'production_deployment',
  'read_only_schedule',
]);

function validReference(record, decision) {
  return record && typeof record === 'object' && record.decision === decision &&
    typeof record.reference === 'string' && record.reference.length >= 8 &&
    record.reference.length <= 256 && /^[\x21-\x7e]+$/.test(record.reference) &&
    typeof record.recordedAt === 'string' && Number.isFinite(Date.parse(record.recordedAt));
}

function validateControls(controls) {
  return controls && typeof controls === 'object' &&
    controls.origin === 'https://www.elevate360official.com' &&
    controls.mode === 'read_only_monitoring' &&
    Number.isInteger(controls.cadenceMinutes) && controls.cadenceMinutes >= 60 &&
    controls.cadenceMinutes <= 10080 &&
    Number.isInteger(controls.maxRoutesPerRun) && controls.maxRoutesPerRun >= 1 &&
    controls.maxRoutesPerRun <= 14 &&
    Number.isSafeInteger(controls.maxAcceptedBodyBytesPerRun) &&
    controls.maxAcceptedBodyBytesPerRun >= 1 &&
    controls.maxAcceptedBodyBytesPerRun <= 2 * 1024 * 1024 &&
    Number.isInteger(controls.maxRunSeconds) && controls.maxRunSeconds >= 1 &&
    controls.maxRunSeconds <= 30 &&
    controls.productionWritesAllowed === false &&
    controls.automaticRemediationAllowed === false &&
    controls.productionCredentialsRequired === false &&
    controls.additionalPaidResourcesAllowed === false &&
    controls.monthlyAdditionalSpendCeilingUsd === 0 &&
    controls.killSwitch === 'disable_schedule_and_stop_runtime';
}

export function evaluateActivation(manifest) {
  if (!manifest || typeof manifest !== 'object' || manifest.schemaVersion !== 1)
    throw new Error('invalid_activation_manifest');

  const blockers = [];
  if (!validateControls(manifest.controls)) blockers.push('controls_invalid_or_unsafe');

  const evidence = manifest.evidence;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    blockers.push(...REQUIRED_EVIDENCE.map(name => `evidence_missing:${name}`));
  } else {
    for (const name of REQUIRED_EVIDENCE) {
      if (!validReference(evidence[name], 'passed'))
        blockers.push(`evidence_missing:${name}`);
    }
  }

  const approvals = manifest.approvals;
  if (!approvals || typeof approvals !== 'object' || Array.isArray(approvals)) {
    blockers.push(...REQUIRED_APPROVALS.map(name => `approval_missing:${name}`));
  } else {
    for (const name of REQUIRED_APPROVALS) {
      if (!validReference(approvals[name], 'approved'))
        blockers.push(`approval_missing:${name}`);
    }
  }

  // Reference strings are untrusted claims. This pure checklist cannot verify
  // provenance, revocation, freshness, or binding to the deployed release.
  const checklistComplete = blockers.length === 0;
  blockers.push('independent_release_verification_required');
  return Object.freeze({
    schemaVersion: 1,
    checklistComplete,
    authorizationVerified: false,
    evidenceVerified: false,
    readyForManualActivation: false,
    activationPerformed: false,
    schedulerChanged: false,
    productionWritesPerformed: false,
    remediationPerformed: false,
    blockers: Object.freeze(blockers),
  });
}
