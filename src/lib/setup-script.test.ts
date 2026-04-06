// @vitest-environment node

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT_SOURCE = path.resolve(process.cwd(), "scripts/setup.sh");
const ENV_EXAMPLE_SOURCE = path.resolve(process.cwd(), ".env.example");
const FIXTURE_PATH = "/usr/bin:/bin:/usr/sbin:/sbin";

const reposToClean = new Set<string>();

type ToolchainOptions = {
  bun?: boolean;
  bunx?: boolean;
  git?: boolean;
};

type FixtureRepoOptions = {
  envExampleContents?: string;
  envLocalContents?: string;
};

function createFixtureRepo(options: FixtureRepoOptions = {}): string {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "setup-script-"));
  reposToClean.add(repoRoot);

  fs.mkdirSync(path.join(repoRoot, "scripts"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "scripts", "setup.sh"),
    fs.readFileSync(SCRIPT_SOURCE, "utf8")
  );

  const envExampleContents =
    options.envExampleContents ?? fs.readFileSync(ENV_EXAMPLE_SOURCE, "utf8");
  fs.writeFileSync(path.join(repoRoot, ".env.example"), envExampleContents);

  if (options.envLocalContents !== undefined) {
    fs.writeFileSync(
      path.join(repoRoot, ".env.local"),
      options.envLocalContents
    );
  }

  return repoRoot;
}

function addCommand(binDir: string, name: string, scriptBody: string): void {
  const commandPath = path.join(binDir, name);
  fs.writeFileSync(commandPath, `#!/bin/sh\n${scriptBody}\n`);
  fs.chmodSync(commandPath, 0o755);
}

function createToolchain(options: ToolchainOptions = {}): string {
  const { bun = true, bunx = true, git = true } = options;
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "setup-bin-"));
  reposToClean.add(binDir);

  if (bun) {
    addCommand(
      binDir,
      "bun",
      ['if [ "$1" = "install" ]; then', "  exit 0", "fi", "exit 0"].join("\n")
    );
  }

  if (bunx) {
    addCommand(binDir, "bunx", "exit 0");
  }

  if (git) {
    addCommand(binDir, "git", "exit 0");
  }

  return binDir;
}

function runSetup(repoRoot: string, args: string[], binDir: string) {
  return spawnSync(
    "/bin/bash",
    [path.join(repoRoot, "scripts", "setup.sh"), ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${FIXTURE_PATH}`,
      },
    }
  );
}

afterEach(() => {
  for (const repoRoot of reposToClean) {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
  reposToClean.clear();
});

describe("scripts/setup.sh", () => {
  it("supports a no-side-effect prerequisite check", () => {
    const repoRoot = createFixtureRepo();
    const binDir = createToolchain();

    const result = runSetup(repoRoot, ["--check"], binDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("==> Required tools look good");
    expect(fs.existsSync(path.join(repoRoot, ".env.local"))).toBe(false);
  });

  it("reports grouped missing required tools in check mode", () => {
    const repoRoot = createFixtureRepo();
    const binDir = createToolchain({ bunx: false });

    const result = runSetup(repoRoot, ["--check"], binDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("==> Missing required tools");
    expect(result.stderr).toContain("bunx");
  });

  it("creates .env.local from .env.example and prints canonical next steps", () => {
    const repoRoot = createFixtureRepo();
    const binDir = createToolchain();

    const result = runSetup(repoRoot, [], binDir);
    const envLocalPath = path.join(repoRoot, ".env.local");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("==> Created .env.local from .env.example");
    expect(result.stdout).toContain("==> Canonical next steps");
    expect(result.stdout).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(fs.readFileSync(envLocalPath, "utf8")).toBe(
      fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8")
    );
  });

  it("does not overwrite an existing .env.local", () => {
    const repoRoot = createFixtureRepo({
      envExampleContents: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_example\n",
      envLocalContents: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_real\n",
    });
    const binDir = createToolchain();

    const result = runSetup(repoRoot, [], binDir);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(
      "==> Created .env.local from .env.example"
    );
    expect(fs.readFileSync(path.join(repoRoot, ".env.local"), "utf8")).toBe(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_real\n"
    );
  });
});
