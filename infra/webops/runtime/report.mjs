const FINDING_POLICY = Object.freeze({
  gateway_unavailable: ['high', 'inspect_gateway_availability'],
  gateway_rejected: ['high', 'review_gateway_denial'],
  invalid_gateway_result: ['high', 'inspect_gateway_contract'],
  cancelled_or_deadline: ['medium', 'review_monitor_timeout'],
  byte_limit: ['medium', 'review_response_size'],
  request_limit: ['info', 'review_route_scope'],
});

function validPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') ||
      path.includes('\\') || /[\x00-\x20\x7f?#]/.test(path) || path.length > 1024) return false;
  try {
    const url = new URL(path, 'https://www.elevate360official.com');
    return url.origin === 'https://www.elevate360official.com' && url.pathname === path;
  } catch { return false; }
}

function validCheck(check) {
  if (!check || typeof check !== 'object' || typeof check.path !== 'string' ||
      !validPath(check.path) ||
      typeof check.healthy !== 'boolean' || typeof check.finding !== 'string') return false;
  if (check.healthy) return check.finding === 'healthy' && Number.isInteger(check.status) &&
    check.status >= 200 && check.status <= 299 && Number.isSafeInteger(check.bytes) && check.bytes >= 0;
  if (!Object.hasOwn(FINDING_POLICY, check.finding) || check.finding === 'request_limit') return false;
  if (check.finding !== 'byte_limit') return check.status === undefined && check.bytes === undefined;
  return Number.isInteger(check.status) && check.status >= 200 && check.status <= 299 &&
    Number.isSafeInteger(check.bytes) && check.bytes >= 0;
}

function consistentOutcome(monitor) {
  const { checks, bytes, stopped, healthy, complete } = monitor;
  if (new Set(checks.map(check => check.path)).size !== checks.length) return false;
  const total = checks.reduce((sum, check) => sum + (check.bytes ?? 0), 0);
  if (!Number.isSafeInteger(total) || total !== bytes) return false;
  const failures = checks.filter(check => !check.healthy);
  // The sequential monitor terminates at its first failed observation.
  if (failures.length > 1 || (failures.length === 1 &&
      (checks.at(-1) !== failures[0] || stopped !== failures[0].finding))) return false;
  if (stopped === null) return checks.length > 0 && failures.length === 0 && healthy && complete;
  if (healthy || complete) return false;
  if (failures.length === 1) return true;
  // Only cancellation and exhausted budgets can stop between requests.
  return stopped === 'cancelled_or_deadline' ||
    (stopped === 'request_limit' && checks.length > 0) ||
    (stopped === 'byte_limit' && checks.length > 0 && bytes > 0);
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
      typeof runId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(runId) ||
      !consistentOutcome(monitor))
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
