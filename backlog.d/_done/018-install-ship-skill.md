# Install ship skill into the local harness

Priority: medium
Status: done
Estimate: S

## Goal

Make the upstream Spellbook `/ship` skill available in Volume's repo-local
harness so the local skill layer, harness docs, and Codex skill discovery all
agree on the same installed workflow set.

## Non-Goals

- Changing `/settle`, `/yeet`, `/deploy`, or `/flywheel` behavior
- Adding new shipping automation beyond installing the existing skill

## Oracle

- [x] [behavioral] `.agents/skills/ship/SKILL.md` exists and defines the `/ci` + `/refactor` + `/code-review` quality triad
- [x] [behavioral] Repo-local harness docs mention `/ship` as an installed outer-loop skill
- [x] [behavioral] Codex repo config can discover the local `ship` skill

## Notes

On 2026-04-23 the upstream Spellbook checkout already contained
`skills/ship/SKILL.md`, but Volume's local skill root did not. The initial local
install also missed the repo's Codex skill registry, so the skill was present on
disk but not fully discoverable through the harness.

The first installed copy also carried the older "assume `/settle` already made it
merge-ready" contract. Owner intent is that `/ship` owns the final repeated
quality triad: `/ci`, `/refactor`, and `/code-review` run in parallel subagents
until the branch is lean, green, clean, and shiny, then `/ship` squash-merges and
runs `/reflect`.

## Touchpoints

- `.agents/skills/ship/`
- `.codex/config.toml`
- `AGENTS.md`
- `.spellbook/repo-brief.md`

## What Was Built

- Installed the upstream Spellbook `ship` skill into `.agents/skills/ship/`.
- Added a local `.spellbook` marker so the skill is tracked as a managed repo
  primitive.
- Registered the skill in `.codex/config.toml`.
- Updated harness docs to include `/ship` in the local outer-loop skill index.
- Revised the `/ship` contract so it owns the repeated quality triad before
  squash merge and `/reflect`.
