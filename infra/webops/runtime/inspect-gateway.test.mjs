import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGateway} from './inspect-gateway.mjs';
function fixture(){
 const options={gatewayId:'a'.repeat(64),imageId:'sha256:'+'b'.repeat(64),internalNetworkId:'c'.repeat(64),egressNetworkId:'d'.repeat(64)};
 const gateway={id:options.gatewayId,name:'/webops-egress-gateway',image:options.imageId,running:true,paused:false,
 config:{User:'1000:1000',Cmd:['node','/app/gateway.mjs']},
 host:{ReadonlyRootfs:true,Privileged:false,CapDrop:['ALL'],CapAdd:null,SecurityOpt:['no-new-privileges:true'],
 PortBindings:{},RestartPolicy:{Name:'no'},Memory:201326592,NanoCpus:500000000,PidsLimit:64,Dns:['1.1.1.1','1.0.0.1']},
 mounts:[{Type:'bind',Source:'/var/lib/elevate360-webops/audit',Destination:'/audit',RW:true}],
 networks:{internal:{NetworkID:options.internalNetworkId,IPAddress:'172.30.0.2'},egress:{NetworkID:options.egressNetworkId}}};
 const calls=[];
 const docker=async args=>{calls.push(args);return {code:0,stdout:Buffer.from(JSON.stringify(gateway)),stderr:Buffer.alloc(0)};};
 return {options,gateway,calls,docker};
}
test('gateway release inspection reads exact ID only and does not certify live evidence',async()=>{
 const f=fixture(),r=await inspectGateway(f.options,{docker:f.docker});
 assert.equal(r.gatewayConfigurationVerified,true);assert.equal(r.auditPersistenceVerified,false);
 assert.equal(r.firewallVerified,false);assert.equal(r.requestExecuted,false);assert.equal(r.activated,false);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],'inspect');assert.equal(f.calls[0].at(-1),f.options.gatewayId);
});
test('gateway identity isolation mount DNS and network drift fail closed',async()=>{
 const mutations=[g=>g.image='other',g=>g.running=false,g=>g.paused=true,g=>g.config.User='root',
 g=>g.config.Cmd=['sh'],g=>g.host.Privileged=true,g=>g.host.ReadonlyRootfs=false,g=>g.host.CapDrop=[],
 g=>g.host.CapAdd=['NET_ADMIN'],g=>g.host.SecurityOpt=[],g=>g.host.PortBindings={port:[]},
 g=>g.host.RestartPolicy.Name='always',g=>g.host.Memory=0,g=>g.host.NanoCpus=0,g=>g.host.PidsLimit=-1,
 g=>g.host.Dns=['127.0.0.1'],g=>g.mounts=[],g=>g.mounts[0].Source='/etc',g=>g.mounts[0].RW=false,
 g=>g.networks.internal.IPAddress='172.30.0.4',g=>g.networks.egress.NetworkID='e'.repeat(64),
 g=>g.networks.extra={NetworkID:'f'.repeat(64)}];
 for(const mutate of mutations){const f=fixture();mutate(f.gateway);await assert.rejects(inspectGateway(f.options,{docker:f.docker}));assert.equal(f.calls.length,1);}
});
test('invalid expected IDs and failed or malformed Docker observations are rejected',async()=>{
 const f=fixture();await assert.rejects(inspectGateway({...f.options,gatewayId:'gateway'},{docker:f.docker}));assert.equal(f.calls.length,0);
 for(const result of [{code:1,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)},
 {code:0,stdout:Buffer.from('not JSON'),stderr:Buffer.alloc(0)},
 {code:0,stdout:Buffer.alloc(65537),stderr:Buffer.alloc(0)}])
 await assert.rejects(inspectGateway(f.options,{docker:async()=>result}));
});
