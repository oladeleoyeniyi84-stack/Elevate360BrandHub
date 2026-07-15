---
name: Unbounded analytics table reads cause prod OOM
description: Capture/analytics tables grow forever in prod; full-table loads into Node memory trigger Render memory-limit events.
---

**Rule:** Never load a whole capture/analytics table (page_views, click_events, chat_conversations, orders, subscribers, contacts) into Node memory. Reads must be date-bounded with a hard row LIMIT, and totals/counts must come from SQL (`count(*) FILTER (WHERE …)`), never from `rows.length`.

**Why:** July 2026 — Render (prod) hit a memory-limit event. `page_views` grows one row per visitor page load; a full-table `SELECT` was called from 5 places (dashboard analytics, digest, growth jobs, ops telemetry, SEO aggregation), each materializing the entire table. Dev DB is tiny so the problem is invisible in dev.

**How to apply:** When adding any analytics/aggregation feature, check the storage method it calls: if there's no `WHERE created_at >=` bound and no `LIMIT`, fix it first. Prefer SQL GROUP BY/COUNT aggregation over in-JS filtering. When a query filters/sorts a big table on a column, ensure an index exists (created via idempotent bootstrap script, not db:push). Bound with DESC ordering so a binding cap drops the oldest rows.

**Residual risk (as of July 2026):** chat_conversations (fat jsonb message arrays), contact_messages, newsletter_subscribers, orders are still loaded whole in digest/growth/ops paths — bound these if memory pressure recurs.
