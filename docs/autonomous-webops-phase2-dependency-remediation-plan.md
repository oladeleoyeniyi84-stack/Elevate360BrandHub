# WebOps dependency remediation plan

This document is a proposal only. It does not authorize package changes.

## Priority order
1. `proxy-addr` critical advisory — resolve first because it is runtime-adjacent through the Express dependency tree and relates to IP trust/spoofing behavior.
2. `source-map-js` high advisory — resolve next; validate build tooling and any source-map consumers.
3. `postcss` moderate direct dev dependency — update within a compatible range if available and rerun full build/tests.
4. `@babel/core` low transitive advisory — update through the owning dependency chain rather than forcing an override unless compatibility is proven.
5. `drizzle-kit` / `@esbuild-kit/*` / nested `esbuild` moderate chain — do not follow the audit's proposed `drizzle-kit@0.18.1` path blindly. Review current Drizzle tooling compatibility and migrate away from deprecated `@esbuild-kit` transitive packages using an explicitly selected supported `drizzle-kit` version.

## Change controls
- Use a separate dependency-remediation branch.
- Change one risk group at a time.
- Capture `npm audit --json` before and after each group.
- Run TypeScript, the entire test suite, and production client/server builds after each group.
- Do not use `npm audit fix --force`.
- Do not deploy, merge to `main`, change credentials, alter Render settings, or modify the production database without separate Founder approval.

## Exit criteria
- Critical and high findings are eliminated or explicitly risk-accepted by the Founder with documented rationale.
- Moderate findings are either remediated or bounded to development-only exposure with documented evidence.
- No regression in authentication, proxy trust, public routes, Stripe/webhook flows, database tooling, or WebOps safety tests.
