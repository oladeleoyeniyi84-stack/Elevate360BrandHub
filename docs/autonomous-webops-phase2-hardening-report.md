# Autonomous WebOps — Phase 2 hardening report

## Status
Application-layer hardening is implemented and validated on the isolated Phase 2 implementation branch. No production deployment, merge, credential change, Render change, or production database write occurred.

Validated GitHub Actions run: `38338523134` on head `fa901cb339dd9f56d76c604b0673d2c2d4b3bf61`.

Validation results:
- dependency installation: PASS
- dependency audit capture: PASS
- TypeScript: PASS
- full test suite: PASS — 30 passed, 0 failed, 0 skipped
- client production bundle: PASS
- server production bundle: PASS

## SSRF / egress hardening added
- Exact-origin HTTPS allowlist remains mandatory.
- IP-literal, localhost/local/internal and nonstandard-port targets remain rejected.
- Every queued outbound request now performs a DNS preflight.
- DNS results are rejected if any resolved address is private, loopback, link-local, carrier-grade NAT, documentation/reserved, multicast or otherwise outside the accepted public address space.
- DNS failures and unsafe resolutions fail closed before `fetch` is called.
- DNS safety rejections are classified as high severity and require Founder review.
- Tests prove that a metadata-style address (`169.254.169.254`) prevents the fetcher from being invoked.

Important limitation: DNS preflight alone cannot eliminate DNS-rebinding/TOCTOU risk because the HTTP stack may resolve the hostname again after the preflight. Before any live autonomous crawl, the execution environment still needs a network-level egress policy that blocks private/reserved destinations independently of application code.

## Dependency audit triage
The retained `npm audit --json` artifact reports 8 vulnerabilities: 1 low, 5 moderate, 1 high, 1 critical.

| Package | Severity | Direct? | Finding | Fix signal |
| --- | --- | --- | --- | --- |
| `proxy-addr` | critical | no | IP spoofing via IPv4-mapped IPv6 trust subnet (GHSA-jqcg-44mw-7w3h) | fix available |
| `source-map-js` | high | no | event-loop denial of service through indexed source-map offsets (GHSA-68fv-2mgg-jv7q) | fix available |
| `postcss` | moderate | yes | sourceMappingURL arbitrary `.map` read issue (GHSA-fxqj-rqcc-2cmp) | fix available |
| `esbuild` | moderate | no | dev-server request/read exposure (GHSA-67mh-4wv8-2f99) | fix route reported through `drizzle-kit` |
| `drizzle-kit` | moderate | yes/dev | vulnerable transitive `@esbuild-kit/esm-loader` chain | audit proposes `drizzle-kit@0.18.1` and flags semver-major change |
| `@esbuild-kit/core-utils` | moderate | no | inherits vulnerable `esbuild` | tied to `drizzle-kit` fix route |
| `@esbuild-kit/esm-loader` | moderate | no | inherits vulnerable core-utils/esbuild chain | tied to `drizzle-kit` fix route |
| `@babel/core` | low | no | arbitrary file read via sourceMappingURL comment (GHSA-4x5r-pxfx-6jf8) | fix available |

## Dependency decision
No dependency versions or lockfile entries were changed. `npm audit fix` and `npm audit fix --force` were deliberately not run.

Reason: dependency remediation is security-sensitive and can alter runtime/build behavior. The `drizzle-kit` recommendation is especially unsuitable for blind automation because npm reports a semver-major fix path to an older version. A controlled dependency-remediation branch should update one risk group at a time, rerun all tests/builds, and inspect runtime compatibility before any production approval.

## Remaining gates before live pilot
1. Founder approval for a controlled dependency-remediation branch.
2. Resolve or formally accept the critical/high dependency findings before production integration.
3. Add worker/runtime network egress restrictions that independently block private/reserved IP ranges and unapproved destinations.
4. Confirm the production-domain allowlist before any live crawl.
5. Run a bounded, read-only live pilot only after the above gates pass.
