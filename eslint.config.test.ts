import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));

async function lintText(source: string) {
  const eslint = new ESLint({
    cwd: repoRoot,
    overrideConfigFile: join(repoRoot, "eslint.config.mjs"),
  });

  const [result] = await eslint.lintText(source, {
    filePath: join(repoRoot, "src/tmp.client.ts"),
  });

  return result.messages.map((message) => message.message);
}

describe("client env guard", () => {
  it("rejects direct server-only env reads in .client modules", async () => {
    const messages = await lintText(
      "export const sentryDsn = process.env.SENTRY_DSN;"
    );

    expect(messages).toContain(
      "Client modules may only read NEXT_PUBLIC_* or NODE_ENV from process.env."
    );
  });

  it("rejects aliased process.env access in .client modules", async () => {
    const messages = await lintText(
      "const env = process.env;\nexport const sentryDsn = env.SENTRY_DSN;"
    );

    expect(messages).toContain(
      "Client modules may not alias process.env. Read NEXT_PUBLIC_* or NODE_ENV directly."
    );
  });

  it("allows public env reads in .client modules", async () => {
    const messages = await lintText(
      "export const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;\nexport const mode = process.env.NODE_ENV;"
    );

    expect(messages).toEqual([]);
  });
});
