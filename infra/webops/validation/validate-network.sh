#!/usr/bin/env bash
set -euo pipefail

: "${WEBOPS_WORKER_CONTAINER:=webops-worker}"
: "${WEBOPS_GATEWAY_CONTAINER:=webops-egress-gateway}"
: "${WEBOPS_APPROVED_URL:=https://www.elevate360official.com/}"
: "${WEBOPS_EVIDENCE_DIR:=./webops-network-evidence}"
: "${WEBOPS_GATEWAY_AUDIT_EXPORT:?Set WEBOPS_GATEWAY_AUDIT_EXPORT to the durable host-side gateway audit export path}"

mkdir -p "$WEBOPS_EVIDENCE_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$WEBOPS_EVIDENCE_DIR/$STAMP"
mkdir -p "$OUT"

pass() { printf 'PASS %s\n' "$1" | tee -a "$OUT/summary.txt"; }
fail() { printf 'FAIL %s\n' "$1" | tee -a "$OUT/summary.txt" >&2; exit 1; }

# Preflight: avoid false passes caused by missing probe tools or placeholder gateway images.
docker exec "$WEBOPS_WORKER_CONTAINER" sh -lc 'command -v wget >/dev/null 2>&1 || command -v curl >/dev/null 2>&1' \
  >"$OUT/worker-probe-preflight.log" 2>&1 || fail "worker has no HTTP probe client; egress tests would be inconclusive"

docker exec "$WEBOPS_GATEWAY_CONTAINER" test -x /app/webops-gateway-check \
  >"$OUT/gateway-check-preflight.log" 2>&1 || fail "gateway diagnostic command missing"

# Capture reviewed infrastructure state before adversarial tests.
nft list table inet webops_filter >"$OUT/nftables-webops-filter.txt" 2>&1 || fail "WebOps nftables table is not loaded"
docker inspect "$WEBOPS_WORKER_CONTAINER" >"$OUT/worker-inspect.json" 2>&1 || fail "worker container inspection failed"
docker inspect "$WEBOPS_GATEWAY_CONTAINER" >"$OUT/gateway-inspect.json" 2>&1 || fail "gateway container inspection failed"
hostnamectl >"$OUT/host-identity.txt" 2>&1 || hostname >"$OUT/host-identity.txt"
git rev-parse HEAD >"$OUT/git-commit.txt" 2>&1 || fail "validation checkout has no Git commit identity"

# V1. The worker must not have direct public egress.
if docker exec "$WEBOPS_WORKER_CONTAINER" sh -lc 'wget -q -T 5 -O /dev/null https://1.1.1.1 2>/dev/null || curl -ksS --connect-timeout 5 https://1.1.1.1 -o /dev/null' >"$OUT/worker-direct-egress.log" 2>&1; then
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
  if docker exec "$WEBOPS_WORKER_CONTAINER" sh -lc "wget -q -T 3 -O /dev/null '$target' 2>/dev/null || curl -ksS --connect-timeout 3 '$target' -o /dev/null" >"$OUT/private-$safe_name.log" 2>&1; then
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

# V5. Gateway outage must fail closed; the worker must not fall back to direct internet.
docker stop "$WEBOPS_GATEWAY_CONTAINER" >"$OUT/gateway-stop.log"
cleanup() { docker start "$WEBOPS_GATEWAY_CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
sleep 1
if docker exec "$WEBOPS_WORKER_CONTAINER" sh -lc 'wget -q -T 5 -O /dev/null https://www.elevate360official.com/ 2>/dev/null || curl -ksS --connect-timeout 5 https://www.elevate360official.com/ -o /dev/null' >"$OUT/worker-gateway-outage.log" 2>&1; then
  fail "worker bypassed gateway during outage"
else
  pass "gateway outage fails closed"
fi
cleanup
trap - EXIT

# V6. Durable audit evidence must exist outside the gateway container and survive restart.
if [ ! -s "$WEBOPS_GATEWAY_AUDIT_EXPORT" ]; then
  fail "durable gateway audit export is missing or empty"
fi
cp "$WEBOPS_GATEWAY_AUDIT_EXPORT" "$OUT/gateway-audit-export-before-restart.log"
docker restart "$WEBOPS_GATEWAY_CONTAINER" >"$OUT/gateway-restart.log" 2>&1 || fail "gateway restart failed"
sleep 1
if [ ! -s "$WEBOPS_GATEWAY_AUDIT_EXPORT" ]; then
  fail "gateway audit evidence did not survive restart"
fi
cp "$WEBOPS_GATEWAY_AUDIT_EXPORT" "$OUT/gateway-audit-export-after-restart.log"
pass "gateway audit evidence persists outside container lifecycle"

# Final evidence manifest. Do not include the manifest itself in its own digest set.
find "$OUT" -maxdepth 1 -type f ! -name SHA256SUMS -print0 \
  | sort -z \
  | xargs -0 sha256sum >"$OUT/SHA256SUMS"
[ -s "$OUT/SHA256SUMS" ] || fail "SHA-256 manifest was not created"
pass "evidence hashes captured"

printf '%s\n' "$OUT"
