import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import {
  BOUNDARY_EXCEPTIONS,
  BOUNDARY_RULES,
  type ModuleDomain,
} from "@/lib/architecture-policy";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const SCAN_ROOTS = ["src", "convex", "packages/core"] as const;

const IGNORE_PATTERNS = [
  /^convex\/_generated\//,
  /(?:^|\/)[^/]+\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/,
  /(?:^|\/)[^/]+\.test-d\.ts$/,
  /\.d\.ts$/,
];

interface ResolvedImport {
  absolutePath: string;
  relativePath: string;
  tracked: boolean;
}

interface PathAlias {
  key: string;
  targets: string[];
}

export interface ArchitectureIssue {
  code: "boundary" | "cycle";
  message: string;
  file?: string;
  importPath?: string;
  cycle?: string[];
}

export interface ArchitectureCheckResult {
  passed: boolean;
  checkedFiles: number;
  issues: ArchitectureIssue[];
}

const DEFAULT_PATH_ALIASES: PathAlias[] = [
  {
    key: "@/*",
    targets: ["./src/*"],
  },
  {
    key: "@volume/core",
    targets: ["./packages/core/src/index"],
  },
  {
    key: "@volume/core/*",
    targets: ["./packages/core/src/*"],
  },
];

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "en");
}

function mergePathAliases(
  fallbackPaths: ts.CompilerOptions["paths"],
  configuredPaths: ts.CompilerOptions["paths"]
): ts.CompilerOptions["paths"] {
  return {
    ...(fallbackPaths ?? {}),
    ...(configuredPaths ?? {}),
  };
}

export class ArchitectureChecker {
  private pathAliases: PathAlias[] | null = null;
  private compilerOptions: ts.CompilerOptions | null = null;

  constructor(private repoRoot: string = process.cwd()) {}

  check(): ArchitectureCheckResult {
    const files = this.collectProjectFiles();
    const issues: ArchitectureIssue[] = [];
    const graph = new Map<string, Set<string>>();

    for (const file of files) {
      graph.set(file, new Set());
    }

    for (const file of files) {
      const imports = this.collectImports(file);
      for (const specifier of imports) {
        const resolvedImport = this.resolveImport(file, specifier);
        if (!resolvedImport) {
          continue;
        }

        if (resolvedImport.tracked) {
          graph.get(file)?.add(resolvedImport.absolutePath);
        }

        const boundaryIssue = this.getBoundaryIssue(
          file,
          specifier,
          resolvedImport.relativePath
        );

        if (boundaryIssue) {
          issues.push(boundaryIssue);
        }
      }
    }

    issues.push(...this.findCycles(graph));

    issues.sort((left, right) => compareStrings(left.message, right.message));

    return {
      passed: issues.length === 0,
      checkedFiles: files.length,
      issues,
    };
  }

  printResult(result: ArchitectureCheckResult): void {
    if (!result.passed) {
      console.error("\n❌ Architecture verification failed");
      result.issues.forEach((issue) => console.error(`- ${issue.message}`));
      return;
    }

    // eslint-disable-next-line no-console -- success output belongs on stdout
    console.log("\n✅ Architecture verification passed");
    // eslint-disable-next-line no-console -- success output belongs on stdout
    console.log(
      `Checked ${result.checkedFiles} files for boundary and cycle regressions`
    );
  }

  private collectProjectFiles(): string[] {
    const files: string[] = [];

    for (const scanRoot of SCAN_ROOTS) {
      const absoluteRoot = path.join(this.repoRoot, scanRoot);
      if (!fs.existsSync(absoluteRoot)) {
        continue;
      }

      this.walkDirectory(absoluteRoot, files);
    }

    return files.sort(compareStrings);
  }

  private walkDirectory(directory: string, files: string[]): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = this.getRelativePath(absolutePath);

