# Bounded host schedule — release preparation

This package is not installed or activated by adding it to the repository.
Founder release authorization is recorded in evidence-review-20261018.md; deployment
still requires the exact reviewed release and outstanding operational evidence.
The checked-in schedule.example.json is deliberately disabled.

## Invocation and configuration

The host entry point is `node scheduled-runner-cli.mjs /absolute/config.json`.
It reads one operator-owned regular file, mode 0600, maximum 16 KiB, with no symlink
components or hard links. Do not use worker report fields as configuration.
Disabled configuration needs only `schemaVersion: 1` and `enabled: false` and makes
no Docker call. Enabled configuration additionally requires:

- `intervalMinutes`: integer 60 through 10080; proposed initial interval is 60.
- `stateDirectory`: persistent private directory separate from runner/report paths.
- `runner`: full verified containerId, imageId and networkId, explicit canonical
  paths (1–14), runDirectory and reportDirectory, as required by host-runner.mjs.

All three state directories must preexist, be owned by the invoking UID and mode
0700. Use stable paths across release replacement and host reboot. Configuration
and code must have trusted administrator-owned ancestors, not worker-writable ones.
Never delete cadence state during upgrade or give each invocation a fresh directory.
The expected release identities still require independent verification; this file
is not proof of authorization or live firewall correctness.

## Cadence and failures

Each tick reserves and fsyncs its next allowed time before calling the host runner.
A durable exclusive lock serializes ticks. Not-due ticks do no Docker work; valid
healthy and unhealthy reports complete normally and release the schedule lock.
An exception, crash, corrupt state, reversed clock or leftover pending file blocks
further runs until an operator reconciles evidence and process state. No automatic
retry, stale-lock cleanup, evidence pruning, or catch-up loop is implemented.
Reducing the configured interval cannot shorten a previously reserved interval.
Cadence uses host wall time: forward clock jumps can advance eligibility, so correct
host time remains a deployment prerequisite. Local root can alter state; this is
not a tamper-proof quota or authentication boundary.

CLI exit 0 means disabled/not-due or a stored healthy result; exit 1 means a stored
unhealthy result; exit 2 is a sanitized blocked/error result. No raw Docker errors,
configuration content or worker stderr are printed. Journal capture is local only;
external alert delivery is unfinished.

## Prepared systemd units

systemd/webops-monitor.service uses host Node 24 at /usr/bin/node and a reviewed
release under /opt/elevate360-webops/current. Its timer wakes five minutes after boot
and hourly after activation. The persistent application cadence prevents an early
post-reboot tick from executing again. Timer timing follows the systemd timer manual:
https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html

The service has no restart loop, a 60-second deadline, local Unix-socket access and
write access to only the three state directories within its filesystem sandbox.
Docker socket access remains privileged; these restrictions do not make Docker a
least-privilege API. Docker exec occurs in a separate container process and may
outlive a killed CLI/service. Retained locks prevent silent retries in that case.
The timer must remain disabled until reconciliation, image/runtime checks, retention,
rollback, revised network/firewall tests and reboot evidence pass. Host Node 24,
paths, unit compatibility and service sandbox behavior need live verification.

## Disable and emergency stop

To suspend future work, atomically replace the private schedule configuration with
the disabled example and disable/stop webops-monitor.timer. Disabling configuration
alone affects the next invocation; a tick that already loaded it can still run.
For an emergency full stop, stop webops-monitor.service and then stop the verified
worker and gateway containers by their recorded full IDs. Stopping only the service
does not prove an in-container execution ended. Verify containers are stopped and
preserve logs and both lock directories before any restart. Do not clear locks
automatically or start a replacement worker as a retry.

This is an operator procedure, not an implemented one-command emergency controller.
No installation, enable command, production request or container stop is performed
by these source files. A consolidated release/rollback procedure remains required.
