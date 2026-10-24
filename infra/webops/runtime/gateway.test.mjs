import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkTarget, durableAudit, startGateway } from './gateway.mjs';
import { assertPublicDnsResolution } from './generated/networkGuard.mjs';
const approved = 'https://www.elevate360official.com/';
const publicRecords = [{address:'1.1.1.1',family:4}];
function fixture(transport = async () => new Response('ok')) {
  const events = [];
  let calls = 0;
  return {events, get calls() {return calls;}, options: {
    audit: e => events.push(e), resolve: async () => publicRecords,
    transport: async (...args) => {calls++; return transport(...args);},
  }};
}
test('bounded approved GET uses vetted DNS records and audits success', async () => {
  const f = fixture(async (url, init, records) => {
    assert.equal(url, approved); assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'manual'); assert.deepEqual(records, publicRecords);
    assert.deepEqual(Object.keys(init.headers).sort(), ['accept','user-agent']);
    return new Response('ok');
  });
  assert.equal((await checkTarget(approved, f.options)).ok, true);
  assert.equal(f.events.at(-1).decision, 'allow');
});
test('unsafe and unapproved targets never reach transport', async () => {
  for (const url of ['http://169.254.169.254/', 'https://127.0.0.1/', 'https://10.0.0.1/',
    'https://example.com/', 'https://user:secret@www.elevate360official.com/',
    approved+'?token=secret', approved+'#fragment', 'invalid']) {
    const f = fixture();
    assert.equal((await checkTarget(url, f.options)).ok, false);
    assert.equal(f.calls, 0); assert.equal(f.events.at(-1).decision, 'deny');
    assert.equal(JSON.stringify(f.events).includes('secret'), false);
  }
});
test('mixed public and private DNS answers fail before transport', async () => {
  const f = fixture();
  f.options.resolve = host => assertPublicDnsResolution(host, async () => [...publicRecords,{address:'10.0.0.1',family:4}]);
  assert.equal((await checkTarget(approved, f.options)).ok, false);
  assert.equal(f.calls,0);
});
test('redirect to an unsafe origin is rejected without a second request', async () => {
  const f = fixture(async () => new Response(null,{status:302,headers:{location:'https://127.0.0.1/'}}));
  assert.equal((await checkTarget(approved, f.options)).ok,false); assert.equal(f.calls,1);
});
test('same-origin redirect gets fresh DNS validation and has a hop limit', async () => {
  const f = fixture(async () => new Response(null,{status:302,headers:{location:'/next'}}));
  let resolutions = 0; f.options.resolve = async () => {resolutions++; return publicRecords;};
  assert.equal((await checkTarget(approved,f.options)).ok,false);
  assert.equal(f.calls,4); assert.equal(resolutions,4);
});
test('oversized and non-success responses are rejected', async () => {
  for (const response of [() => new Response(new Uint8Array(1048577)), () => new Response('',{status:500})]) {
    const f = fixture(async () => response());
    assert.equal((await checkTarget(approved,f.options)).ok,false);
    assert.equal(f.events.at(-1).decision,'deny');
  }
});
test('audit outage fails closed before networking', async () => {
  const f = fixture(); f.options.audit = () => {throw new Error('disk failed');};
  await assert.rejects(checkTarget(approved,f.options)); assert.equal(f.calls,0);
});
test('audit appends survive reopening and contain timestamps', () => {
  const dir = mkdtempSync(join(tmpdir(),'webops-audit-'));
  try {
    const path = join(dir,'gateway.jsonl');
    durableAudit(path)({decision:'allow'}); durableAudit(path)({decision:'deny'});
    const events = readFileSync(path,'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(events.map(e => e.decision),['allow','deny']);
    assert.ok(events.every(e => Number.isFinite(Date.parse(e.timestamp))));
  } finally {rmSync(dir,{recursive:true});}
});
test('request byte budget rejects excess body and accepts an exact fit', async () => {
  for (const [body, ok] of [['1234', true], ['12345', false]]) {
    const f = fixture(async () => new Response(body));
    assert.equal((await checkTarget(approved, {...f.options,maxBytes:4})).ok,ok);
    assert.equal(f.events.at(-1).decision,ok?'allow':'deny');
  }
});
test('invalid budgets and pre-cancellation never reach transport', async () => {
  for (const maxBytes of [0,-1,1.5,1048577,NaN]) {
    const f=fixture();assert.equal((await checkTarget(approved,{...f.options,maxBytes})).ok,false);
    assert.equal(f.calls,0);
  }
  const f=fixture();assert.equal((await checkTarget(approved,{...f.options,signal:AbortSignal.abort()})).ok,false);
  assert.equal(f.calls,0);
});
test('HTTP endpoint validates and forwards the request budget', async () => {
  const seen=[];
  const server=startGateway(()=>{}, {check:async (url,options)=>{
    seen.push(options.maxBytes); return {ok:true,status:200,bytes:2};
  }});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const endpoint='http://127.0.0.1:'+server.address().port+'/check?url='+encodeURIComponent(approved);
  try {
    assert.equal((await fetch(endpoint+'&maxBytes=4')).status,200);
    for(const suffix of ['&maxBytes=0','&maxBytes=1.5','&maxBytes=1048577','&maxBytes=4&maxBytes=5','&unknown=x'])
      assert.equal((await fetch(endpoint+suffix)).status,400);
    assert.deepEqual(seen,[4]);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

