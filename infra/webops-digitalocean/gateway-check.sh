#!/bin/sh
# Exercise the actual internal gateway HTTP request/policy path, never a mock.
exec node /app/webops-worker-check.mjs "$@"
