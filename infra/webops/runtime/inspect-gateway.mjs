import {pathToFileURL} from 'node:url';
import {localDocker,HOST_COMMAND_TIMEOUTS} from './host-runner.mjs';

const hostFields=['ReadonlyRootfs','Privileged','CapDrop','CapAdd','SecurityOpt','PortBindings',
  'RestartPolicy','Memory','NanoCpus','PidsLimit','Dns','PidMode','IpcMode','PublishAllPorts'];
const projection='{ "id":{{json .Id}},"name":{{json .Name}},"image":{{json .Image}},'+
 '"running":{{json .State.Running}},"paused":{{json .State.Paused}},'+
 '"config":{"User":{{json .Config.User}},"Cmd":{{json .Config.Cmd}}},"host":{'+
 hostFields.map(key=>'"'+key+'":{{json .HostConfig.'+key+'}}').join(',')+'},'+
 '"mounts":{{json .Mounts}},"networks":{{json .NetworkSettings.Networks}}}';

export async function inspectGateway({gatewayId,imageId,internalNetworkId,egressNetworkId}, {docker=localDocker}={}) {
  if(![gatewayId,internalNetworkId,egressNetworkId].every(x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x)) ||
    typeof imageId!=='string' || !/^sha256:[a-f0-9]{64}$/.test(imageId) || internalNetworkId===egressNetworkId)
    throw Error('invalid_gateway_inspection');
  const r=await docker(['inspect','--format',projection,gatewayId],HOST_COMMAND_TIMEOUTS.inspectionMs);
  if(r.code!==0 || !Buffer.isBuffer(r.stdout) || r.stdout.length>65536 || r.stderr.length) throw Error('gateway_inspection_failed');
  const g=JSON.parse(r.stdout.toString('utf8')),h=g.host,c=g.config;
  const networks=Object.values(g.networks??{}),mount=g.mounts?.[0];
  const internal=networks.find(n=>n.NetworkID===internalNetworkId);
  if(g.id!==gatewayId || g.name!=='/webops-egress-gateway' || g.image!==imageId || g.running!==true || g.paused!==false ||
    c?.User!=='1000:1000' || JSON.stringify(c.Cmd)!=='["node","/app/gateway.mjs"]' ||
    h?.ReadonlyRootfs!==true || h.Privileged!==false || JSON.stringify(h.CapDrop)!=='["ALL"]' ||
    (h.CapAdd?.length??0)!==0 || JSON.stringify(h.SecurityOpt)!=='["no-new-privileges:true"]' ||
    h.PidMode!=='' || h.IpcMode!=='private' || h.PublishAllPorts!==false ||
    Object.keys(h.PortBindings??{}).length!==0 || h.RestartPolicy?.Name!=='no' ||
    !Number.isInteger(h.Memory) || h.Memory<1 || h.Memory>201326592 ||
    !Number.isInteger(h.NanoCpus) || h.NanoCpus<1 || h.NanoCpus>500000000 ||
    !Number.isInteger(h.PidsLimit) || h.PidsLimit<1 || h.PidsLimit>64 ||
    JSON.stringify(h.Dns)!=='["1.1.1.1","1.0.0.1"]' ||
    !Array.isArray(g.mounts) || g.mounts.length!==1 || mount.Type!=='bind' ||
    mount.Source!=='/var/lib/elevate360-webops/audit' || mount.Destination!=='/audit' || mount.RW!==true ||
    networks.length!==2 || internal?.IPAddress!=='172.30.0.2' || !networks.some(n=>n.NetworkID===egressNetworkId))
    throw Error('gateway_identity_or_configuration_mismatch');
  return {gatewayConfigurationVerified:true,gatewayId,imageId,internalNetworkId,egressNetworkId,
    auditPersistenceVerified:false,networkPolicyVerified:false,firewallVerified:false,requestExecuted:false,activated:false};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if(process.argv.length!==6) throw Error('invalid_arguments');
    const [gatewayId,imageId,internalNetworkId,egressNetworkId]=process.argv.slice(2);
    console.log(JSON.stringify(await inspectGateway({gatewayId,imageId,internalNetworkId,egressNetworkId})));
  } catch {
    console.error('{"verified":false,"reason":"gateway_inspection_failed"}');process.exitCode=2;
  }
}
