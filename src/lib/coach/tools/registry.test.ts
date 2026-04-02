import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const TOOLS_DIR = join(__dirname);

describe("Coach tool registration", () => {
  test("every tool-*.ts file is imported by registry.ts or another tool file", () => {
    const allFiles = readdirSync(TOOLS_DIR);

    const toolFiles = allFiles.filter(
      (f) => f.startsWith("tool-") && f.endsWith(".ts") && !f.includes(".test.")
    );

    // Read all non-test .ts sources to check for imports
    const sourceFiles = allFiles.filter(
      (f) => f.endsWith(".ts") && !f.includes(".test.")
    );
    const sourceContents = new Map<string, string>();
    for (const f of sourceFiles) {
      sourceContents.set(f, readFileSync(join(TOOLS_DIR, f), "utf-8"));
    }

    // Guard against vacuous pass if test file moves or naming convention changes
    expect(toolFiles.length).toBeGreaterThan(0);

    const orphaned: string[] = [];

    for (const toolFile of toolFiles) {
      const moduleName = toolFile.replace(/\.ts$/, "");
      // Quote-agnostic: matches the module name at the end of an import path
      const importPattern = new RegExp(`/${moduleName}["']`);
      const isImported = [...sourceContents.entries()].some(
        ([filename, content]) =>
          filename !== toolFile && importPattern.test(content)
      );

      if (!isImported) {
        orphaned.push(toolFile);
      }
    }

    expect(
      orphaned,
      `Orphaned tool files not imported by any other file: ${orphaned.join(", ")}`
    ).toEqual([]);
  });
});
