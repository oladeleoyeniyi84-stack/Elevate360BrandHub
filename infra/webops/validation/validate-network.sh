#!/usr/bin/env bash
set -euo pipefail

: "${WEBOPS_WORKER_CONTAINER:=webops-worker}"
: "${WEBOPS_GATEWAY_CONTAINER:=webops-egress-gateway}"
: "${WEBOPS_APPROVED_URL:=https://www.elevate360official.com/}"
: "${WEBOPS_EVIDENCE_DIR:=./webops-network-evidence}"
: "${WEBOPS_GATEWAY_AUDIT_EXPORT:?Set WEBOPS_GATEWAY_AUDIT_EXPORT to the durable host-side gateway audit export path}"

# This test deliberately stops and restarts the gateway. Require a staging-only,
# separately acknowledged operator invocation; never run against production.
: "${WEBOPS_ALLOW_STAGING_GATEWAY_RESTART:?Set WEBOPS_ALLOW_STAGING_GATEWAY_RESTART=YES only on the isolated staging host}"
if [ "$WEBOPS_ALLOW_STAGING_GATEWAY_RESTART" != YES ]; then
  printf '%s\n' 'Refusing gateway restarts without explicit staging acknowledgment' >&2
  exit 2
fi
: "${WEBOPS_STAGING_HOST_ID:?Set WEBOPS_STAGING_HOST_ID to the expected staging hostname}"
if [ "$(hostname)" != "$WEBOPS_STAGING_HOST_ID" ]; then
  printf '%s\n' 'Refusing test: host identity does not match the approved staging hostname' >&2
  exit 2
fi
mkdir -p "$WEBOPS_EVIDENCE_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$WEBOPS_EVIDENCE_DIR/$STAMP"
mkdir -p "$OUT"

pass() { printf 'PASS %s\n' "$1" | tee -a "$OUT/summary.txt"; }
fail() { printf 'FAIL %s\n' "$1" | tee -a "$OUT/summary.txt" >&2; exit 1; }

# Preflight: avoid false passes caused by missing probe tools or placeholder gateway images.
docker exec "$WEBOPS_WORKER_CONTAINER" node --version \
  >"$OUT/worker-probe-preflight.log" 2>&1 || fail "worker has no Node.js runtime for egress probes"
# Node.js fetch returns success only for a completed HTTP exchange, regardless of status.
# TLS verification remains enabled. These reachability probes complement, never replace,
# host firewall, route, DNS and gateway-policy verification.
probe_worker() {
  docker exec "$WEBOPS_WORKER_CONTAINER" node -e '
    const target=process.argv[1];
    fetch(target,{redirect:"manual",signal:AbortSignal.timeout(5000)})
      .then(async (r)=>{await r.body?.cancel().catch(()=>{});process.exit(0)})
      .catch(()=>process.exit(1));
  ' "$1"
}

docker exec "$WEBOPS_GATEWAY_CONTAINER" test -x /app/webops-gateway-check \
  >"$OUT/gateway-check-preflight.log" 2>&1 || fail "gateway diagnostic command missing"

# The worker-side diagnostic must call the actual configured gateway-dependent inspection path.
# A direct HTTPS probe alone cannot demonstrate that this dependency fails closed.
docker exec "$WEBOPS_WORKER_CONTAINER" test -x /app/webops-worker-check \
  >"$OUT/worker-check-preflight.log" 2>&1 || fail "worker gateway-dependent diagnostic command missing; V5 cannot be verified"

# Capture reviewed infrastructure state before adversarial tests.
nft list table inet webops_filter >"$OUT/nftables-webops-filter.txt" 2>&1 || fail "WebOps nftables table is not loaded"
docker inspect "$WEBOPS_WORKER_CONTAINER" >"$OUT/worker-inspect.json" 2>&1 || fail "worker container inspection failed"
docker inspect "$WEBOPS_GATEWAY_CONTAINER" >"$OUT/gateway-inspect.json" 2>&1 || fail "gateway container inspection failed"
hostnamectl >"$OUT/host-identity.txt" 2>&1 || hostname >"$OUT/host-identity.txt"
git rev-parse HEAD >"$OUT/git-commit.txt" 2>&1 || fail "validation checkout has no Git commit identity"

# V1. The worker must not have direct public egress.
if probe_worker 'http://1.1.1.1/' >"$OUT/worker-direct-egress.log" 2>&1; then
  fail "worker direct public egress is possible"
else
  pass "worker direct public egress blocked"
fi

# V2. Private/reserved/metadata targets must be blocked from the worker.
for target in \
  http://169.254.169.254/latest/meta-data/ \
  http://127.0.0.1/ \
  http://10.0.0.1/ \
  http://172.16.0.1/ \
  http://192.168.0.1/ \
  http://100.64.0.1/ \
  http://192.0.2.1/ \
  http://198.51.100.1/ \
  http://203.0.113.1/; do
  safe_name="$(printf '%s' "$target" | tr '/:.' '_')"
  if probe_worker "$target" >"$OUT/private-$safe_name.log" 2>&1; then
    fail "worker reached blocked target $target"
  fi
