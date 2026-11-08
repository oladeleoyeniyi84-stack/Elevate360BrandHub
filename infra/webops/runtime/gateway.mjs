import { createServer } from 'node:http';
import { openSync, writeSync, readSync, fstatSync, fsyncSync, closeSync, mkdirSync, rmdirSync, constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { assertApprovedGatewayTarget } from './generated/phase3GatewayPolicy.mjs';
import { assertPublicDnsResolution } from './generated/networkGuard.mjs';
import { pinnedHttpsGet } from './generated/pinnedHttpsTransport.mjs';

// Fixed first-pilot scope. No production credentials or configurable extra origins.
export const registry = Object.freeze({version: 1, origins: [{
  origin: 'https://www.elevate360official.com', enabled: true,
  approvedBy: 'founder', approvedAt: '2026-10-18T00:00:00Z',
}]});

export const MAX_AUDIT_BYTES = 16 * 1024 * 1024;
export function durableAudit(path, {maxBytes = MAX_AUDIT_BYTES} = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_AUDIT_BYTES)
    throw new Error('invalid_audit_limit');
  return event => {
    const record = Buffer.from(JSON.stringify({...event, timestamp: new Date().toISOString(), registryVersion: 1}) + '\n');
    if (record.length > 16384) throw new Error('audit_record_limit');
    const lock = path + '.lock';
    mkdirSync(lock, {mode: 0o700}); // Existing/crash locks require operator review.
    let fd;
    try {
      fd = openSync(path, constants.O_RDWR | constants.O_APPEND | constants.O_CREAT |
        constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
      const info = fstatSync(fd);
      if (!info.isFile() || info.nlink !== 1 || info.uid !== process.getuid() || (info.mode & 0o7777) !== 0o600)
        throw new Error('unsafe_audit_file');
      if (info.size + record.length > maxBytes) throw new Error('audit_capacity');
      if (info.size) {
        const last = Buffer.alloc(1);
        if (readSync(fd, last, 0, 1, info.size - 1) !== 1 || last[0] !== 10)
          throw new Error('audit_incomplete_record');
      }
      let offset = 0;
      while (offset < record.length) {
        const written = writeSync(fd, record, offset, record.length - offset);
        if (written <= 0) throw new Error('audit_write_failed');
        offset += written;
      }
      fsyncSync(fd);
    } finally {
      try { if (fd !== undefined) closeSync(fd); }
      finally { rmdirSync(lock); }
    }
  };
}

// Bound each asynchronous stage even if an adapter ignores its abort signal.
// The underlying pinned transport still owns socket cancellation.
function untilAborted(operation, signal, disposeLate = () => {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      callback(value);
    };
    const abort = () => finish(reject, new Error('deadline'));
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) { abort(); return; }
    Promise.resolve().then(() => {
      if (signal.aborted) throw new Error('deadline');
      return operation();
    }).then(value => {
      if (settled) {
        Promise.resolve().then(() => disposeLate(value)).catch(() => {});
      } else finish(resolve, value);
    }, error => finish(reject, error));
  });
}

function cancelWithoutWaiting(body) {
  // A broken stream's cancellation promise must not keep the gateway busy forever.
  Promise.resolve().then(() => body?.cancel()).catch(() => {});
}

export async function checkTarget(raw, { audit, resolve = assertPublicDnsResolution, transport = pinnedHttpsGet,
  maxBytes = 1048576, signal: callerSignal } = {}) {
  const requestId = randomUUID();
  const signal = callerSignal ? AbortSignal.any([callerSignal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000);
  let addresses = [];
  // Record no query strings, userinfo, response bodies, or arbitrary exception messages.
  let origin = 'invalid';
  try { origin = new URL(raw).origin; } catch {}
  let reason = 'target_rejected';
  try {
    audit({requestId, origin, decision: 'attempt'}); // audit failure blocks transport
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1048576 || signal.aborted)
      throw new Error('invalid_request_budget');
    let target = assertApprovedGatewayTarget(raw, registry);
    if (target.search || target.hash || raw.length > 2048) throw new Error('target_rejected');
    for (let hop = 0; hop <= 3; hop++) {
      reason = 'dns_rejected';
      addresses = await untilAborted(() => resolve(target.hostname), signal);
      if (signal.aborted) throw new Error('deadline');
      reason = 'transport_failed';
      const response = await untilAborted(() => transport(target.href, {
        method: 'GET', redirect: 'manual', signal,
        headers: { accept: 'text/html', 'user-agent': 'Elevate360-WebOps-Manual-Pilot/1' },
      }, addresses), signal, response => cancelWithoutWaiting(response.body));
      if ([301,302,303,307,308].includes(response.status)) {
        await untilAborted(() => response.body?.cancel(), signal);
        if (signal.aborted) throw new Error('deadline');
        reason = 'redirect_rejected';
        const location = response.headers.get('location');
        if (!location || hop === 3) throw new Error('redirect_rejected');
        target = assertApprovedGatewayTarget(new URL(location, target).href, registry);
        if (target.search || target.hash) throw new Error('redirect_rejected');
        continue;
      }
      reason = 'response_rejected';
      let bytes = 0;
      if (response.body) {
        const reader = response.body.getReader();
        try {
          while (true) {
            const next = await untilAborted(() => reader.read(), signal);
            if (next.done) break;
            bytes += next.value.byteLength;
            if (bytes > maxBytes) throw new Error('response_too_large');
          }
        } finally { cancelWithoutWaiting(reader); }
      }
      if (signal.aborted) throw new Error('deadline');
      if (!response.ok) throw new Error('response_rejected');
      audit({requestId, origin, addresses: addresses.map(r => r.address), decision: 'allow', status: response.status, bytes});
      return {ok: true, requestId, status: response.status, bytes};
    }
    throw new Error('redirect_rejected');
  } catch {
    audit({requestId, origin, decision: 'deny', reason});
    return {ok: false, requestId, reason};
  }
}

export function startGateway(audit, { check = checkTarget } = {}) {
  let busy = false;
  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.method !== 'GET' || !req.url.startsWith('/check?url=')) { res.writeHead(405).end('{}'); return; }
    if (busy) { res.writeHead(429).end('{}'); return; }
    busy = true;
    const controller = new AbortController();
    const disconnected = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', disconnected);
    try {
      const params = new URL(req.url, 'http://gateway').searchParams;
      const rawBudget = params.get('maxBytes');
      const maxBytes = rawBudget === null ? 1048576 : /^[1-9][0-9]{0,6}$/.test(rawBudget) ? Number(rawBudget) : NaN;
      if (params.getAll('url').length !== 1 || params.getAll('maxBytes').length > 1 ||
          [...params.keys()].some(k => !['url', 'maxBytes'].includes(k)) ||
          !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1048576) {
        res.writeHead(400).end('{"ok":false,"reason":"invalid_request_budget"}'); return;
      }
      const url = params.get('url');
      const result = await check(url, {audit, maxBytes, signal: controller.signal});
      res.writeHead(result.ok ? 200 : 403).end(JSON.stringify(result));
    } catch { res.writeHead(503).end('{"ok":false,"reason":"audit_unavailable"}'); }
    finally { res.removeListener('close', disconnected); busy = false; }
  });
  server.requestTimeout = 12000;
  server.headersTimeout = 5000;
  server.maxHeadersCount = 16;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = durableAudit('/audit/gateway.jsonl');
  audit({decision: 'startup'});
  const server = startGateway(audit);
  server.listen(8080, '172.30.0.2');
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}

