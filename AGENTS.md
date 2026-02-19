# Repository Guidelines

## Project Structure & Module Organization

App router code lives under `src/app`, with shared UI in `src/components/{dashboard,landing,ui}` and domain logic in `src/lib`. Hooks and contexts reside in `src/hooks` and `src/contexts`; tests sit beside the files they cover and reuse `src/test/setup.ts`. Convex backend functions live in `convex/`, while generated artifacts stay inside `convex/_generated`. Use the `@/` alias for `src/` imports.

## Build, Test, and Development Commands

- `bun run dev` runs Next.js and Convex together; use `bun run dev:next` or `bun run dev:convex` when isolating issues.
- `bun run build` creates the production bundle; add `ANALYZE=true bun run build` when you need bundle stats.
- `bun run lint`, `bun run lint:fix`, `bun run typecheck`, and `bun run format:check` enforce ESLint, TypeScript, and Prettier rules.
- `bun run test`, `bun run test:ui`, `bun run test:coverage`, and `bun run test:affected` run Vitest, launch the UI runner, enforce coverage thresholds, and test only affected files.
- `bun run security:audit` and `bun run security:scan` check for vulnerabilities and secrets.
- `bun run quality:check` and `bun run quality:full` run comprehensive quality verification.

## Coding Style & Naming Conventions

Prettier (tab width 2, double quotes, trailing commas) governs formatting, and lint-staged runs Prettier plus `eslint --fix --max-warnings=0` on staged changes. Keep React components in PascalCase files (`ThemeProvider.tsx`), export hooks with `use` prefixes, and co-locate tests or feature-specific styles beside their sources. Tailwind classes should follow the existing layout → spacing → color ordering.

## Testing Guidelines

Vitest with `jsdom` and Testing Library covers unit tests; name suites `<feature>.test.ts[x]` or `<feature>.spec.ts[x]`. Colocate Convex tests inside `convex/` to validate data guards. `bun run test:coverage` enforces 70% minimums for lines, branches, functions, and statements—add focused cases when new logic dips below that bar.

## Commit & Pull Request Guidelines

## Quality Gates

- **Pre-commit hooks**: Fast checks (format, lint, typecheck, security scan, Convex warnings) - run automatically
- **Pre-push hooks**: Comprehensive checks (tests, coverage, build, security audit) - run before sharing code
- **Commit message hooks**: Enforce conventional commit standards
- **Post-checkout hooks**: Regenerate Convex types when Convex files change
- All hooks run in parallel where possible for performance (<30s total for pre-push)

### Configuration Validation

Pre-commit includes automated configuration validation to prevent consistency issues between Lefthook, CI workflows, and related tools:

- **Coverage thresholds**: Must match between verify-coverage.ts and vitest.config.ts
- **Security audit levels**: Must align between Lefthook and GitHub Actions workflows
- **Branch references**: Must reference existing branches in repository
- **Command validity**: All tool commands must use valid CLI flags

### Emergency Bypass

To skip quality gates in emergencies:

```bash
SKIP_QUALITY_GATES=1 git push
```

Use sparingly and document in PR comments when bypassed.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) format, enforced by Lefthook commit-msg hook. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`. Format: `<type>: <description>` (e.g., `fix: restore autofocus on mobile`). Each PR should supply a short summary, link related issues, document schema or environment changes, and include screenshots for UI updates. Lefthook runs quality gates, config validation, and surfaces Convex warnings; rerun `bun run dev` before pushing to ensure both servers stay in sync.

## Release Management

This project uses release-please for automated versioning. When commits merge to `master`, release-please creates/updates a Release PR with changelog and version bump. Merging the Release PR creates a GitHub release with tags. See CLAUDE.md "Release Management" section for detailed workflow.

## Environment & Sync Tips

Store secrets in `.env.local` with Clerk keys and `NEXT_PUBLIC_CONVEX_URL`. After pulling backend updates, run `bunx convex dev` once to regenerate types. The post-checkout hook already reminds you—follow it before testing or reviewing behavior.
