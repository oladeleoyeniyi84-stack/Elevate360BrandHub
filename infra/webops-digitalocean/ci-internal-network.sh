#!/usr/bin/env bash
# CI-only integration rehearsal: no external egress.
set -euo pipefail
umask 077
NETWORK="webops-ci-internal-$$"
GATEWAY="webops-egress-gateway"
TMP="$(mktemp -d)"
cleanup() {
  docker rm -f "$GATEWAY" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  sudo rm -rf -- "$TMP"
}
trap cleanup EXIT

docker network create --internal --subnet 172.30.0.0/24 "$NETWORK" >/dev/null
chmod 0711 "$TMP"
mkdir "$TMP/audit"
chmod 0700 "$TMP/audit"
sudo chown 1000:1000 "$TMP/audit"
openssl rand -hex 32 | tr -d '\n' > "$TMP/token"
chmod 0600 "$TMP/token"
sudo chown 1000:1000 "$TMP/token"

docker run -d --name "$GATEWAY" --network "$NETWORK" --ip 172.30.0.2 \
  --read-only --security-opt no-new-privileges --cap-drop ALL \
  --mount "type=bind,src=$TMP/audit,dst=/audit" \
  --mount "type=bind,src=$TMP/token,dst=/run/secrets/gateway-token,readonly" \
  -e WEBOPS_GATEWAY_AUDIT_FILE=/audit/gateway.jsonl \
  -e WEBOPS_GATEWAY_TOKEN_FILE=/run/secrets/gateway-token \
  --entrypoint node webops-gateway:ci /app/webops-gateway-server.mjs >/dev/null

# Real gateway listener must reject unauthenticated inspection.
READY=0
for i in 1 2 3 4 5; do
  if docker exec "$GATEWAY" node -e '
    fetch("http://172.30.0.2:8787/inspect", {
      method:"POST", headers:{"content-type":"application/json"},
      body: JSON.stringify({requestId:"noauth",method:"GET",registryVersion:1,url:"https://www.elevate360official.com/"})
    }).then(r=>process.exit(r.status===401?0:1)).catch(()=>process.exit(1))
  ' >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
test "$READY" -eq 1 || { echo "Gateway listener unavailable" >&2; exit 1; }

# Independently prove worker DNS/TCP access to gateway without a credential.
docker run --rm --network "$NETWORK" --read-only \
  --security-opt no-new-privileges --cap-drop ALL \
  --entrypoint node webops-worker:ci -e '
    fetch("http://webops-egress-gateway:8787/inspect",{
      method:"POST",headers:{"content-type":"application/json"},body:"{}",
      signal:AbortSignal.timeout(3000)
    }).then(r=>process.exit(r.status===401?0:1)).catch(()=>process.exit(1))
  ' || { echo "Worker cannot contact private gateway listener" >&2; exit 1; }

worker_check() {
  docker run --rm --network "$NETWORK" --read-only \
    --security-opt no-new-privileges --cap-drop ALL \
    --mount "type=bind,src=$TMP/token,dst=/run/secrets/gateway-token,readonly" \
    -e WEBOPS_GATEWAY_TOKEN_FILE=/run/secrets/gateway-token \
    --entrypoint /app/webops-worker-check webops-worker:ci \
    "https://www.elevate360official.com/"
}
count_audits() {
  if [ ! -s "$TMP/audit/gateway.jsonl" ]; then echo 0; return; fi
  wc -l < "$TMP/audit/gateway.jsonl"
}
# Approved request reaches the real gateway but must fail because the CI
# network has no public DNS/egress; gateway must persist a DENY record.
if worker_check; then echo "Unexpected permitted public origin in isolated CI" >&2; exit 1; fi
test "$(count_audits)" -eq 1 || { echo "Worker did not reach real gateway with audit" >&2; docker logs --tail 25 "$GATEWAY" >&2; docker exec "$GATEWAY" sh -c 'ls -ld /audit; ls -l /audit/gateway.jsonl 2>/dev/null || true' >&2; exit 1; }
node - "$TMP/audit/gateway.jsonl" <<'NODE'
const fs = require("node:fs");
const log = JSON.parse(fs.readFileSync(process.argv[2], "utf8").trim());
if (log.event?.requestId !== "phase3-diagnose-1" ||
    log.event?.decision !== "deny" || log.event?.immutable !== true ||
    !/^[a-f0-9]{64}$/.test(log.hash)) process.exit(1);
NODE

docker stop "$GATEWAY" >/dev/null
if worker_check; then echo "Worker failed open during gateway outage" >&2; exit 1; fi
test "$(count_audits)" -eq 1 || { echo "Audit changed while gateway was unavailable" >&2; exit 1; }

docker start "$GATEWAY" >/dev/null
READY=0
for i in 1 2 3 4 5; do
  if docker exec "$GATEWAY" node -e '
    fetch("http://172.30.0.2:8787/inspect",{method:"POST"}).then(r=>process.exit(r.status===401?0:1)).catch(()=>process.exit(1))
  ' >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
test "$READY" -eq 1 || { echo "Gateway did not recover" >&2; exit 1; }
if worker_check; then echo "Unexpected allowed public origin after recovery" >&2; exit 1; fi
test "$(count_audits)" -eq 2 || { echo "Recovery request did not reach gateway" >&2; exit 1; }

docker run --rm --network "$NETWORK" --read-only \
  --security-opt no-new-privileges --cap-drop ALL \
  --entrypoint node webops-worker:ci -e '
    fetch("https://1.1.1.1/", {signal:AbortSignal.timeout(2500)})
      .then(()=>process.exit(1)).catch(()=>process.exit(0))
  '
echo "CI PASS: worker-to-gateway denial, outage, recovery, persistent audit, no direct egress."
