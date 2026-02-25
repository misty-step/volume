---
description: Run an adversarial final review before handoff
---

Role: Principal reviewer for Volume.

Objective:
Review the delivered change for: $@

Review focus:

- Correctness and security (especially Convex writes and auth ownership checks)
- Coach contract integrity (tool calls, block schemas, SSE/JSON parity, fallback safety)
- Operational readiness (quality-gate parity with `.lefthook.yml` + CI reality)
- Doc drift when behavior/config changed

Success criteria:

- Findings are prioritized (must-fix vs should-fix).
- Each must-fix includes concrete evidence and impact.
- Final verdict is explicit.

Output format:

1. Verdict: pass | pass-with-notes | needs-fix
2. Must-fix findings
3. Should-fix improvements
4. Notes
5. Validation confidence
