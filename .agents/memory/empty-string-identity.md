---
name: Empty-string identity contamination
description: Why '' session/visitor ids must be normalized to NULL at analytics ingestion, and how anon guards must be written in summary SQL.
---

# Empty-string identity contamination

**Rule:** In every analytics ingestion path, normalize empty/whitespace `sessionId`/`visitorId` to `NULL` before writing, and write anonymous-session guards in summary SQL as `session_id IS NULL OR session_id IN ('anon', '')` (never just `= 'anon'`).

**Why:** The repo's shared zod attr pattern (`z.string().trim().max(N).optional()`) trims but still accepts `""`. JS falsy checks (`input.sessionId && ...`) skip dedupe-key derivation for `""`, yet the raw value still gets stored — so every empty-id row shares the literal value `''`, which summary SQL then treats as ONE real joinable session. Result: unrelated visitors merge into a synthetic shared session, inflating per-session metrics and contaminating cross-phase session joins. Caught by an architect review in the search-intelligence phase; latent in any pipeline reusing the same zod pattern.

**How to apply:**
- At ingestion: `const sessionId = input.sessionId?.trim() ? input.sessionId.trim() : null;` (same for visitorId), and store the normalized value — never `input.sessionId ?? null`.
- In SQL: anon checks must include `''` alongside `'anon'`/NULL, both in positive filters (`NOT IN ('anon','')`) and in per-session CASE grouping (`'row-'||id` fallback).
- Test it: POST events with `sessionId: ""` and `"   "` — attributed-session counts must not move, anonymous diagnostics must increase, and same-slug events must NOT dedupe against each other.
- Older certified pipelines (funnel/revenue) share the zod pattern and were left untouched; if one is ever reopened for edits, apply the same normalization.
