# Local Skills

Canonical local skills live in this directory: `.agents/skills`.

Why:

- Agent-agnostic source of truth.
- Reusable across Codex, Claude, and other assistants.
- Avoids duplicating skill content per tool.

Layout:

- `name/SKILL.md` - skill instructions and workflow
- `name/scripts/*` - optional runnable helpers
- `name/references/*` - optional checklists/specs

Adapter strategy:

- Keep this directory canonical.
- Point agent-specific folders to it (symlink or sync), e.g. `.claude/skills`.
