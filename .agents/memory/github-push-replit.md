---
name: GitHub push from Replit
description: How to push to GitHub when Replit's git askpass helper blocks or times out
---

Replit's `replit-git-askpass` helper intercepts git credential prompts and causes pushes to GitHub to either hang (timeout) or fail with "unable to read askpass response". LFS lock verification also triggers a secondary auth failure.

**The working push command:**
```bash
GIT_ASKPASS="" GIT_TERMINAL_PROMPT=0 \
git -c lfs.locksverify=false \
    -c credential.helper="" \
    push "https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/Spinoza789/UpdateSP.git" main --force
```

**Why:** Bypassing `GIT_ASKPASS` and `credential.helper` stops Replit from intercepting credentials. Embedding the token directly in the URL provides auth. Disabling `lfs.locksverify` prevents LFS from triggering a second broken auth flow.

**How to apply:** Any time `git push origin` hangs or fails with askpass/LFS errors in this Replit environment. Use `--force-with-lease` when possible, but if tracking info is stale after a rebase, use `--force`.

**NOTE on push auth:** `https://TOKEN@github.com` (token-as-username) fails with "Password authentication is not supported". Use `https://Spinoza789:TOKEN@github.com` (real username + PAT as password). If the PAT lacks push scope, the user must push via the Replit Git pane with their own credentials.

**Rebase/merge conflicts:** The conflict is always the auto-generated `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`. Do NOT hand-pick a side — regenerate it deterministically from the filesystem (replicate `mockupPreviewPlugin.ts`: glob `src/components/mockups/**/*.tsx`, ignore `_`-prefixed paths, same output format), or just restart the mockup-sandbox workflow (its buildStart regenerates the file). That yields the de-duplicated, correct version.

## Transient checkpoint locks

A `.git/index.lock` error alone does not establish that the lock is stale. During ordinary staging and commits, allow background Git/checkpoint work to finish and retry after doing other useful work. Do not remove a live lock or bypass a tool's write protections.

**Why:** Repeated lock errors cleared on the next ordinary attempt without deleting any lock. Treating these as stale would risk colliding with active checkpoint writes.

**How to apply:** For an isolated lock failure, retry later. If it persists, inspect active Git work and follow the filesystem-and-git-cleanup guidance before considering recovery. A zero-byte lock is not sufficient evidence that its owner has stopped.
