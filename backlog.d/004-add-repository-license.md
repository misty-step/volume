# Add repository license

Priority: high
Status: done
Estimate: S

## Goal

Add an explicit repository license so documentation reaches a basic legal baseline.

## Non-Goals

- Debate commercialization strategy in the implementation diff
- Rewrite contributor or security docs beyond what the chosen license requires

## Oracle

- [ ] [behavioral] A root `LICENSE` or `LICENSE.md` file exists
- [ ] [behavioral] The chosen license matches owner intent

## Notes

Owner selected MIT on 2026-04-23. The readiness review found no `LICENSE*`
file in the repository.

## Touchpoints

- `LICENSE`
- `README.md`

## What Was Built

- Added a root MIT `LICENSE` file.
- Declared `license: MIT` in `package.json`.
- Linked the license from `README.md`.
