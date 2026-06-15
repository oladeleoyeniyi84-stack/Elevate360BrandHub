---
name: lead_magnet_leads dev/prod schema drift
description: Production lead_magnet_leads enforces a UNIQUE email constraint not declared in code, and the dev table has historically lagged prod's columns.
---

# lead_magnet_leads dev/prod schema drift

Production `lead_magnet_leads` has a **UNIQUE constraint on `email`** that is NOT
declared in `shared/schema.ts` (the model is `text("email").notNull()` with no
`.unique()`), and the dev DB's email index is a plain non-unique btree. So code
inspection alone says "email isn't unique" while prod actively enforces it.

**Why:** This drift caused repeat guide opt-ins to throw Postgres `23505`
(unique_violation) → 500 in production, even though the same flow never threw in
dev. The table was also provisioned out-of-band: at one point the dev table still
had the old `name`/`guide_slug` columns while prod already had
`first_name`/`source`/`lead_score`/`updated_at`.

**How to apply:**
- Treat the `/api/lead-magnet` capture as idempotent: look up by email first;
  on a concurrent-insert race, catch `error.code === "23505"` and re-fetch the
  existing row rather than 500-ing.
- Don't assume the dev DB matches prod for this table. After schema changes,
  the dev table may need additive `ALTER ... ADD COLUMN` to catch up (kept
  separate because direct DB/schema changes were explicitly out of scope).
- If you ever need case-insensitive dedup, canonicalize email or use a
  `lower(email)` lookup — the current unique check is exact-text only.
