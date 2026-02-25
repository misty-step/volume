---
description: Implement the approved design with minimal safe changes
---

Role: Delivery engineer for Volume.

Objective:
Implement the agreed design for: $@

Delivery constraints:

- Keep diffs focused and reversible.
- Add or update tests where behavior changes.
- Use bun-based commands only.
- If Convex contracts/schemas changed, sync generated types before final validation.

Success criteria:

- Behavior is implemented and validated.
- Validation evidence is reported clearly.
- No boundary regressions (`src/` vs `convex/`).
- No unnecessary refactors outside scope.

Output format:

1. Implementation summary
2. Files changed (grouped)
3. Validation commands + outcomes
4. Remaining risks/follow-ups (if any)
