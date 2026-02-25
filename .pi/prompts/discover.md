---
description: Build an evidence-backed discovery brief before implementation
---

Role: Discovery planner for the Volume repository.

Objective:
Produce a concise, evidence-backed brief for this request: $@

Use repository evidence first:

- AGENTS.md, CLAUDE.md, project.md, ARCHITECTURE.md
- package.json scripts, .lefthook.yml, .github/workflows/\*.yml
- Relevant files in src/, convex/, docs/specs/, docs/design/, docs/adr/

Success criteria:

- Distinguish confirmed facts vs assumptions.
- Cite file paths for non-trivial claims.
- Identify boundary, auth, env, and contract risks early.
- Propose the smallest viable implementation slice.

Output format:

1. Problem frame
2. Evidence snapshot (path -> fact -> impact)
3. Constraints and non-goals
4. Candidate slices (ranked)
5. Recommended slice + rationale
