/**
 * Release Loader Tests
 *
 * Tests for loading pre-generated release content from disk.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import {
  loadManifest,
  loadRelease,
  loadAllReleases,
  getAllVersions,
} from "./loader";
import type { ReleaseManifest, Release } from "./types";

// Mock fs module
vi.mock("fs");

describe("loadManifest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when manifest does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = loadManifest();

    expect(result).toBeNull();
  });

  it("loads and parses manifest.json", () => {
    const manifest: ReleaseManifest = {
      latest: "1.8.0",
      versions: ["1.8.0", "1.7.0", "1.6.0"],
      generatedAt: "2026-01-15T10:00:00Z",
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

    const result = loadManifest();

    expect(result).toEqual(manifest);
  });
});

describe("loadRelease", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when changelog.json does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = loadRelease("1.8.0");

    expect(result).toBeNull();
  });

  it("returns null when notes.md does not exist", () => {
    // First call for changelog.json exists, second call for notes.md doesn't
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      return String(path).includes("changelog.json");
    });

    const result = loadRelease("1.8.0");

    expect(result).toBeNull();
  });

  it("loads release with product notes", () => {
    const release: Release = {
      version: "1.8.0",
      date: "2026-01-15",
      changes: [{ type: "feat", description: "new feature", breaking: false }],
    };
    const notes = "# Release 1.8.0\n\nAwesome new features!";

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (String(path).includes("changelog.json")) {
        return JSON.stringify(release);
      }
      return notes;
    });

    const result = loadRelease("1.8.0");

    expect(result).toEqual({
      ...release,
      productNotes: notes,
    });
  });

  it("normalizes version with v prefix", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      // Verify the path contains v-prefixed version
      expect(String(path)).toContain("v1.8.0");
      if (String(path).includes("changelog.json")) {
        return JSON.stringify({
          version: "1.8.0",
          date: "2026-01-15",
          changes: [],
        });
      }
      return "Notes";
    });

    loadRelease("1.8.0");
  });

  it("handles version already with v prefix", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      // Should still have v prefix (not vv1.8.0)
      expect(String(path)).toContain("v1.8.0");
      expect(String(path)).not.toContain("vv");
      if (String(path).includes("changelog.json")) {
        return JSON.stringify({
          version: "1.8.0",
          date: "2026-01-15",
          changes: [],
        });
      }
      return "Notes";
    });

    loadRelease("v1.8.0");
  });
});

describe("loadAllReleases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array when no manifest", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = loadAllReleases();

    expect(result).toEqual([]);
  });

  it("loads all releases from manifest", () => {
    const manifest: ReleaseManifest = {
      latest: "1.1.0",
      versions: ["1.1.0", "1.0.0"],
      generatedAt: "2026-01-15",
    };

    const release1: Release = {
      version: "1.1.0",
      date: "2026-01-15",
      changes: [],
    };
    const release2: Release = {
      version: "1.0.0",
      date: "2026-01-01",
      changes: [],
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      const pathStr = String(path);
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("v1.1.0") && pathStr.includes("changelog.json")) {
        return JSON.stringify(release1);
      }
      if (pathStr.includes("v1.0.0") && pathStr.includes("changelog.json")) {
        return JSON.stringify(release2);
      }
      return "Notes for release";
    });

    const result = loadAllReleases();

    expect(result).toHaveLength(2);
    expect(result[0]!.version).toBe("1.1.0");
    expect(result[1]!.version).toBe("1.0.0");
  });

  it("filters out releases that fail to load", () => {
    const manifest: ReleaseManifest = {
      latest: "1.1.0",
      versions: ["1.1.0", "1.0.0"],
      generatedAt: "2026-01-15",
    };

    vi.mocked(fs.existsSync).mockImplementation((path) => {
      const pathStr = String(path);
      // Only v1.1.0 exists
      if (pathStr.includes("manifest.json")) return true;
      if (pathStr.includes("v1.1.0")) return true;
      return false;
    });
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      const pathStr = String(path);
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("changelog.json")) {
        return JSON.stringify({
          version: "1.1.0",
          date: "2026-01-15",
          changes: [],
        });
      }
      return "Notes";
    });

    const result = loadAllReleases();

    expect(result).toHaveLength(1);
    expect(result[0]!.version).toBe("1.1.0");
  });
});

describe("getAllVersions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array when no manifest", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = getAllVersions();

    expect(result).toEqual([]);
  });

  it("returns all versions from manifest", () => {
    const manifest: ReleaseManifest = {
      latest: "1.8.0",
      versions: ["1.8.0", "1.7.0", "1.6.0"],
      generatedAt: "2026-01-15",
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

    const result = getAllVersions();

    expect(result).toEqual(["1.8.0", "1.7.0", "1.6.0"]);
  });
});
