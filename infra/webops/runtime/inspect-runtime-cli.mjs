import {readScheduleConfig,validateScheduleConfig} from './scheduled-runner.mjs';
import {inspectRunnerIdentity} from './host-runner.mjs';

try {
  if(process.argv.length!==3) throw Error('invalid_arguments');
  const config=readScheduleConfig(process.argv[2]);
  if(config.enabled!==false) throw Error('disabled_configuration_required');
  validateScheduleConfig({...config,enabled:true});
  const receipt=await inspectRunnerIdentity(config.runner);
  console.log(JSON.stringify({...receipt,scope:'worker_and_internal_network',
    gatewayVerified:false,firewallVerified:false,requestExecuted:false}));
} catch {
  console.error('{"verified":false,"reason":"runtime_inspection_failed"}');
  process.exitCode=2;
}