done
pass "worker private/reserved/metadata direct access blocked"

# V3. Approved traffic must succeed through the gateway's explicit request path.
if docker exec "$WEBOPS_GATEWAY_CONTAINER" /app/webops-gateway-check "$WEBOPS_APPROVED_URL" >"$OUT/gateway-approved.log" 2>&1; then
  pass "approved origin reachable through gateway"
else
  fail "approved origin failed through gateway"
fi

# V4. Gateway must reject unsafe destinations independently of worker policy.
for target in \
  http://169.254.169.254/latest/meta-data/ \
  https://127.0.0.1/ \
  https://10.0.0.1/ \
  https://100.64.0.1/ \
  https://192.0.2.1/; do
  safe_name="$(printf '%s' "$target" | tr '/:.' '_')"
  if docker exec "$WEBOPS_GATEWAY_CONTAINER" /app/webops-gateway-check "$target" >"$OUT/gateway-block-$safe_name.log" 2>&1; then
    fail "gateway allowed blocked target $target"
  fi
done
pass "gateway independently rejects unsafe destinations"

# V5. Verify the actual worker inspection path before, during, and after a gateway outage.
# The worker check MUST use the same gateway dependency as production inspection.
if docker exec "$WEBOPS_WORKER_CONTAINER" /app/webops-worker-check "$WEBOPS_APPROVED_URL" >"$OUT/worker-before-outage.log" 2>&1; then
  pass "worker inspection succeeds through healthy gateway"
else
  fail "worker inspection path is not working before outage; V5 inconclusive"
fi

docker stop "$WEBOPS_GATEWAY_CONTAINER" >"$OUT/gateway-stop.log" 2>&1 || fail "gateway could not be stopped for outage test"
cleanup() { docker start "$WEBOPS_GATEWAY_CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
sleep 1

if docker exec "$WEBOPS_WORKER_CONTAINER" /app/webops-worker-check "$WEBOPS_APPROVED_URL" >"$OUT/worker-during-outage.log" 2>&1; then
  fail "worker inspection succeeded without gateway (fail-open)"
fi
if probe_worker "$WEBOPS_APPROVED_URL" >"$OUT/worker-direct-during-outage.log" 2>&1; then
  fail "worker bypassed gateway with direct HTTPS during outage"
fi
pass "worker inspection and direct HTTPS fail closed during gateway outage"

docker start "$WEBOPS_GATEWAY_CONTAINER" >"$OUT/gateway-recovery.log" 2>&1 || fail "gateway could not restart after outage"
trap - EXIT
if docker exec "$WEBOPS_WORKER_CONTAINER" /app/webops-worker-check "$WEBOPS_APPROVED_URL" >"$OUT/worker-after-outage.log" 2>&1; then
  pass "worker inspection restored after gateway recovery"
else
  fail "worker inspection did not recover after gateway restart"
fi

# V6. Durable audit evidence must exist outside the gateway container and survive restart.
if [ ! -s "$WEBOPS_GATEWAY_AUDIT_EXPORT" ]; then
  fail "durable gateway audit export is missing or empty"
fi
cp "$WEBOPS_GATEWAY_AUDIT_EXPORT" "$OUT/gateway-audit-export-before-restart.log"
sha256sum "$OUT/gateway-audit-export-before-restart.log" >"$OUT/audit-pre-restart.sha256"
docker restart "$WEBOPS_GATEWAY_CONTAINER" >"$OUT/gateway-restart.log" 2>&1 || fail "gateway restart failed"
sleep 1
if [ ! -s "$WEBOPS_GATEWAY_AUDIT_EXPORT" ]; then
  fail "gateway audit evidence did not survive restart"
fi
cp "$WEBOPS_GATEWAY_AUDIT_EXPORT" "$OUT/gateway-audit-export-after-restart.log"
sha256sum "$OUT/gateway-audit-export-after-restart.log" >"$OUT/audit-post-restart.sha256"
if ! cmp -s "$OUT/gateway-audit-export-before-restart.log" "$OUT/gateway-audit-export-after-restart.log"; then
  fail "gateway audit evidence changed unexpectedly on restart"
fi
pass "gateway audit evidence preserved byte-for-byte across restart"

# Finalize the summary before hashing. No evidence file may be edited after manifest creation.
pass "evidence collection complete"

# Final evidence manifest. Do not include the manifest itself in its own digest set.
find "$OUT" -maxdepth 1 -type f ! -name SHA256SUMS -print0 \
  | sort -z \
  | xargs -0 sha256sum >"$OUT/SHA256SUMS"
[ -s "$OUT/SHA256SUMS" ] || fail "SHA-256 manifest was not created"
sha256sum -c "$OUT/SHA256SUMS" >"$OUT/../manifest-verification.log" 2>&1 || { printf "FAIL evidence checksum verification\n" >&2; exit 1; }

printf '%s\n' "$OUT"
