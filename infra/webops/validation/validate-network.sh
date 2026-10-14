#!/usr/bin/env bash
set -euo pipefail

: "${WEBOPS_WORKER_CONTAINER:=webops-worker}"
: "${WEBOPS_GATEWAY_CONTAINER:=webops-egress-gateway}"
: "${WEBOPS_APPROVED_URL:=https://www.elevate360official.com/}"
: "${WEBOPS_EVIDENCE_DIR:=./webops-network-evidence}"

mkdir -p "$WEBOPS_EVIDENCE_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$WEBOPS_EVIDENCE_DIR/$STAMP"
mkdir -p "$OUT"

pass() { printf 'PASS %s\n' "$1" | tee -a "$OUT/summary.txt"; }
fail() { printf 'FAIL %s\n' "$1" | tee -a "$OUT/summary.txt" >&2; exit 1; }

# 1. The worker must not have direct public egress.
if docker exec "$WEBOPS_WORKER_CONTAINER" sh -lc 'wget -q -T 5 -O /dev/null https://1.1.1.1 2>/dev/null || curl -ksS --connect-timeout 5 https://1.1.1.1 -o /dev/null' >"$OUT/worker-direct-egress.log" 2>&1; then
  fail "worker direct public egress is possible"
else
  pass "worker direct public egress blocked"
fi

# 2. Metadata/private targets must be blocked from the worker even if attempted directly.
for target in \
  http://169.254.169.254/latest/meta-data/ \
  http://127.0.0.1/ \
  http://10.0.0.1/ \
  http://172.16.0.1/ \
  http://192.168.0.1/; do
  safe_name="$(printf '%s' "$target" | tr '/:.' '_')"
  if docker exec "$WEBOPS_WORKER_CONTAINER" sh -lc "wget -q -T 3 -O /dev/null '$target' 2>/dev/null || curl -ksS --connect-timeout 3 '$target' -o /dev/null" >"$OUT/private-$safe_name.log" 2>&1; then
    fail "worker reached blocked target $target"
  fi
done
pass "worker private/reserved/metadata direct access blocked"

# 3. Approved traffic must succeed through the gateway's explicit request path.
# The gateway image must expose the one-shot diagnostic command before this gate is run.
if docker exec "$WEBOPS_GATEWAY_CONTAINER" /app/webops-gateway-check "$WEBOPS_APPROVED_URL" >"$OUT/gateway-approved.log" 2>&1; then
  pass "approved origin reachable through gateway"
else
  fail "approved origin failed through gateway"
fi

# 4. Gateway must reject unsafe destinations independently of worker policy.
for target in \
  http://169.254.169.254/latest/meta-data/ \
  https://127.0.0.1/ \
  https://10.0.0.1/; do
  safe_name="$(printf '%s' "$target" | tr '/:.' '_')"
  if docker exec "$WEBOPS_GATEWAY_CONTAINER" /app/webops-gateway-check "$target" >"$OUT/gateway-block-$safe_name.log" 2>&1; then
    fail "gateway allowed blocked target $target"
  fi
done
pass "gateway independently rejects unsafe destinations"

# 5. Gateway outage must fail closed; the worker must not fall back to direct internet.
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

# 6. Capture immutable-ish evidence snapshot for transfer to the durable audit store.
sha256sum "$OUT"/* >"$OUT/SHA256SUMS"
pass "evidence hashes captured"

printf '%s\n' "$OUT"
