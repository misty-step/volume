# Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) to:

- gate PRs with change intent files
- generate `CHANGELOG.md` and bump package versions on release PR merge
- tag releases without publishing to npm

Basic flow:

1. For any code change, run `pnpm changeset` and pick patch/minor/major. This writes a markdown file under `.changeset/`.
2. When ready to cut a release, merge the automatically opened "Release" PR (created by the CI workflow).
3. CI runs `pnpm changeset version` to bump `package.json` and update changelog, then `pnpm changeset tag` to create git tags.

Defaults:

- Base branch: `master`
- Access: `restricted` (no npm publish)
- Changelog formatter: `@changesets/changelog-git`
