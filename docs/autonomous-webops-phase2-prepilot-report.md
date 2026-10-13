# Autonomous WebOps Phase 2 pre-pilot hardening report

## Scope
This branch prepares the read-only crawler for a future Founder-authorized live pilot. It does not activate a live crawler, merge to production, deploy to Render, use production credentials, or write to the production database.

## DNS rebinding / TOCTOU hardening
The crawler now performs two linked controls for its default network path:
1. resolve the approved hostname and reject any private, loopback, link-local, reserved, documentation, multicast, or otherwise non-public address;
2. connect the HTTPS request to the exact validated public IP instead of allowing a second DNS lookup.

TLS certificate validation and SNI continue to use the original approved hostname. Redirects remain manual and every redirect target is revalidated against the exact HTTPS origin allowlist before it can be queued.

This closes the application-level DNS preflight-to-connect rebinding gap. Infrastructure-level outbound filtering remains a separate defense-in-depth control and must not be assumed to exist until independently verified at the hosting/network layer.

## Dependency exposure review
After the Founder-authorized critical/high remediation, the full audit contains six findings: five moderate and one low. CI now captures both the complete audit and a production-only `npm audit --omit=dev` artifact so runtime exposure can be distinguished from build/development tooling exposure.

Known full-audit findings:
- low: `@babel/core` — source-map processing/file-read advisory;
- moderate: `postcss` — sourceMappingURL file-read advisory;
- moderate: nested `esbuild` under the Drizzle tooling chain;
- moderate: `drizzle-kit`;
- moderate: `@esbuild-kit/core-utils`;
- moderate: `@esbuild-kit/esm-loader`.

The Drizzle chain must not be remediated by blindly accepting npm's proposed `drizzle-kit@0.18.1` path because that is a compatibility-changing downgrade/semver-major remediation path relative to the current tooling. Any change to that chain requires an isolated compatibility gate.

## Minimum production crawl allowlist proposal
For the first bounded pilot, the minimum proposed origin allowlist is:

- `https://www.elevate360official.com`

No wildcard subdomains, apex-domain aliases, Render hostnames, third-party CDNs, APIs, checkout providers, analytics hosts, or other Elevate360 properties are included in this proposal. External references discovered in HTML remain ignored rather than followed.

Founder confirmation of this exact origin is required before any live crawl is started.

## Pilot limits proposed
If separately authorized later, the first live pilot should remain read-only and use:
- one approved origin only;
- GET requests only;
- no cookies, authorization headers, API keys, or production credentials;
- manual redirect handling;
- sequential concurrency of 1;
- maximum 25 pages;
- maximum crawl depth 2;
- maximum response body 512,000 bytes;
- per-request timeout 8 seconds;
- no database writes, source changes, remediation, merge, or deployment.

## Exit criteria for this pre-pilot gate
- strict `npm ci` passes;
- full dependency audit and production-only audit are captured;
- TypeScript passes;
- complete test suite passes, including DNS pinning invariants;
- client and server production bundles build;
- no critical/high dependency findings return;
- production-only dependency audit is reviewed;
- exact pilot origin is confirmed by the Founder;
- live pilot receives a separate explicit Founder authorization.
