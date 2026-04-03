import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));

async function lintText(source: string) {
  return lintTextAtPath(source, "src/tmp.ts");
}

async function lintTextAtPath(source: string, relativePath: string) {
  const eslint = new ESLint({
    cwd: repoRoot,
    overrideConfigFile: join(repoRoot, "eslint.config.mjs"),
  });

  const [result] = await eslint.lintText(source, {
    filePath: join(repoRoot, relativePath),
  });

  return result.messages.map((message) => message.message);
}

async function lintClientText(source: string) {
  return lintTextAtPath(source, "src/tmp.client.ts");
}

describe("Next env direct access guard", () => {
  it("rejects computed process.env access in app code", async () => {
    const messages = await lintText(
      "const key = 'NEXT_PUBLIC_CONVEX_URL';\nexport const convexUrl = process.env[key];"
    );

    expect(messages).toContain(
      "Read environment variables as process.env.NAME so Next.js can statically expose them."
    );
  });

  it("rejects aliased process.env access in app code", async () => {
    const messages = await lintText(
      "const env = process.env;\nexport const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;"
    );

    expect(messages).toContain(
      "Do not alias process.env in app code. Read environment variables as process.env.NAME."
    );
  });

  it("allows direct process.env access in app code", async () => {
    const messages = await lintText(
      "export const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;\nexport const mode = process.env.NODE_ENV;"
    );

    expect(messages).toEqual([]);
  });
});

describe("client env guard", () => {
  it("rejects direct server-only env reads in .client modules", async () => {
    const messages = await lintClientText(
      "export const sentryDsn = process.env.SENTRY_DSN;"
    );

    expect(messages).toContain(
      "Client modules may only read NEXT_PUBLIC_* or NODE_ENV from process.env."
    );
  });

  it("rejects aliased process.env access in .client modules", async () => {
    const messages = await lintClientText(
      "const env = process.env;\nexport const sentryDsn = env.SENTRY_DSN;"
    );

    expect(messages).toContain(
      "Client modules may not alias process.env. Read NEXT_PUBLIC_* or NODE_ENV directly."
    );
  });

  it("rejects computed process.env access in .client modules", async () => {
    const messages = await lintClientText(
      "const key = 'SENTRY_DSN';\nexport const sentryDsn = process.env[key];"
    );

    expect(messages).toContain(
      "Client modules may not use computed process.env access. Read NEXT_PUBLIC_* or NODE_ENV directly."
    );
  });

  it("allows public env reads in .client modules", async () => {
    const messages = await lintClientText(
      "export const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;\nexport const mode = process.env.NODE_ENV;"
    );

    expect(messages).toEqual([]);
  });
});

describe("complexity rule", () => {
  it("rejects functions above the configured complexity threshold", async () => {
    const conditions = Array.from({ length: 41 }, (_, index) => {
      return `if (value === ${index}) return ${index};`;
    }).join("\n");

    const messages = await lintTextAtPath(
      `export function tooComplex(value: number) {\n${conditions}\nreturn value;\n}`,
      "src/lib/tmp-complex.ts"
    );

    expect(messages).toContainEqual(
      expect.stringContaining("Maximum allowed is 40")
    );
  });

  it("allows functions within the configured complexity threshold", async () => {
    const conditions = Array.from({ length: 3 }, (_, index) => {
      return `if (value === ${index}) return ${index};`;
    }).join("\n");

    const messages = await lintTextAtPath(
      `export function simple(value: number) {\n${conditions}\nreturn value;\n}`,
      "src/lib/tmp-simple.ts"
    );

    expect(messages).toEqual([]);
  });

  it("rejects complex functions in convex modules too", async () => {
    const conditions = Array.from({ length: 41 }, (_, index) => {
      return `if (value === ${index}) return ${index};`;
    }).join("\n");

    const messages = await lintTextAtPath(
      `export function tooComplex(value: number) {\n${conditions}\nreturn value;\n}`,
      "convex/tmp-complex.ts"
    );

    expect(messages).toContainEqual(
      expect.stringContaining("Maximum allowed is 40")
    );
  });

  it("skips complexity enforcement for generated convex files", async () => {
    const conditions = Array.from({ length: 41 }, (_, index) => {
      return `if (value === ${index}) return ${index};`;
    }).join("\n");

    const messages = await lintTextAtPath(
      `export function generated(value: number) {\n${conditions}\nreturn value;\n}`,
      "convex/_generated/tmp-complex.ts"
    );

    expect(messages).not.toContainEqual(
      expect.stringContaining("Maximum allowed is 40")
    );
  });
});
