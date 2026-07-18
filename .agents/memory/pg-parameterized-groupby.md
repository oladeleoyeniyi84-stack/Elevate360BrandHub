---
name: Parameterized expressions in GROUP BY fail (PG 42803)
description: Why date_trunc($1, col) in both SELECT and GROUP BY errors, and the safe fix
---

**Rule:** When a Drizzle `sql\`\`` template interpolates the same value into an expression used in both SELECT and GROUP BY (e.g. `date_trunc(${unit}, created_at)`), Postgres binds two separate parameters ($1, $2) and treats them as *different* expressions → error 42803 "column must appear in the GROUP BY clause".

**Why:** Postgres cannot prove two placeholders hold the same value at plan time, so the SELECT expression is considered ungrouped. Hit this building funnel time-series aggregates (daily/weekly/monthly `date_trunc` buckets).

**How to apply:** Build the expression once with `sql.raw` from a value that is a closed TypeScript union or hardcoded literal (never user input), and reuse the same fragment in SELECT, GROUP BY, and ORDER BY:
```ts
const truncExpr = sql.raw(`date_trunc('${unit}', created_at)`); // unit: "day"|"week"|"month"
```
Same applies to `interval '${n} days'` fragments. Confirm every `sql.raw` input is internal-only.
