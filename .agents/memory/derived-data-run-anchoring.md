---
name: Derived-data generation anchored to successful run window
description: How generators reading shared daily tables must isolate the last successful import
---
Rule: any generator that derives recommendations/aggregates from shared daily tables (e.g. GSC daily rows) must anchor its date windows on the newest SUCCESSFUL sync run's own `end_date`, and hard-gate (early return) when no success run exists.

**Why:** daily tables have no per-row run provenance — a newer partial/error import writes later-dated rows that would silently leak into "latest data" windows (MAX(date) anchoring). Architect flagged this as a blocking defect in the growth-actions generator.

**How to apply:** select the run row (status='success', newest), use its end_date as the window anchor; later-dated rows fall outside every window. Keep a poison-row regression test (insert newer error run + later-dated row, assert no output derives from it). Also: make founder/state transitions a status-conditioned compare-and-swap UPDATE (0 rows → re-read → 409), never read-then-write.
