import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOST_COMMAND_TIMEOUTS} from './host-runner.mjs';

test('systemd deadline accommodates both inspection pairs and worker execution',()=>{
  const unit=readFileSync(new URL('./systemd/webops-monitor.service',import.meta.url),'utf8');
  const guide=readFileSync(new URL('./scheduling.md',import.meta.url),'utf8');
  const deadlines=[...unit.matchAll(/^TimeoutStartSec=(\d+)$/gm)];
  assert.equal(deadlines.length,1,'one finite explicit service deadline is required');
  const seconds=Number(deadlines[0][1]);
  const commandMs=4*HOST_COMMAND_TIMEOUTS.inspectionMs+HOST_COMMAND_TIMEOUTS.executionMs;
  assert.ok(seconds*1000>=commandMs+15000,'allow 15s for host validation and durable storage');
  assert.ok(seconds<=120,'keep host service deadline bounded to two minutes');
  assert.match(unit,/^Restart=no$/m,'timeout must not create automatic retries');
  assert.match(unit,/^ExecCondition=\/usr\/bin\/node .*boot-gate\.mjs .*schedule\.json .*boot\/approval\.json$/m,
    'every scheduled tick must pass the current-boot approval gate');
  assert.match(unit,/^ExecCondition=\/usr\/bin\/node .*capacity-gate\.mjs .*schedule\.json$/m,
    'every scheduled tick must preserve a report-capacity reserve');
  assert.match(unit,/^ExecStart=\/usr\/bin\/node .*guarded-scheduled-runner-cli\.mjs .*schedule\.json .*boot\/approval\.json$/m,
    'the runner must bind final boot and capacity checks to one loaded schedule');
  assert.doesNotMatch(unit,/^ExecStart=.*scheduled-runner-cli\.mjs .*schedule\.json$/m,
    'the service must not use the unguarded runner entry point');
  assert.match(guide,/The service has no restart loop, a 90-second deadline/,
    'operator guide must match the service deadline');
  assert.match(guide,/## Single-command emergency controller/,
    'operator guide must retain the implemented emergency controller');
  assert.match(guide,/## Configuration and cadence read consistency/,
    'operator guide must retain cadence consistency controls');
  assert.match(guide,/## Current-boot gate/,
    'operator guide must retain the reboot safety control');
  assert.match(guide,/capacity-gate\.mjs serializes a report-store capacity/,
    'operator guide must retain the report-capacity reserve');
});
