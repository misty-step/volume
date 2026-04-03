import { existsSync } from "node:fs";
import path from "node:path";

import madge from "madge";

export const DEFAULT_CYCLE_ENTRIES = ["src", "convex", "packages/core/src"];

export const DEFAULT_EXCLUDE_PATTERNS = [
  String.raw`(^|/)node_modules(/|$)`,
  String.raw`(^|/)\.next(/|$)`,
  String.raw`(^|/)coverage(/|$)`,
  String.raw`(^|/)e2e(/|$)`,
  String.raw`(^|/)convex/_generated(/|$)`,
  String.raw`(^|/)(test|tests|spec|specs)(/|$)`,
  String.raw`\.(test|spec)\.[cm]?[jt]sx?$`,
];

export interface CircularDependencyCheckOptions {
  cwd?: string;
  entries?: string[];
  excludePatterns?: string[];
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function normalizeModulePath(cwd: string, modulePath: string): string {
  if (path.isAbsolute(modulePath)) {
    return toPosixPath(path.relative(cwd, modulePath));
  }

  return toPosixPath(modulePath);
}

export async function findCircularDependencies(
  options: CircularDependencyCheckOptions = {}
): Promise<string[][]> {
  const cwd = options.cwd ?? process.cwd();
  const entries = options.entries ?? DEFAULT_CYCLE_ENTRIES;
  const tsConfigPath = path.join(cwd, "tsconfig.json");
  const entryPaths = entries.map((entry) => path.resolve(cwd, entry));

  const graph = await madge(entryPaths, {
    baseDir: cwd,
    fileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs"],
    includeNpm: false,
    excludeRegExp: (options.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS).map(
      (pattern) => new RegExp(pattern)
    ),
    ...(existsSync(tsConfigPath) ? { tsConfig: tsConfigPath } : {}),
  });

  return graph
    .circular()
    .map((cycle: string[]) =>
      cycle.map((modulePath: string) => normalizeModulePath(cwd, modulePath))
    );
}

export async function runCircularDependencyCheck(
  options: CircularDependencyCheckOptions = {}
): Promise<{ cycles: string[][]; ok: boolean }> {
  const cycles = await findCircularDependencies(options);

  if (cycles.length === 0) {
    console.log("No circular dependencies found.");
    return { cycles, ok: true };
  }

  console.error("Circular dependencies detected:");
  for (const cycle of cycles) {
    console.error(`- ${cycle.join(" -> ")} -> ${cycle[0]}`);
  }

  return { cycles, ok: false };
}

if (import.meta.main) {
  runCircularDependencyCheck()
    .then((result) => {
      process.exit(result.ok ? 0 : 1);
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      console.error(message);
      process.exit(1);
    });
}
