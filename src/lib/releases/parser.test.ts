/**
 * Changelog Parser Tests
 *
 * Tests for parsing Keep a Changelog format into structured releases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import {
  parseChangelog,
  getReleaseByVersion,
  formatReleaseMarkdown,
} from "./parser";
import type { Release } from "./types";

// Mock fs module
vi.mock("fs");

describe("parseChangelog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a simple changelog with features", () => {
    const changelog = `# Changelog

## [1.0.0](https://github.com/org/repo/compare/v0.9.0...v1.0.0) (2026-01-15)

### Features

* add OAuth login ([#123](https://github.com/org/repo/issues/123)) ([abc1234](https://github.com/org/repo/commit/abc1234))
* basic feature without scope ([#124](https://github.com/org/repo/issues/124))
`;
    vi.mocked(fs.readFileSync).mockReturnValue(changelog);

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({
      version: "1.0.0",
      date: "2026-01-15",
      compareUrl: "https://github.com/org/repo/compare/v0.9.0...v1.0.0",
    });
    expect(releases[0]!.changes).toHaveLength(2);
    expect(releases[0]!.changes[0]).toMatchObject({
      type: "feat",
      description: "add OAuth login",
      pr: 123,
      commit: "abc1234",
      breaking: false,
    });
    expect(releases[0]!.changes[1]).toMatchObject({
      type: "feat",
      description: "basic feature without scope",
      pr: 124,
    });
  });

  it("parses multiple releases", () => {
    const changelog = `# Changelog

## [2.0.0](https://github.com/org/repo/compare/v1.0.0...v2.0.0) (2026-01-20)

### Features

* new feature ([#200](url))

## [1.0.0](https://github.com/org/repo/compare/v0.9.0...v1.0.0) (2026-01-15)

### Bug Fixes

* fix something ([#100](url))
`;
    vi.mocked(fs.readFileSync).mockReturnValue(changelog);

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases).toHaveLength(2);
    expect(releases[0]!.version).toBe("2.0.0");
    expect(releases[1]!.version).toBe("1.0.0");
  });

  it("parses all change types", () => {
    const changelog = `# Changelog

## [1.0.0](https://github.com/org/repo/compare/v0.9.0...v1.0.0) (2026-01-15)

### Features

* new feature

### Bug Fixes

* fix bug

### Performance Improvements

* improve speed

### Refactoring

* refactor code

### Documentation

* update docs

### Maintenance

* chore update
`;
    vi.mocked(fs.readFileSync).mockReturnValue(changelog);

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases[0]!.changes).toHaveLength(6);
    expect(releases[0]!.changes.map((c) => c.type)).toEqual([
      "feat",
      "fix",
      "perf",
      "refactor",
      "docs",
      "chore",
    ]);
  });

  it("parses version without URL (simple format)", () => {
    const changelog = `# Changelog

## 1.0.0 (2026-01-02)

### Features

* initial release
`;
    vi.mocked(fs.readFileSync).mockReturnValue(changelog);

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases).toHaveLength(1);
    expect(releases[0]!.version).toBe("1.0.0");
    expect(releases[0]!.date).toBe("2026-01-02");
    // compareUrl may be undefined for simple format
  });

  it("handles breaking changes with exclamation mark", () => {
    const changelog = `# Changelog

## [2.0.0](https://github.com/org/repo/compare/v1.0.0...v2.0.0) (2026-01-20)

### Features

* ! remove deprecated API
`;
    vi.mocked(fs.readFileSync).mockReturnValue(changelog);

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases[0]!.changes).toHaveLength(1);
    expect(releases[0]!.changes[0]!.breaking).toBe(true);
    expect(releases[0]!.changes[0]!.description).toBe("remove deprecated API");
  });

  it("handles breaking changes with BREAKING CHANGE prefix", () => {
    const changelog = `# Changelog

## [2.0.0](https://github.com/org/repo/compare/v1.0.0...v2.0.0) (2026-01-20)

### Features

* BREAKING CHANGE: new required param
`;
    vi.mocked(fs.readFileSync).mockReturnValue(changelog);

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases[0]!.changes).toHaveLength(1);
    expect(releases[0]!.changes[0]!.breaking).toBe(true);
    expect(releases[0]!.changes[0]!.description).toBe("new required param");
  });

  it("handles empty changelog", () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      "# Changelog\n\nNo releases yet."
    );

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases).toHaveLength(0);
  });

  it("ignores unknown section headers", () => {
    const changelog = `# Changelog

## [1.0.0](https://github.com/org/repo/compare/v0.9.0...v1.0.0) (2026-01-15)

### Unknown Section

* this should be ignored

### Features

* valid feature
`;
    vi.mocked(fs.readFileSync).mockReturnValue(changelog);

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases[0]!.changes).toHaveLength(1);
    expect(releases[0]!.changes[0]!.type).toBe("feat");
  });

  it("handles entries without PR numbers", () => {
    const changelog = `# Changelog

## [1.0.0](https://github.com/org/repo/compare/v0.9.0...v1.0.0) (2026-01-15)

### Features

* simple feature without links
`;
    vi.mocked(fs.readFileSync).mockReturnValue(changelog);

    const releases = parseChangelog("/path/to/CHANGELOG.md");

    expect(releases[0]!.changes[0]).toMatchObject({
      type: "feat",
      description: "simple feature without links",
      pr: undefined,
      commit: undefined,
    });
  });
});

describe("getReleaseByVersion", () => {
  const releases: Release[] = [
    { version: "2.0.0", date: "2026-01-20", changes: [] },
    { version: "1.0.0", date: "2026-01-15", changes: [] },
  ];

  it("finds release by exact version", () => {
    const result = getReleaseByVersion(releases, "1.0.0");
    expect(result?.version).toBe("1.0.0");
  });

  it("handles v prefix", () => {
    const result = getReleaseByVersion(releases, "v2.0.0");
    expect(result?.version).toBe("2.0.0");
  });

  it("returns undefined for non-existent version", () => {
    const result = getReleaseByVersion(releases, "9.9.9");
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty releases array", () => {
    const result = getReleaseByVersion([], "1.0.0");
    expect(result).toBeUndefined();
  });
});

describe("formatReleaseMarkdown", () => {
  it("formats release with grouped changes", () => {
    const release: Release = {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        { type: "feat", description: "new feature", breaking: false },
        { type: "fix", description: "bug fix", breaking: false },
        {
          type: "feat",
          scope: "ui",
          description: "another feature",
          breaking: false,
        },
      ],
    };

    const result = formatReleaseMarkdown(release);

    expect(result).toContain("### Features");
    expect(result).toContain("- new feature");
    expect(result).toContain("- **ui:** another feature");
    expect(result).toContain("### Bug Fixes");
    expect(result).toContain("- bug fix");
  });

  it("includes breaking change marker", () => {
    const release: Release = {
      version: "2.0.0",
      date: "2026-01-20",
      changes: [
        { type: "feat", description: "breaking feature", breaking: true },
      ],
    };

    const result = formatReleaseMarkdown(release);

    expect(result).toContain("⚠️ breaking feature");
  });

  it("handles empty release", () => {
    const release: Release = {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [],
    };

    const result = formatReleaseMarkdown(release);

    expect(result.trim()).toBe("");
  });

  it("orders change types correctly", () => {
    const release: Release = {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        { type: "chore", description: "maintenance", breaking: false },
        { type: "feat", description: "feature", breaking: false },
        { type: "fix", description: "fix", breaking: false },
      ],
    };

    const result = formatReleaseMarkdown(release);
    const featIndex = result.indexOf("### Features");
    const fixIndex = result.indexOf("### Bug Fixes");
    const choreIndex = result.indexOf("### Maintenance");

    // Features should come before fixes, fixes before maintenance
    expect(featIndex).toBeLessThan(fixIndex);
    expect(fixIndex).toBeLessThan(choreIndex);
  });

  it("handles all change types", () => {
    const release: Release = {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        { type: "feat", description: "feature", breaking: false },
        { type: "fix", description: "fix", breaking: false },
        { type: "perf", description: "performance", breaking: false },
        { type: "refactor", description: "refactor", breaking: false },
        { type: "docs", description: "docs", breaking: false },
        { type: "chore", description: "chore", breaking: false },
      ],
    };

    const result = formatReleaseMarkdown(release);

    expect(result).toContain("### Features");
    expect(result).toContain("### Bug Fixes");
    expect(result).toContain("### Performance");
    expect(result).toContain("### Refactoring");
    expect(result).toContain("### Documentation");
    expect(result).toContain("### Maintenance");
  });
});
