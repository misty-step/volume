---
name: demo
description: |
  Generate demo artifacts: screenshots, GIF walkthroughs, video recordings,
  polished launch videos with narration and music. From raw evidence to
  shipped media. Also handles PR evidence upload via draft releases.
  Use when: "make a demo", "generate demo", "record walkthrough", "launch video",
  "PR evidence", "upload screenshots", "demo artifacts", "make a video",
  "demo this feature", "create a walkthrough", "scaffold demo",
  "generate demo skill".
  Trigger: /demo.
argument-hint: "[evidence-dir|feature|scaffold] [--format gif|video|launch] [upload]"
---

# /demo

Volume-flavored demo artifacts for PR evidence and launch media. Either runs
the capture pipeline or scaffolds a new Volume-local sub-skill for a repeatable
flow.

## Execution Stance

You are the executive orchestrator.

- Keep shot selection, evidence sufficiency, and final artifact approval on the lead model.
- Delegate planning, capture, and critique to separate focused subagents.
- Use a cold reviewer for final quality judgment.
- Never self-grade a Volume capture — the lead model drove the flow and is biased.

## Routing

| Intent                                 | Action                                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "scaffold demo", "generate demo skill" | Scaffold a Volume sub-skill only when the flow justifies a repeatable recipe; do **not** duplicate `.agents/skills/volume-manual-qa` — extend it instead |
| Run demo for a PR                      | Use the PR-evidence recipe below                                                                                                                         |
| Launch video / public asset            | Use the launch pipeline below                                                                                                                            |
| One-off capture                        | Use the quick protocol below                                                                                                                             |

If the first argument is `scaffold`, confirm the new surface is not already
covered by `volume-manual-qa` before generating anything.

## Golden Flows (Volume)

Drive one of these; every "after" frame pairs with a "before":

- **Quick-log a set** — `src/app/(app)/page.tsx` dashboard -> `convex/sets.ts:logSet`
- **Exercise create -> delete -> re-create** — soft-delete auto-restore (ADR-0002)
- **Coach composer chat** — `src/lib/coach/` (OpenRouter via AI SDK v6; `ModelMessage[]` history)
- **Paywall trigger** — `PaywallGate` + `getSubscriptionStatus` (ADR-0006)
- **Clerk sign-in** — use a test account only
- **History view with soft-deleted toggle** — pass `includeDeleted: true`

## PR-Evidence Recipe

### Workflow: Planner -> Implementer -> Critic

Each phase is a **separate subagent**. The critic inspects artifacts cold
(no context from the implementer).

1. **Plan:** Identify the feature delta, build a shot list, pick a golden flow above, choose capture method.
2. **Boot:** `bun run dev` (Next + Convex + Stripe webhook forwarding) against `http://localhost:3000`.
3. **Auth:** Sign in with a Clerk test user — credentials/fixtures in `e2e/clerk-helpers.ts` and `e2e/auth-fixture.ts`. Never a real account.
4. **Capture:** Drive Chrome via Claude-in-Chrome MCP — navigate, find element, click/type, assert, `mcp__claude-in-chrome__upload_image` or `mcp__claude-in-chrome__gif_creator`. Use `mcp__claude-in-chrome__read_console_messages` to snapshot app state / errors alongside visuals.
5. **Stage locally:** scratch under `/tmp/volume-demo-$(date -u +%Y%m%d)/`; promote keepers into `walkthrough/` at repo root (existing pattern — see `walkthrough/coach-tool-registry.md`, `walkthrough/reviewer-evidence.md`).
6. **Critique:** Fresh subagent validates source, pairing, delta, coverage, design invariants (below).
7. **Upload:** `gh release create evidence-pr-<N>-$(date -u +%Y%m%d%H%M%S) --draft --notes "Evidence for PR #<N>" <files>`
8. **Link:** paste the draft-release URL into the PR body. `/settle` attaches; `/deliver` consumes the receipt.

Test artifacts (`playwright-report/`, `test-results/`) are gitignored — reference them, never commit them.

### FFmpeg quick reference

```bash
# WebM -> GIF (800px, 8fps, 128 colors). Keep GIFs under 15MB.
ffmpeg -y -i input.webm \
  -vf "fps=8,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
  -loop 0 output.gif
```

## Launch Video Pipeline

Public-facing, narrated, music-bedded.

- Storyboard: landing -> quick-log -> coach interaction -> insights view.
- Capture at 1x on `https://volume.fitness`.
- Shoot both light **and** dark themes (system mode counts as one variant). Include at least one notch-showing device frame so the safe-area-inset-top wordmark reads correctly.
- Respect tokens from `DESIGN_SYSTEM.md` for any overlay captions.
- Final output: `walkthrough/launch-$(date -u +%Y%m%d).mp4`. Coordinate framing with `docs/agentic-rebuild-vision.md` and `/groom`.

## Design Invariants on Captured Assets

The critic subagent rejects any frame that violates these:

- Light **and** dark themes shown in any reel (system auto acceptable as one).
- Zero emojis in UI or captions — verbal narration only.
- Wordmark notch-safe (`env(safe-area-inset-top)`).
- Accent color **only** on data numbers, trend peaks, totals, 1–2 hero keywords.
- No single-side border on rounded cards.
- Coach blocks use the flush-block aesthetic: zero gap, radius ≤ 4px.

## Anti-Patterns

- Real user data in frame — always a Clerk test account.
- Unredacted secrets (`__session` cookie, `sk_test_…`, OpenRouter keys, Convex tokens) in URL bar, headers, or console output.
- GIFs larger than 15MB — drop FPS or frames.
- Hyperbolic narration ("users love this") — show the delta, don't tell.
- Scaffolding a new `demo-scaffold` skill that shadows `volume-manual-qa`.
- Default-state captures. A frame of the empty dashboard proves nothing.

## Gotchas

- If `bun run dev` Stripe forwarding isn't running, paywall demos will look
  frozen mid-checkout — confirm `stripe login` first.
- Convex dev deployment is personal — do **not** film with prod data
  (`prod:whimsical-marten-631`). Local only.
- `/deliver` expects a scaffolded Volume skill for recurring flows. If it
  invokes `/demo` and falls through to this one-off path, scaffold the
  recipe for next time.
- Self-grading is worthless. Always hand off to a cold critic subagent.
