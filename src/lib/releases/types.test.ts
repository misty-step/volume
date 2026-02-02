/**
 * Release Types Tests
 *
 * Tests for release system type exports and constants.
 */

import { describe, it, expect } from "vitest";
import { CHANGE_TYPE_LABELS, CHANGE_TYPE_ORDER } from "./types";
import type { ChangeType, ChangelogEntry, Release } from "./types";

describe("CHANGE_TYPE_LABELS", () => {
  it("has labels for all change types", () => {
    const expectedTypes: ChangeType[] = [
      "feat",
      "fix",
      "perf",
      "refactor",
      "docs",
      "chore",
      "style",
      "test",
    ];

    for (const type of expectedTypes) {
      expect(CHANGE_TYPE_LABELS[type]).toBeDefined();
      expect(typeof CHANGE_TYPE_LABELS[type]).toBe("string");
    }
  });

  it("has human-readable labels", () => {
    expect(CHANGE_TYPE_LABELS.feat).toBe("New Features");
    expect(CHANGE_TYPE_LABELS.fix).toBe("Bug Fixes");
    expect(CHANGE_TYPE_LABELS.perf).toBe("Performance");
    expect(CHANGE_TYPE_LABELS.refactor).toBe("Refactoring");
    expect(CHANGE_TYPE_LABELS.docs).toBe("Documentation");
    expect(CHANGE_TYPE_LABELS.chore).toBe("Maintenance");
    expect(CHANGE_TYPE_LABELS.style).toBe("Styling");
    expect(CHANGE_TYPE_LABELS.test).toBe("Testing");
  });
});

describe("CHANGE_TYPE_ORDER", () => {
  it("contains all change types", () => {
    const allTypes: ChangeType[] = [
      "feat",
      "fix",
      "perf",
      "refactor",
      "docs",
      "chore",
      "style",
      "test",
    ];

    for (const type of allTypes) {
      expect(CHANGE_TYPE_ORDER).toContain(type);
    }
  });

  it("has user-facing types first (feat, fix)", () => {
    const featIndex = CHANGE_TYPE_ORDER.indexOf("feat");
    const fixIndex = CHANGE_TYPE_ORDER.indexOf("fix");
    const choreIndex = CHANGE_TYPE_ORDER.indexOf("chore");

    expect(featIndex).toBeLessThan(choreIndex);
    expect(fixIndex).toBeLessThan(choreIndex);
  });

  it("has no duplicate entries", () => {
    const unique = new Set(CHANGE_TYPE_ORDER);
    expect(unique.size).toBe(CHANGE_TYPE_ORDER.length);
  });
});

describe("type contracts", () => {
  it("ChangelogEntry has required fields", () => {
    const entry: ChangelogEntry = {
      type: "feat",
      description: "Test feature",
    };

    expect(entry.type).toBe("feat");
    expect(entry.description).toBe("Test feature");
  });

  it("ChangelogEntry supports optional fields", () => {
    const entry: ChangelogEntry = {
      type: "feat",
      description: "Test feature",
      scope: "auth",
      pr: 123,
      commit: "abc1234",
      breaking: true,
    };

    expect(entry.scope).toBe("auth");
    expect(entry.pr).toBe(123);
    expect(entry.commit).toBe("abc1234");
    expect(entry.breaking).toBe(true);
  });

  it("Release has required fields", () => {
    const release: Release = {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [],
    };

    expect(release.version).toBe("1.0.0");
    expect(release.date).toBe("2026-01-15");
    expect(release.changes).toEqual([]);
  });

  it("Release supports optional compareUrl", () => {
    const release: Release = {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [],
      compareUrl: "https://github.com/org/repo/compare/v0.9.0...v1.0.0",
    };

    expect(release.compareUrl).toBe(
      "https://github.com/org/repo/compare/v0.9.0...v1.0.0"
    );
  });
});
