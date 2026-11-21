import test from 'node:test';
import assert from 'node:assert/strict';
import { startGateway, checkTarget } from './gateway.mjs';
import { monitorRoutes } from './monitor.mjs';
import { gatewayCheck } from './gateway-client.mjs';

test('monitor client and HTTP gateway enforce remaining body budget end to end', async()=>{
  const budgets=[], events=[];
  const server=startGateway(e=>events.push(e),{check:(url,options)=>{
    budgets.push(options.maxBytes);
    return checkTarget(url,{...options,resolve:async()=>[{address:'1.1.1.1',family:4}],
      transport:async()=>new Response('1234')});
  }});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const original=globalThis.fetch;
  globalThis.fetch=(url,init)=>{
    const internal=new URL(url);
    assert.equal(internal.origin,'http://172.30.0.2:8080');
    return original('http://127.0.0.1:'+server.address().port+internal.pathname+internal.search,init);
  };
  try {
    const result=await monitorRoutes({paths:['/','/work','/apps/bondedlove'],maxBytes:6,gateway:gatewayCheck});
    assert.deepEqual(budgets,[6,2]);assert.equal(result.healthy,false);
    assert.equal(result.stopped,'gateway_rejected');assert.equal(result.bytes,4);
    assert.deepEqual(events.filter(e=>e.decision!=='attempt').map(e=>e.decision),['allow','deny']);
  } finally {globalThis.fetch=original;await new Promise(resolve=>server.close(resolve));}
});
