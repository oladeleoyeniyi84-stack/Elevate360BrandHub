# Manual Phase 3 runtime

Draft manual pilot only. No scheduler, remediation, production writes, or production credentials.
Only `https://www.elevate360official.com` is accepted. Query strings and fragments are rejected.
The gateway reuses the reviewed exact-origin, public DNS, and pinned HTTPS transport modules.
Each redirect is revalidated. Requests have a ten-second deadline, three-redirect limit,
one-MiB body limit, and one concurrent request. Only response metadata is returned.
Audit writes are appended and fsynced on the host bind mount; the worker has no audit mount.
This protects audit records from the worker, not a compromised gateway or host administrator.

## Local checks

With Node 24:

```sh
node infra/webops/runtime/build.mjs
node --test infra/webops/runtime/gateway.test.mjs
```

## Host preparation

Keep the active SSH and Recovery Console open. This runtime expects the corrected
`br-webops-wkr` and `br-webops-out` bridge names in the installed nftables policy.
Do not start the placeholder provisioning Compose services.

```sh
install -d -m 0700 -o 1000 -g 1000 /var/lib/elevate360-webops/audit
docker compose -f infra/webops/runtime/compose.pilot.yaml --profile manual-pilot config -q
docker compose -f infra/webops/runtime/compose.pilot.yaml --profile manual-pilot build webops-worker
```

The image build requires Docker registry and Alpine package access. Tags are not immutable;
record the resolved image ID and digest in the live evidence. No image build or Docker
network test was performed in the preparation environment, which has no Docker executable.

## Manual validation only

Start only for the supervised validation run:

```sh
docker compose -f infra/webops/runtime/compose.pilot.yaml --profile manual-pilot up -d
docker exec webops-worker /app/webops-gateway-check https://www.elevate360official.com/
WEBOPS_GATEWAY_AUDIT_EXPORT=/var/lib/elevate360-webops/audit/gateway.jsonl bash infra/webops/validation/validate-network.sh
```

The validation script now tests the worker's explicit gateway path during outage,
checks the audit prefix and worker mount isolation, and hashes the completed summary
with portable relative filenames. Shell syntax was checked; these script revisions
have not yet been executed on the Droplet. See evidence-review-20261018.md for the
review of the earlier live run and outstanding activation requirements.

Stop after validation; restart policies remain disabled:

```sh
docker compose -f infra/webops/runtime/compose.pilot.yaml --profile manual-pilot down
```

Do not delete host audit evidence. Scheduling and routine execution require a separate
Founder decision after all live controls pass. No main-branch merge or deployment is
part of this draft.
