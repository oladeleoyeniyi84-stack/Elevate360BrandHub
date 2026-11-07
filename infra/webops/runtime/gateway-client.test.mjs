import test from 'node:test';
import assert from 'node:assert/strict';
import { gatewayCheck } from './gateway-client.mjs';

test('client uses fixed internal endpoint and sanitizes successful output',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(url,init)=>{
    assert.ok(url.startsWith('http://172.30.0.2:8080/check?url='));
    assert.equal(new URL(url).searchParams.get('maxBytes'),'8');
    assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');
    return Response.json({ok:true,status:200,bytes:8,secret:'excluded'});
  };
  try {assert.deepEqual(await gatewayCheck('https://www.elevate360official.com/',{maxBytes:8}),{ok:true,status:200,bytes:8});}
  finally {globalThis.fetch=original;}
});
test('client rejects malformed, oversized and over-budget replies',async()=>{
  const original=globalThis.fetch;
  try {
    for(const response of [()=>new Response('invalid'),()=>new Response('x'.repeat(4097)),
      ()=>Response.json({ok:true,status:200,bytes:9}),()=>Response.json({ok:true,status:500,bytes:1})]) {
      globalThis.fetch=async()=>response();await assert.rejects(gatewayCheck('x',{maxBytes:8}));
    }
    globalThis.fetch=async()=>Response.json({ok:false,reason:'secret'},{status:403});
    assert.deepEqual(await gatewayCheck('x'),{ok:false});
  } finally {globalThis.fetch=original;}
});
test('client passes cancellation and caps individual request budget',async()=>{
  const original=globalThis.fetch;const controller=new AbortController();
  globalThis.fetch=async(url,init)=>{
    assert.equal(new URL(url).searchParams.get('maxBytes'),'1048576');
    controller.abort();assert.equal(init.signal.aborted,true);throw Error('cancelled');
  };
  try {await assert.rejects(gatewayCheck('x',{signal:controller.signal,maxBytes:2097152}));}
  finally {globalThis.fetch=original;}
});
