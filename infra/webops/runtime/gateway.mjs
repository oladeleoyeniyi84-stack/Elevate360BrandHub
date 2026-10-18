import { createServer } from 'node:http';
import { openSync, writeSync, fsyncSync, closeSync } from 'node:fs';
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

export function durableAudit(path) {
  return event => {
    const fd = openSync(path, 'a', 0o600);
    try {
      writeSync(fd, JSON.stringify({...event, timestamp: new Date().toISOString(), registryVersion: 1}) + '\n');
      fsyncSync(fd);
    } finally { closeSync(fd); }
  };
}

export async function checkTarget(raw, { audit, resolve = assertPublicDnsResolution, transport = pinnedHttpsGet } = {}) {
  const requestId = randomUUID();
  const signal = AbortSignal.timeout(10000);
  let addresses = [];
  // Record no query strings, userinfo, response bodies, or arbitrary exception messages.
  let origin = 'invalid';
  try { origin = new URL(raw).origin; } catch {}
  let reason = 'target_rejected';
  try {
    audit({requestId, origin, decision: 'attempt'}); // audit failure blocks transport
    let target = assertApprovedGatewayTarget(raw, registry);
    if (target.search || target.hash || raw.length > 2048) throw new Error('target_rejected');
    for (let hop = 0; hop <= 3; hop++) {
      reason = 'dns_rejected';
      addresses = await Promise.race([resolve(target.hostname), new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('deadline')), {once: true});
      })]);
      if (signal.aborted) throw new Error('deadline');
      reason = 'transport_failed';
      const response = await transport(target.href, {
        method: 'GET', redirect: 'manual', signal,
        headers: { accept: 'text/html', 'user-agent': 'Elevate360-WebOps-Manual-Pilot/1' },
      }, addresses);
      if ([301,302,303,307,308].includes(response.status)) {
        await response.body?.cancel();
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
            const next = await reader.read();
            if (next.done) break;
            bytes += next.value.byteLength;
            if (bytes > 1048576) throw new Error('response_too_large');
          }
        } finally { await reader.cancel().catch(() => {}); }
      }
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

export function startGateway(audit) {
  let busy = false;
  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.method !== 'GET' || !req.url.startsWith('/check?url=')) { res.writeHead(405).end('{}'); return; }
    if (busy) { res.writeHead(429).end('{}'); return; }
    busy = true;
    try {
      const url = new URL(req.url, 'http://gateway').searchParams.get('url');
      const result = await checkTarget(url, {audit});
      res.writeHead(result.ok ? 200 : 403).end(JSON.stringify(result));
    } catch { res.writeHead(503).end('{"ok":false,"reason":"audit_unavailable"}'); }
    finally { busy = false; }
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
