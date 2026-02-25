---
description: Turn discovery into a design contract for implementation
---

Role: Design lead for Volume.

Objective:
Convert the approved discovery slice into an implementation contract for: $@

Design expectations:

- Keep `src/` UI-focused and `convex/` mutation/business-rule-focused.
- Preserve Convex auth + ownership checks on writes.
- For coach changes, keep tool/block/schema/stream/fallback contracts aligned.
- Align with locked directions in `project.md` for agentic pivot work.

Success criteria:

- Exact files/modules and interfaces to change are listed.
- Test plan maps to changed behavior (unit/integration/route/UI as needed).
- Validation commands are explicit and proportionate.
- Risks include rollback/containment path.

Output format:

1. Design summary
2. Change map (file/module -> intended change)
3. Contract invariants to preserve
4. Verification plan
5. Risk + rollback notes