      if (entry.isDirectory()) {
        if (this.shouldIgnore(relativePath)) {
          continue;
        }

        this.walkDirectory(absolutePath, files);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (this.shouldIgnore(relativePath)) {
        continue;
      }

      if (!SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
        continue;
      }

      files.push(absolutePath);
    }
  }

  private shouldIgnore(relativePath: string): boolean {
    return IGNORE_PATTERNS.some((pattern) => pattern.test(relativePath));
  }

  private collectImports(filePath: string): string[] {
    const source = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true
    );
    const imports = new Set<string>();

    const visit = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        imports.add(node.moduleSpecifier.text);
      }

      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const [firstArg] = node.arguments;
        if (firstArg && ts.isStringLiteralLike(firstArg)) {
          imports.add(firstArg.text);
        }
      }

      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const [firstArg] = node.arguments;
        if (
          node.expression.text === "require" &&
          firstArg &&
          ts.isStringLiteralLike(firstArg)
        ) {
          imports.add(firstArg.text);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return [...imports].sort(compareStrings);
  }

  private resolveImport(
    importerPath: string,
    specifier: string
  ): ResolvedImport | null {
    const typeScriptResolved = this.resolveWithTypeScript(
      importerPath,
      specifier
    );
    if (typeScriptResolved) {
      return typeScriptResolved;
    }

    const candidatePaths: string[] = [];

    if (specifier.startsWith(".")) {
      candidatePaths.push(path.resolve(path.dirname(importerPath), specifier));
    } else {
      candidatePaths.push(...this.resolveAliasCandidates(specifier));
    }

    if (candidatePaths.length === 0) {
      return null;
    }

    for (const candidatePath of candidatePaths) {
      const resolvedPath = this.resolveModulePath(candidatePath);
      if (!resolvedPath) {
        continue;
      }

      return this.buildResolvedImport(resolvedPath);
    }

    return null;
  }

  private resolveWithTypeScript(
    importerPath: string,
    specifier: string
  ): ResolvedImport | null {
    const resolvedModule = ts.resolveModuleName(
      specifier,
      importerPath,
      this.getCompilerOptions(),
      ts.sys
    ).resolvedModule;

    if (!resolvedModule) {
      return null;
    }

    const resolvedPath = this.resolveTypeScriptResolution(
      resolvedModule.resolvedFileName
    );
    if (!resolvedPath) {
      return null;
    }

    return this.buildResolvedImport(resolvedPath);
  }

  private resolveTypeScriptResolution(resolvedFileName: string): string | null {
    if (!resolvedFileName.endsWith(".d.ts")) {
      return this.resolveFile(resolvedFileName);
    }

    const sourceResolution = this.resolveModulePath(
      resolvedFileName.slice(0, -".d.ts".length)
    );
    if (sourceResolution) {
      return sourceResolution;
    }

    return this.resolveFile(resolvedFileName);
  }

  private buildResolvedImport(resolvedPath: string): ResolvedImport {
    const relativePath = this.getRelativePath(resolvedPath);
    const tracked = SCAN_ROOTS.some(
      (scanRoot) =>
        relativePath === scanRoot || relativePath.startsWith(`${scanRoot}/`)
    );

    return {
      absolutePath: resolvedPath,
      relativePath,
      tracked,
    };
  }

  private resolveModulePath(candidatePath: string): string | null {
    const seen = new Set<string>();
    const candidates = [candidatePath];

    if (path.extname(candidatePath)) {
      candidates.push(candidatePath.replace(path.extname(candidatePath), ""));
    }

    while (candidates.length > 0) {
      const current = candidates.shift();
      if (!current || seen.has(current)) {
        continue;
      }
      seen.add(current);

      const exactMatch = this.resolveFile(current);
      if (exactMatch) {
        return exactMatch;
      }

      for (const extension of SOURCE_EXTENSIONS) {
        const withExtension = this.resolveFile(`${current}${extension}`);
        if (withExtension) {
          return withExtension;
        }
      }

      for (const extension of SOURCE_EXTENSIONS) {
        const indexMatch = this.resolveFile(
          path.join(current, `index${extension}`)
        );
        if (indexMatch) {
          return indexMatch;
        }
      }
    }

    return null;
  }

  private resolveFile(candidatePath: string): string | null {
    if (!fs.existsSync(candidatePath)) {
      return null;
    }

    if (!fs.statSync(candidatePath).isFile()) {
      return null;
    }

    return candidatePath;
  }

  private resolveAliasCandidates(specifier: string): string[] {
    return this.getPathAliases()
      .flatMap(({ key, targets }) => {
        if (!key.includes("*")) {
          if (specifier !== key) {
            return [];
          }

          return targets.map((target) => this.resolveAliasTarget(target, ""));
        }

        const prefix = key.slice(0, key.indexOf("*"));
        if (!specifier.startsWith(prefix)) {
          return [];
        }

        const suffix = specifier.slice(prefix.length);
        return targets.map((target) => this.resolveAliasTarget(target, suffix));
      })
      .filter((candidate): candidate is string => candidate !== null);
  }

  private resolveAliasTarget(target: string, suffix: string): string | null {
    const normalizedTarget = target.replace(/^\.\//, "");

    if (target.includes("*")) {
      const targetPrefix = normalizedTarget.slice(
        0,
        normalizedTarget.indexOf("*")
      );
      return path.join(this.repoRoot, targetPrefix, suffix);
    }

    if (suffix.length > 0) {
      return null;
    }

    return path.join(this.repoRoot, normalizedTarget);
  }

  private getPathAliases(): PathAlias[] {
    if (this.pathAliases) {
      return this.pathAliases;
    }

    this.pathAliases = Object.entries(this.getCompilerOptions().paths ?? {})
      .map(([key, targets]) => ({
        key,
        targets,
      }))
      .sort((left, right) => compareStrings(right.key, left.key));

    return this.pathAliases;
  }

  private getCompilerOptions(): ts.CompilerOptions {
    if (this.compilerOptions) {
      return this.compilerOptions;
    }

    const fallback = this.createDefaultCompilerOptions();
    const tsconfigPath = path.join(this.repoRoot, "tsconfig.json");
    if (!fs.existsSync(tsconfigPath)) {
      this.compilerOptions = fallback;
      return this.compilerOptions;
    }

    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (configFile.error) {
      this.compilerOptions = fallback;
      return this.compilerOptions;
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      this.repoRoot
    );

    if (parsedConfig.errors.length > 0) {
      this.compilerOptions = fallback;
      return this.compilerOptions;
    }

    this.compilerOptions = {
      ...fallback,
      ...parsedConfig.options,
      allowJs: true,
      baseUrl: parsedConfig.options.baseUrl ?? this.repoRoot,
      paths: mergePathAliases(fallback.paths, parsedConfig.options.paths),
    };

    return this.compilerOptions;
  }

  private createDefaultCompilerOptions(): ts.CompilerOptions {
    return {
      allowJs: true,
      baseUrl: this.repoRoot,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      paths: Object.fromEntries(
        DEFAULT_PATH_ALIASES.map(({ key, targets }) => [key, targets])
      ),
    };
  }

  private getBoundaryIssue(
    sourceFile: string,
    importPath: string,
    targetRelativePath: string
  ): ArchitectureIssue | null {
    const sourceRelativePath = this.getRelativePath(sourceFile);
    const sourceDomain = this.getDomain(sourceRelativePath);
    const targetDomain = this.getDomain(targetRelativePath);
    const matchingRule = BOUNDARY_RULES.find(
      (rule) =>
        rule.fromDomain === sourceDomain &&
        rule.forbiddenDomains.includes(targetDomain)
    );

    if (!matchingRule) {
      return null;
    }

    const isException = BOUNDARY_EXCEPTIONS.some(
      (exception) =>
        exception.toDomain === targetDomain &&
        exception.from.test(sourceRelativePath) &&
        (!exception.to || exception.to.test(targetRelativePath))
    );

    if (isException) {
      return null;
    }

    return {
      code: "boundary",
      file: sourceRelativePath,
      importPath,
      message: `${sourceRelativePath} may not import ${importPath} (${targetRelativePath}). ${matchingRule.message}`,
    };
  }

  private getDomain(relativePath: string): ModuleDomain {
    if (relativePath.startsWith("convex/")) {
      return "convex";
    }

    if (relativePath.startsWith("packages/core/")) {
      return "packages/core";
    }

    if (relativePath.startsWith("src/app/")) {
      return "src/app";
    }

    if (relativePath.startsWith("src/components/")) {
      return "src/components";
    }

    if (relativePath.startsWith("src/contexts/")) {
      return "src/contexts";
    }

    if (relativePath.startsWith("src/hooks/")) {
      return "src/hooks";
    }

    if (relativePath.startsWith("src/lib/")) {
      return "src/lib";
    }

    return "other";
  }

  private findCycles(graph: Map<string, Set<string>>): ArchitectureIssue[] {
    const visited = new Set<string>();
    const active = new Set<string>();
    const stack: string[] = [];
    const seenCycles = new Set<string>();
    const issues: ArchitectureIssue[] = [];

    const visit = (node: string) => {
      visited.add(node);
      active.add(node);
      stack.push(node);

      const nextNodes = [...(graph.get(node) ?? [])].sort(compareStrings);
      for (const nextNode of nextNodes) {
        if (!graph.has(nextNode)) {
          continue;
        }

        if (!visited.has(nextNode)) {
          visit(nextNode);
          continue;
        }

        if (!active.has(nextNode)) {
          continue;
        }

        const startIndex = stack.indexOf(nextNode);
        if (startIndex === -1) {
          continue;
        }

        const cycle = [...stack.slice(startIndex), nextNode];
        const cycleKey = this.getCycleKey(cycle);
        if (seenCycles.has(cycleKey)) {
          continue;
        }

        seenCycles.add(cycleKey);

        const relativeCycle = cycle.map((cycleNode) =>
          this.getRelativePath(cycleNode)
        );
        issues.push({
          code: "cycle",
          cycle: relativeCycle,
          message: `Circular dependency detected: ${relativeCycle.join(" -> ")}`,
        });
      }

      stack.pop();
      active.delete(node);
    };

    for (const node of [...graph.keys()].sort(compareStrings)) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return issues;
  }

  private getCycleKey(cycle: string[]): string {
    const normalizedCycle = cycle
      .slice(0, -1)
      .map((node) => this.getRelativePath(node));
    const rotations = normalizedCycle.map((_, startIndex) =>
      [
        ...normalizedCycle.slice(startIndex),
        ...normalizedCycle.slice(0, startIndex),
      ].join("->")
    );

    return rotations.sort(compareStrings)[0] ?? normalizedCycle.join("->");
  }

  private getRelativePath(absolutePath: string): string {
    return toPosixPath(path.relative(this.repoRoot, absolutePath));
  }
}
