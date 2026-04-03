// @vitest-environment node

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const fixtureFilePath = path.join(
  repoRoot,
  "src/lib/__fixtures__/complexity-fixture.ts"
);

afterEach(async () => {
  await rm(path.dirname(fixtureFilePath), { recursive: true, force: true });
});

async function lintFixtureFile(code: string) {
  const eslint = new ESLint({
    cwd: repoRoot,
    overrideConfigFile: path.join(repoRoot, "eslint.config.mjs"),
  });

  await mkdir(path.dirname(fixtureFilePath), { recursive: true });
  await writeFile(fixtureFilePath, code);

  const [result] = await eslint.lintFiles([fixtureFilePath]);

  return result;
}

describe("complexity lint rule", () => {
  it("fails on functions above the configured complexity budget", async () => {
    const result = await lintFixtureFile(
      [
        "export function tooComplex(value: number) {",
        "  if (value === 0) return 0;",
        "  if (value === 1) return 1;",
        "  if (value === 2) return 2;",
        "  if (value === 3) return 3;",
        "  if (value === 4) return 4;",
        "  if (value === 5) return 5;",
        "  if (value === 6) return 6;",
        "  if (value === 7) return 7;",
        "  if (value === 8) return 8;",
        "  if (value === 9) return 9;",
        "  if (value === 10) return 10;",
        "  if (value === 11) return 11;",
        "  if (value === 12) return 12;",
        "  if (value === 13) return 13;",
        "  if (value === 14) return 14;",
        "  if (value === 15) return 15;",
        "  if (value === 16) return 16;",
        "  if (value === 17) return 17;",
        "  if (value === 18) return 18;",
        "  if (value === 19) return 19;",
        "  if (value === 20) return 20;",
        "  if (value === 21) return 21;",
        "  if (value === 22) return 22;",
        "  if (value === 23) return 23;",
        "  if (value === 24) return 24;",
        "  if (value === 25) return 25;",
        "  if (value === 26) return 26;",
        "  if (value === 27) return 27;",
        "  if (value === 28) return 28;",
        "  if (value === 29) return 29;",
        "  if (value === 30) return 30;",
        "  return 31;",
        "}",
      ].join("\n")
    );

    expect(result.messages).toContainEqual(
      expect.objectContaining({ ruleId: "complexity" })
    );
  });
});
