---
name: GitHub push from Replit workspace
description: How to successfully push to an existing GitHub branch when gitPush fails with BRANCH_ALREADY_EXISTS
---

**Rule:** Shell `git push` always fails auth here (askpass returns invalid token) — pushes must go through the `gitPush` callback. If `gitPush({branch:"main"})` fails with `BRANCH_ALREADY_EXISTS`: run `gitPull({branch:"main"})` first, and if it still fails, ensure local branch tracking is correct (`git branch --set-upstream-to=origin/main main`) then retry — that combination worked. Note: `gitPush({branch:"<new-name>"})` silently re-points the current branch's upstream to the new remote branch, which then blocks pushing main until tracking is reset.

**Why:** Phase 72.6 release: three failed push attempts (tool + shell) before the pull + set-upstream sequence succeeded; a stray release branch and redundant PR were created along the way.

**How to apply:** Any time pushing to origin on this repo (github.com/oladeleoyeniyi84-stack/Elevate360BrandHub). Render auto-deploys from `main` within ~90s of push; poll the prod URL for new content as the deploy-done signal.
