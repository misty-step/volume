import { describe, expect, it } from "vitest";
import {
  buildAffectedVitestArgs,
  selectAffectedBaseRef,
} from "./test-affected";

describe("selectAffectedBaseRef", () => {
  it("prefers origin/master when available", () => {
    expect(selectAffectedBaseRef(["master", "origin/master"])).toBe(
      "origin/master"
    );
  });

  it("falls back to master when origin/master is unavailable", () => {
    expect(selectAffectedBaseRef(["master"])).toBe("master");
  });

  it("returns null when no base ref is available", () => {
    expect(selectAffectedBaseRef(["develop"])).toBeNull();
  });
});

describe("buildAffectedVitestArgs", () => {
  it("uses related mode when changed files are provided", () => {
    expect(
      buildAffectedVitestArgs({
        changedFiles: ["src/lib/analytics.ts", "src/lib/analytics.test.ts"],
        baseRef: "origin/master",
      })
    ).toEqual([
      "related",
      "--run",
      "src/lib/analytics.ts",
      "src/lib/analytics.test.ts",
    ]);
  });

  it("uses changed mode when no files are provided", () => {
    expect(
      buildAffectedVitestArgs({
        changedFiles: [],
        baseRef: "origin/master",
      })
    ).toEqual(["run", "--changed", "origin/master"]);
  });

  it("throws when neither changed files nor a base ref are available", () => {
    expect(() =>
      buildAffectedVitestArgs({
        changedFiles: [],
        baseRef: null,
      })
    ).toThrow("Unable to resolve affected test scope");
  });
});
