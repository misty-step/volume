// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { findCircularDependencies } from "./check-circular-deps";

async function createFixtureDir() {
  return mkdtemp(join(tmpdir(), "cycle-check-"));
}

describe("findCircularDependencies", () => {
  const fixtureDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      fixtureDirs
        .splice(0)
        .map((fixtureDir) => rm(fixtureDir, { recursive: true, force: true }))
    );
  });

  it("reports a real circular dependency", async () => {
    const fixtureDir = await createFixtureDir();
    fixtureDirs.push(fixtureDir);

    await mkdir(join(fixtureDir, "src"), { recursive: true });
    await writeFile(
      join(fixtureDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
        },
      })
    );
    await writeFile(
      join(fixtureDir, "src", "a.ts"),
      'import "./b";\nexport const a = "a";\n'
    );
    await writeFile(
      join(fixtureDir, "src", "b.ts"),
      'import "./a";\nexport const b = "b";\n'
    );

    const cycles = await findCircularDependencies({
      cwd: fixtureDir,
      entries: ["src"],
    });

    expect(cycles).toEqual([["src/a.ts", "src/b.ts"]]);
  });

  it("passes for a clean dependency graph", async () => {
    const fixtureDir = await createFixtureDir();
    fixtureDirs.push(fixtureDir);

    await mkdir(join(fixtureDir, "src"), { recursive: true });
    await writeFile(
      join(fixtureDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
        },
      })
    );
    await writeFile(
      join(fixtureDir, "src", "a.ts"),
      'import "./b";\nexport const a = "a";\n'
    );
    await writeFile(join(fixtureDir, "src", "b.ts"), 'export const b = "b";\n');

    const cycles = await findCircularDependencies({
      cwd: fixtureDir,
      entries: ["src"],
    });

    expect(cycles).toEqual([]);
  });
});
