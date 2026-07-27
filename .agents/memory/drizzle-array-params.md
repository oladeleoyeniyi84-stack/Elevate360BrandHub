---
name: Drizzle array params in raw SQL
description: JS arrays interpolated into drizzle sql`` templates do not arrive as Postgres arrays — ANY(${arr}) fails at runtime with 42809.
---

# Drizzle array params in raw SQL templates

**Rule:** Never pass a JS array as a single interpolated param to `ANY(...)` inside a drizzle `sql` template: `WHERE col = ANY(${jsArray})` compiles and type-checks but fails at runtime with Postgres error **42809 — "op ANY/ALL (array) requires array on right side"** (the param is not serialized as a Postgres array type).

**Fix:** build an IN list of individual scalar params:

```ts
WHERE col IN (${sql.join(items.map((i) => sql`${i}`), sql`, `)})
```

Safe for user-derived strings (each element is its own bound param, no injection), no driver array-serialization ambiguity. Guard `items.length > 0` first — an empty IN list is a syntax error.

**Why:** the failure is invisible until the table has data AND the code path with the array filter runs — empty-table dev testing and `tsc` both pass, then the endpoint 500s after the first real import. Cost a full debug round in the search-intelligence composed dashboard.

**How to apply:** any raw `sql` template needing an array membership test — dynamic ID/name lists, batch lookups. For closed internal constant unions, `sql.raw` inlining is fine (see pg-parameterized-groupby.md); `sql.join` is for dynamic/user-derived lists.
