const FINDING_POLICY = Object.freeze({
  gateway_unavailable: ['high', 'inspect_gateway_availability'],
  gateway_rejected: ['high', 'review_gateway_denial'],
  invalid_gateway_result: ['high', 'inspect_gateway_contract'],
  cancelled_or_deadline: ['medium', 'review_monitor_timeout'],
  byte_limit: ['medium', 'review_response_size'],
  request_limit: ['info', 'review_route_scope'],
});

function validCheck(check) {
  if (!check || typeof check !== 'object' || typeof check.path !== 'string' ||
      !check.path.startsWith('/') || check.path.length > 1024 ||
      typeof check.healthy !== 'boolean' || typeof check.finding !== 'string') return false;
  if (check.healthy) return check.finding === 'healthy' && Number.isInteger(check.status) &&
    check.status >= 200 && check.status <= 299 && Number.isSafeInteger(check.bytes) && check.bytes >= 0;
  if (!Object.hasOwn(FINDING_POLICY, check.finding)) return false;
  if (check.finding !== 'byte_limit') return check.status === undefined && check.bytes === undefined;
  return Number.isInteger(check.status) && check.status >= 200 && check.status <= 299 &&
    Number.isSafeInteger(check.bytes) && check.bytes >= 0;
}

export function buildDiagnosticReport(monitor, { generatedAt, runId } = {}) {
  if (!monitor || typeof monitor !== 'object' || monitor.readOnly !== true ||
      monitor.remediationExecuted !== false || monitor.productionWrites !== false ||
      monitor.directNetworkAccess !== false || !Array.isArray(monitor.checks) ||
      monitor.checks.length > 14 || !monitor.checks.every(validCheck) ||
      !Number.isSafeInteger(monitor.bytes) || monitor.bytes < 0 ||
      typeof monitor.complete !== 'boolean' || typeof monitor.healthy !== 'boolean' ||
      (monitor.stopped !== null && !Object.hasOwn(FINDING_POLICY, monitor.stopped)) ||
      typeof generatedAt !== 'string' || !Number.isFinite(Date.parse(generatedAt)) ||
      typeof runId !== 'string' || !/^[0-9a-f-]{36}$/.test(runId))
    throw new Error('invalid_diagnostic_input');

  const observations = monitor.checks.map(check => Object.freeze({
    path: check.path,
    healthy: check.healthy,
    finding: check.finding,
    ...(check.healthy || check.finding === 'byte_limit' ? { status: check.status, bytes: check.bytes } : {}),
  }));
  const proposals = [];
  const seen = new Set();
  for (const check of observations) {
    if (check.healthy || seen.has(check.finding)) continue;
    seen.add(check.finding);
    const [severity, action] = FINDING_POLICY[check.finding];
    proposals.push(Object.freeze({
      id: `${check.finding}:${encodeURIComponent(check.path).replaceAll('%', '_')}`,
      finding: check.finding,
      severity,
      proposedAction: action,
      productionApprovalRequired: true,
      automaticRemediationAllowed: false,
      execution: 'not_executed',
    }));
  }
  if (monitor.stopped !== null && !seen.has(monitor.stopped)) {
    const [severity, action] = FINDING_POLICY[monitor.stopped];
    proposals.push(Object.freeze({
      id: `${monitor.stopped}:run`, finding: monitor.stopped, severity,
      proposedAction: action, productionApprovalRequired: true,
      automaticRemediationAllowed: false, execution: 'not_executed',
    }));
  }

  return Object.freeze({
    schemaVersion: 1,
    runId,
    generatedAt: new Date(generatedAt).toISOString(),
    scope: Object.freeze({ origin: 'https://www.elevate360official.com', routeCount: observations.length }),
    outcome: Object.freeze({ healthy: monitor.healthy, complete: monitor.complete,
      stopped: monitor.stopped, acceptedBodyBytes: monitor.bytes }),
    controls: Object.freeze({ readOnly: true, productionWrites: false,
      remediationExecuted: false, automaticRemediationAllowed: false,
      founderApprovalRequiredForProductionAction: true }),
    observations: Object.freeze(observations),
    proposals: Object.freeze(proposals),
  });
}
