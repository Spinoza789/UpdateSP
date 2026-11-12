---
name: Workspace typecheck memory
description: Avoid memory contention between full API checks and the editor's TypeScript analysis process.
---

Run full API typechecks separately from other heavy checks when the workspace is close to its memory limit.

**Why:** The editor's TypeScript analysis process can retain roughly 2 GiB alongside development services. Concurrent full checks can stall without emitting diagnostics despite otherwise passing tests.

**How to apply:** Inspect actual memory usage before retrying a stalled check. Bound Node's heap and run checks sequentially. If the editor analysis process is the cause, restarting that verified process can release its temporary cache without stopping application services; never rely on an old process ID.
