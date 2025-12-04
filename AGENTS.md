# Repository Guidelines

## Project Structure & Module Organization

App router code lives under `src/app`, with shared UI in `src/components/{dashboard,landing,ui}` and domain logic in `src/lib`. Hooks and contexts reside in `src/hooks` and `src/contexts`; tests sit beside the files they cover and reuse `src/test/setup.ts`. Convex backend functions live in `convex/`, while generated artifacts stay inside `convex/_generated`. Use the `@/` alias for `src/` imports.

## Build, Test, and Development Commands

- `pnpm dev` runs Next.js and Convex together; use `pnpm dev:next` or `pnpm dev:convex` when isolating issues.
- `pnpm build` creates the production bundle; add `ANALYZE=true pnpm build` when you need bundle stats.
- `pnpm lint`, `pnpm typecheck`, and `pnpm format:check` enforce ESLint, TypeScript, and Prettier rules.
- `pnpm test`, `pnpm test:ui`, and `pnpm test:coverage` run Vitest, launch the UI runner, and enforce coverage thresholds.

## Coding Style & Naming Conventions

Prettier (tab width 2, double quotes, trailing commas) governs formatting, and lint-staged runs Prettier plus `eslint --fix --max-warnings=0` on staged changes. Keep React components in PascalCase files (`ThemeProvider.tsx`), export hooks with `use` prefixes, and co-locate tests or feature-specific styles beside their sources. Tailwind classes should follow the existing layout → spacing → color ordering.

## Testing Guidelines

Vitest with `jsdom` and Testing Library covers unit tests; name suites `<feature>.test.ts[x]` or `<feature>.spec.ts[x]`. Colocate Convex tests inside `convex/` to validate data guards. `pnpm test:coverage` enforces 70% minimums for lines, branches, functions, and statements—add focused cases when new logic dips below that bar.

## Commit & Pull Request Guidelines

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) format, enforced by commitlint git hook. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`. Format: `<type>: <description>` (e.g., `fix: restore autofocus on mobile`). Each PR should supply a short summary, link related issues, document schema or environment changes, and include screenshots for UI updates. Husky runs lint-staged on commit and surfaces Convex warnings; rerun `pnpm dev` before pushing to ensure both servers stay in sync.

## Release Management

This project uses release-please for automated versioning. When commits merge to `master`, release-please creates/updates a Release PR with changelog and version bump. Merging the Release PR creates a GitHub release with tags. See CLAUDE.md "Release Management" section for detailed workflow.

## Environment & Sync Tips

Store secrets in `.env.local` with Clerk keys and `NEXT_PUBLIC_CONVEX_URL`. After pulling backend updates, run `pnpm convex dev` once to regenerate types. The post-checkout hook already reminds you—follow it before testing or reviewing behavior.
