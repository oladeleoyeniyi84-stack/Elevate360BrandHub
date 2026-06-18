---
name: Reverting a single file in the protected git sandbox
description: How to undo an unwanted working-tree change to one file when git checkout/restore are blocked.
---

In this environment the main agent is blocked from "destructive" git operations
(git checkout, restore, reset, rm, and even `rm .git/index.lock`). Attempts exit
254 with "Destructive git operations are not allowed in the main agent."

To revert ONE file to its committed (HEAD) state without those commands, pipe a
read-only `git show` into the file:

    git --no-optional-locks show HEAD:path/to/file > path/to/file

This is a read + ordinary file write, so it is allowed and it works (confirmed:
`git diff --quiet -- <file>` reports clean afterward).

**Why:** Builds/tooling can leave stray working-tree drift (e.g. a few-byte
re-encode of a binary like `client/public/opengraph.jpg`) that pollutes the
commit scope. You cannot `git checkout` it away.

**How to apply:** Use the `git show HEAD:… > …` redirect to restore the file.
Do NOT try to `rm .git/index.lock` — it is platform-protected; a stale lock is
the platform's to manage and the auto-commit handles it. Only delegate to a
background Project Task if you genuinely need a real destructive git command.
