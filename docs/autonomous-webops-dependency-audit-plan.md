# WebOps dependency audit triage

This step is analysis-only. No dependency upgrade, lockfile rewrite, production deployment, or credential change is authorized.

The CI validation job will capture `npm audit --json` as a retained artifact while allowing the main validation job to continue. The report will be used to identify the exact direct/transitive packages, advisory severity, installed ranges, fix availability, and whether fixes require breaking upgrades.

Decision rule: do not run `npm audit fix` or `npm audit fix --force` automatically. Any dependency change must be reviewed against build/test results and production compatibility before a separate approval gate.
