import { emergencyStop } from './emergency-stop.mjs';

try {
  if (process.argv.length !== 6) throw new Error('invalid_arguments');
  const [configPath, workerId, gatewayId, imageId] = process.argv.slice(2);
  const result = await emergencyStop({configPath, workerId, gatewayId, imageId});
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = result.stopped ? 0 : 2;
} catch {
  process.stderr.write('{"stopped":false,"reason":"emergency_stop_failed"}\n');
  process.exitCode = 2;
}
