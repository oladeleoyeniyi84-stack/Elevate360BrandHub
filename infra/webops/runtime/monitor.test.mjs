import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorRoutes } from './monitor.mjs';
const good = async () => ({ok:true,status:200,bytes:10});
test('checks sequentially through injected gateway and reports read-only guarantees', async () => {
  let active=0, peak=0;
  const r=await monitorRoutes({paths:['/','/work'],gateway:async (url, options)=>{
    peak=Math.max(peak,++active); assert.ok(url.startsWith('https://www.elevate360official.com/'));
    assert.ok(options.maxBytes>0); await Promise.resolve(); active--; return good();
  }});
  assert.equal(peak,1); assert.equal(r.healthy,true); assert.equal(r.bytes,20);
  assert.equal(r.remediationExecuted,false); assert.equal(r.productionWrites,false);
});
test('rejects unsafe, normalized, duplicate and excessive inputs before gateway calls', async()=>{
  for(const paths of [['//evil.test'],['/../admin'],['/a?secret=x'],['/a#x'],['/a\\b'],['/a\n'],['/','/'],Array(15).fill('/')]) {
    let calls=0; await assert.rejects(monitorRoutes({paths,gateway:()=>{calls++;}})); assert.equal(calls,0);
  }
});
test('request budget stops without making extra calls',async()=>{
  let calls=0; const r=await monitorRoutes({paths:['/','/work'],maxRequests:1,gateway:()=>{calls++;return good();}});
  assert.equal(calls,1);assert.equal(r.stopped,'request_limit');assert.equal(r.healthy,false);
});
test('byte budget is forwarded and rejects gateway overrun',async()=>{
  let calls=0;const r=await monitorRoutes({paths:['/','/work'],maxBytes:5,gateway:(_,o)=>{
    calls++;assert.equal(o.maxBytes,5);return good();
  }});assert.equal(calls,1);assert.equal(r.stopped,'byte_limit');
});
test('gateway errors fail closed without direct fallback or exception text',async()=>{
  const r=await monitorRoutes({paths:['/','/work'],gateway:()=>{throw Error('secret');}});
  assert.equal(r.stopped,'gateway_unavailable');assert.equal(r.checks.length,1);
  assert.ok(!JSON.stringify(r).includes('secret'));
});
test('deadline bounds a gateway that never settles',async()=>{
  const r=await monitorRoutes({paths:['/'],timeoutMs:5,gateway:()=>new Promise(()=>{})});
  assert.equal(r.stopped,'cancelled_or_deadline');
});
test('pre-cancellation makes no gateway request',async()=>{
  let calls=0;const r=await monitorRoutes({paths:['/'],signal:AbortSignal.abort(),gateway:()=>{calls++;}});
  assert.equal(calls,0);assert.equal(r.complete,false);
});
test('rejects malformed gateway responses and sanitizes denials',async()=>{
  for(const result of [null,{ok:true,status:200,bytes:-1},{ok:true,status:500,bytes:0}]) {
    const r=await monitorRoutes({paths:['/'],gateway:async()=>result});assert.equal(r.stopped,'invalid_gateway_result');
  }
  const r=await monitorRoutes({paths:['/'],gateway:async()=>({ok:false,reason:'secret'})});
  assert.equal(r.stopped,'gateway_rejected');assert.ok(!JSON.stringify(r).includes('secret'));
});
