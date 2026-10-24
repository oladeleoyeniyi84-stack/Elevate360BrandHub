// Only this fixed internal endpoint is reachable through the monitoring client.
export async function gatewayCheck(target, { signal, maxBytes = 1048576 } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 2097152)
    throw new Error('invalid_gateway_budget');
  const budget = Math.min(maxBytes, 1048576);
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000);
  const response = await fetch('http://172.30.0.2:8080/check?url=' + encodeURIComponent(target) + '&maxBytes=' + budget,
    { signal: requestSignal, redirect: 'error', credentials: 'omit' });
  const reader = response.body?.getReader();
  if (!reader) throw new Error('invalid_gateway_result');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) throw new Error('invalid_gateway_result');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (result?.ok === true && response.ok && Number.isInteger(result.status) &&
      result.status >= 200 && result.status <= 299 && Number.isSafeInteger(result.bytes) &&
      result.bytes >= 0 && result.bytes <= budget)
    return {ok: true, status: result.status, bytes: result.bytes};
  if (result?.ok === false && !response.ok) return {ok: false};
  throw new Error('invalid_gateway_result');
}
