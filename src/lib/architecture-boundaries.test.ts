import path from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const eslintConfigPath = path.join(repoRoot, "eslint.config.mjs");

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({
    cwd: repoRoot,
    ignore: false,
    overrideConfigFile: eslintConfigPath,
  });
});

async function lintSnippet(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, {
    filePath: path.join(repoRoot, filePath),
  });

  return result.messages.map((message) => message.message);
}

function expectToContainMessage(messages: string[], message: string) {
  expect(messages).toEqual(
    expect.arrayContaining([expect.stringContaining(message)])
  );
}

describe("architecture boundaries", () => {
  it("rejects runtime imports from hooks into components", async () => {
    const messages = await lintSnippet(
      "src/hooks/runtime-import.ts",
      'import { Button } from "@/components/ui/button";\nexport const x = Button;\n'
    );

    expectToContainMessage(
      messages,
      "Hooks may not import runtime values from components"
    );
  });

  it("rejects runtime imports from hooks into components via ../../src/ paths", async () => {
    const messages = await lintSnippet(
      "src/hooks/runtime-import.ts",
      'import { Button } from "../../src/components/ui/button";\nexport const x = Button;\n'
    );

    expectToContainMessage(
      messages,
      "Hooks may not import runtime values from components"
    );
  });

  it("allows type-only imports from hooks into components", async () => {
    const messages = await lintSnippet(
      "src/hooks/type-import.ts",
      'import type { ButtonProps } from "@/components/ui/button";\nexport type Props = ButtonProps;\n'
    );

    expect(messages).toEqual([]);
  });

  it("rejects lib imports into components", async () => {
    const messages = await lintSnippet(
      "src/lib/feature/service.ts",
      'import { Button } from "@/components/ui/button";\nexport const render = Button;\n'
    );

    expectToContainMessage(
      messages,
      "Lib modules may not import from app, components, hooks, or contexts."
    );
  });

  it("rejects lib imports into hooks", async () => {
    const messages = await lintSnippet(
      "src/lib/feature/service.ts",
      'import { useQuickLogForm } from "@/hooks/useQuickLogForm";\nexport const hook = useQuickLogForm;\n'
    );

    expectToContainMessage(
      messages,
      "Lib modules may not import from app, components, hooks, or contexts."
    );
  });

  it("allows the coach presentation exception to import components", async () => {
    const messages = await lintSnippet(
      "src/lib/coach/presentation/render-card.tsx",
      'import { Button } from "@/components/ui/button";\nexport function RenderCard() { return Button; }\n'
    );

    expect(messages).toEqual([]);
  });

  it("rejects app-route imports outside src/app", async () => {
    const messages = await lintSnippet(
      "src/lib/feature/page-data.ts",
      'import { GET } from "@/app/api/health/route";\nexport const route = GET;\n'
    );

    expectToContainMessage(
      messages,
      "Only files under src/app may import from app routes."
    );
  });

  it("allows app-route imports inside src/app", async () => {
    const messages = await lintSnippet(
      "src/app/dashboard/page.ts",
      'import { GET } from "@/app/api/health/route";\nexport const route = GET;\n'
    );

    expect(messages).toEqual([]);
  });

  it("preserves the convex relative escape guard", async () => {
    const messages = await lintSnippet(
      "convex/ai/tools/example.ts",
      'import { helper } from "../../../src/lib/example";\nexport const tool = helper;\n'
    );

    expectToContainMessage(
      messages,
      "Use @/lib/... alias instead of relative imports that escape the convex/ directory."
    );
  });

  it("allows the intentional convex escapes", async () => {
    const messages = await lintSnippet(
      "convex/ai/tools/example.ts",
      [
        'import { api } from "../../_generated/api";',
        'import { helper } from "../../../packages/core/src/example";',
        "export const tool = { api, helper };",
      ].join("\n")
    );

    expect(messages).toEqual([]);
  });
});
