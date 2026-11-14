// Manual, diagnose-only orchestration. The injected gateway owns all networking.
export const APPROVED_ORIGIN = 'https://www.elevate360official.com';

export async function monitorRoutes({ paths, gateway, signal, maxRequests = 14,
  maxBytes = 2 * 1024 * 1024, timeoutMs = 30000 } = {}) {
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 14 ||
      typeof gateway !== 'function' || !Number.isInteger(maxRequests) ||
      maxRequests < 1 || maxRequests > 14 || !Number.isSafeInteger(maxBytes) ||
      maxBytes < 1 || maxBytes > 2 * 1024 * 1024 || !Number.isInteger(timeoutMs) ||
      timeoutMs < 1 || timeoutMs > 30000) throw new Error('invalid_monitor_configuration');
  const targets = paths.map(path => {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') ||
        path.includes('\\') || /[\x00-\x20\x7f?#]/.test(path) || path.length > 1024)
      throw new Error('invalid_monitor_path');
    const url = new URL(path, APPROVED_ORIGIN);
    if (url.origin !== APPROVED_ORIGIN || url.pathname !== path)
      throw new Error('invalid_monitor_path');
    return url.href;
  });
  if (new Set(targets).size !== targets.length) throw new Error('duplicate_monitor_path');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  let onAbort;
  const cancelled = new Promise((_, reject) => {
    onAbort = () => reject(new Error('monitor_cancelled'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  // A pre-aborted run does not enter Promise.race; keep cancellation handled.
  cancelled.catch(() => {});
  const checks = [];
  let bytes = 0, stopped = null;
  try {
    for (const target of targets) {
      if (controller.signal.aborted) { stopped = 'cancelled_or_deadline'; break; }
      if (checks.length >= maxRequests) { stopped = 'request_limit'; break; }
      if (bytes >= maxBytes) { stopped = 'byte_limit'; break; }
      let result;
      try {
        result = await Promise.race([
          Promise.resolve().then(() => gateway(target, {
            signal: controller.signal, maxBytes: maxBytes - bytes,
          })), cancelled,
        ]);
      } catch {
        checks.push({ path: new URL(target).pathname, healthy: false,
          finding: controller.signal.aborted ? 'cancelled_or_deadline' : 'gateway_unavailable' });
        stopped = controller.signal.aborted ? 'cancelled_or_deadline' : 'gateway_unavailable';
        break;
      }
      if (!result || typeof result.ok !== 'boolean' ||
          (result.ok && (!Number.isInteger(result.status) || result.status < 200 ||
            result.status > 299 || !Number.isSafeInteger(result.bytes) || result.bytes < 0))) {
        checks.push({ path: new URL(target).pathname, healthy: false, finding: 'invalid_gateway_result' });
        stopped = 'invalid_gateway_result'; break;
      }
      if (result.ok) bytes += result.bytes;
      checks.push({ path: new URL(target).pathname, healthy: result.ok && bytes <= maxBytes,
        finding: bytes > maxBytes ? 'byte_limit' : result.ok ? 'healthy' : 'gateway_rejected',
        ...(result.ok ? { status: result.status, bytes: result.bytes } : {}) });
      if (bytes > maxBytes) { stopped = 'byte_limit'; break; }
      if (!result.ok) { stopped = 'gateway_rejected'; break; }
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', onAbort);
    controller.abort();
  }
  return { readOnly: true, remediationExecuted: false, productionWrites: false,
    directNetworkAccess: false, checks, bytes, stopped,
    complete: checks.length === targets.length && stopped === null,
    healthy: stopped === null && checks.length === targets.length && checks.every(c => c.healthy) };
}
