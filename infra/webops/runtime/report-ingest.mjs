import { isDeepStrictEqual } from 'node:util';
import { TextDecoder } from 'node:util';
import { buildDiagnosticReport } from './report.mjs';
import { storeDiagnosticReport } from './report-store.mjs';

export const MAX_INPUT_BYTES = 65536;

export function decodeWorkerReport(input) {
  try {
    if (!Buffer.isBuffer(input) || input.length === 0 || input.length > MAX_INPUT_BYTES)
      throw new Error();
    const report = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(input));
    const monitor = {
      readOnly: report.controls.readOnly,
      productionWrites: report.controls.productionWrites,
      remediationExecuted: report.controls.remediationExecuted,
      directNetworkAccess: false,
      checks: report.observations,
      bytes: report.outcome.acceptedBodyBytes,
      stopped: report.outcome.stopped,
      healthy: report.outcome.healthy,
      complete: report.outcome.complete,
    };
    const metadata = {runId: report.runId, generatedAt: report.generatedAt};
    // Compare the entire reconstructed envelope, including origin, proposals,
    // safety controls and schema. Do not trust or copy extra worker fields.
    const canonical = buildDiagnosticReport(monitor, metadata);
    if (!isDeepStrictEqual(report, canonical)) throw new Error();
    return {monitor, metadata};
  } catch { throw new Error('invalid_worker_report'); }
}

export function ingestWorkerReport(input, options) {
  const {monitor, metadata} = decodeWorkerReport(input);
  const receipt = storeDiagnosticReport(monitor, metadata, options);
  return Object.freeze({...receipt, healthy: monitor.healthy, exitCode: monitor.healthy ? 0 : 1});
}

export function readWorkerReport(stream, {timeoutMs = 45000} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 45000)
    return Promise.reject(new Error('invalid_ingest_timeout'));
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [], done = false;
    const cleanup = () => {
      clearTimeout(timer);
      stream.removeListener('data', onData);
      stream.removeListener('end', onEnd);
      stream.removeListener('error', onError);
      stream.removeListener('close', onClose);
    };
    const fail = () => {
      if (done) return;
      done = true; cleanup(); chunks = [];
      stream.destroy();
      reject(new Error('worker_report_input_failed'));
    };
    const onData = chunk => {
      if (!Buffer.isBuffer(chunk) || (size += chunk.length) > MAX_INPUT_BYTES) { fail(); return; }
      chunks.push(chunk);
    };
    const onEnd = () => {
      if (done) return;
      done = true; cleanup();
      resolve(Buffer.concat(chunks, size));
      chunks = [];
    };
    const onError = () => fail();
    const onClose = () => { if (!done) fail(); };
    const timer = setTimeout(fail, timeoutMs);
    stream.on('data', onData);
    stream.once('end', onEnd);
    stream.once('error', onError);
    stream.once('close', onClose);
    if (stream.destroyed || stream.readableEnded) fail();
  });
}
