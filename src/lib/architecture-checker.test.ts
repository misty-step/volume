// @vitest-environment node

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { ArchitectureChecker } from "./architecture-checker";

function writeFixtureRepo(files: Record<string, string>): string {
  const repoRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "architecture-checker-")
  );

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(repoRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);
  }

  return repoRoot;
}

const reposToClean = new Set<string>();

function createRepo(files: Record<string, string>): string {
  const repoRoot = writeFixtureRepo(files);
  reposToClean.add(repoRoot);
  return repoRoot;
}

afterEach(() => {
  for (const repoRoot of reposToClean) {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
  reposToClean.clear();
});

describe("ArchitectureChecker", () => {
  it("passes for allowed imports and explicit presentation exceptions", () => {
    const repoRoot = createRepo({
      "src/components/coach/CoachSceneBlocks.tsx":
        "export function SceneFrame() { return null; }\n",
      "src/hooks/useThing.ts":
        'import { api } from "../../convex/_generated/api";\nexport const useThing = () => api;\n',
      "src/lib/coach/presentation/registry.tsx":
        'import { SceneFrame } from "@/components/coach/CoachSceneBlocks";\nexport const registry = SceneFrame;\n',
      "convex/_generated/api.ts": "export const api = {};\n",
      "convex/health.ts": "export const health = 'ok';\n",
    });

    const checker = new ArchitectureChecker(repoRoot);
    const result = checker.check();

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("fails when src/lib depends on component modules outside the allowlist", () => {
    const repoRoot = createRepo({
      "src/components/ui/button.tsx":
        "export function Button() { return null; }\n",
      "src/lib/format-button.ts":
        'import { Button } from "@/components/ui/button";\nexport const formatButton = () => Button;\n',
    });

    const checker = new ArchitectureChecker(repoRoot);
    const result = checker.check();

    expect(result.passed).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "boundary",
        file: "src/lib/format-button.ts",
      })
    );
  });

  it("fails when src/components depends on app routes", () => {
    const repoRoot = createRepo({
      "src/app/page.tsx": "export const page = 'home';\n",
      "src/components/page-card.tsx":
        'import { page } from "@/app/page";\nexport const PageCard = page;\n',
    });

    const checker = new ArchitectureChecker(repoRoot);
    const result = checker.check();

    expect(result.passed).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "boundary",
        file: "src/components/page-card.tsx",
      })
    );
  });

  it("fails when src/hooks depends on app routes", () => {
    const repoRoot = createRepo({
      "src/app/page.tsx": "export const page = 'home';\n",
      "src/hooks/usePage.ts":
        'import { page } from "@/app/page";\nexport const usePage = () => page;\n',
    });

    const checker = new ArchitectureChecker(repoRoot);
    const result = checker.check();

    expect(result.passed).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "boundary",
        file: "src/hooks/usePage.ts",
      })
    );
  });

  it("fails when convex depends on frontend modules", () => {
    const repoRoot = createRepo({
      "src/components/ui/button.tsx":
        "export function Button() { return null; }\n",
      "convex/bad.ts":
        'import { Button } from "@/components/ui/button";\nexport const bad = Button;\n',
    });

    const checker = new ArchitectureChecker(repoRoot);
    const result = checker.check();

    expect(result.passed).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "boundary",
        file: "convex/bad.ts",
      })
    );
  });

  it("fails when forbidden dependencies are loaded with require", () => {
    const repoRoot = createRepo({
      "src/components/ui/button.tsx":
        "export function Button() { return null; }\n",
      "src/lib/format-button.ts":
        'const { Button } = require("@/components/ui/button");\nexport const formatButton = () => Button;\n',
    });

    const checker = new ArchitectureChecker(repoRoot);
    const result = checker.check();

    expect(result.passed).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "boundary",
        file: "src/lib/format-button.ts",
      })
    );
  });

  it("keeps the presentation exception scoped to the registry bridge", () => {
    const repoRoot = createRepo({
      "src/components/coach/CoachSceneBlocks.tsx":
        "export function SceneFrame() { return null; }\n",
      "src/lib/coach/presentation/compose.ts":
        'import { SceneFrame } from "@/components/coach/CoachSceneBlocks";\nexport const compose = () => SceneFrame;\n',
    });

    const checker = new ArchitectureChecker(repoRoot);
    const result = checker.check();

    expect(result.passed).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "boundary",
        file: "src/lib/coach/presentation/compose.ts",
      })
    );
  });

  it("reports circular dependencies between tracked modules", () => {
    const repoRoot = createRepo({
      "src/lib/a.ts": 'import { b } from "./b";\nexport const a = b;\n',
      "src/lib/b.ts": 'import { a } from "./a";\nexport const b = a;\n',
    });

    const checker = new ArchitectureChecker(repoRoot);
    const result = checker.check();

    expect(result.passed).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "cycle",
        cycle: ["src/lib/a.ts", "src/lib/b.ts", "src/lib/a.ts"],
      })
    );
  });
});
