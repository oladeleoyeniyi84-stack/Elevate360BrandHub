---
name: Synthetic test-data accumulation breaks top-N assertions
description: Why repeated live-suite runs eventually flake on top-10 list checks and detector caps
---
Rule: live test suites that insert synthetic rows (sil-camp-* campaigns, elevate360-* fixture queries) accumulate across runs and eventually (a) push the current run's row out of top-10 lists via count-1 ties and (b) exhaust per-detector generation caps so new fixtures never surface.

**Why:** Phase 72.4 "topCampaigns includes test campaign" flaked after ~10 runs; Phase 72.5 detectors initially missed seeded queries because older 400-impression fixtures filled the 5-per-detector cap.

**How to apply:** make selection deterministic (ORDER BY volume DESC before capping), seed test fixtures with magnitudes that dominate leftovers, and when a top-N check flakes, first check for leftover synthetic rows (`... LIKE 'sil-camp-%'`, `phase725%`) and delete them rather than debugging product code.
