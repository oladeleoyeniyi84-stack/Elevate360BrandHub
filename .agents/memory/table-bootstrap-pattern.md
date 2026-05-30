---
name: Production table bootstrap pattern
description: How new DB tables reach the Render production database in this repo (NOT db:push)
---

New phases add Drizzle table definitions to `shared/schema.ts`, but tables are NOT created
in production via `drizzle-kit push`.

**Why:** `db:push` falsely offers to *rename* the express-session `user_sessions` table
(and similar), which is destructive. The repo avoids it entirely for new tables.

**How to apply:** For each new phase that adds tables, write an idempotent
`scripts/create_phaseNN_tables.ts` (plain `pg.Pool` + `CREATE TABLE IF NOT EXISTS` +
`CREATE INDEX IF NOT EXISTS`) whose SQL matches the Drizzle schema column-for-column.
Run it with `npx tsx scripts/create_phaseNN_tables.ts`. It is safe to re-run.
Keeping the SQL schema-aligned means a later accidental `db:push` sees no diff.
Precedent: `scripts/create_phase52_tables.ts`, `scripts/create_phase67_tables.ts`.
