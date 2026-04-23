/**
 * Volume CI pipeline — canonical owner invoked by .github/workflows/ci.yml
 *
 * Runs lint, typecheck, architecture, test:coverage, security-audit, and build
 * in parallel inside containers, matching the same Bun/Node versions
 * and commands as GitHub Actions.
 *
 * Usage: dagger call check --source .
 */
import { dag, Container, Directory, object, func } from "@dagger.io/dagger";

const BUN_VERSION = "1.3.9";
const NODE_VERSION = "22";

@object()
export class Volume {
  /**
   * Base container with Node + Bun and dependencies installed.
   * Uses Node as base (required by tsx) and adds Bun on top.
   */
  private base(source: Directory): Container {
    return dag
      .container()
      .from(`node:${NODE_VERSION}-slim`)
      .withExec(["sh", "-c", `npm install -g bun@${BUN_VERSION}`])
      .withMountedCache("/app/node_modules", dag.cacheVolume("node-modules"))
      .withDirectory("/app", source, {
        exclude: ["node_modules", ".next", "coverage", "test-results"],
      })
      .withWorkdir("/app")
      .withExec(["bun", "install", "--frozen-lockfile"]);
  }

  private withCoverageTest(container: Container): Container {
    return container
      .withEnvVariable("CI", "true")
      .withEnvVariable("NODE_ENV", "test")
      .withExec(["bun", "run", "test:coverage"]);
  }

  /** ESLint with zero warnings tolerance */
  @func()
  async lint(source: Directory): Promise<string> {
    return this.base(source).withExec(["bun", "run", "lint"]).stdout();
  }

  /** TypeScript type checking */
  @func()
  async typecheck(source: Directory): Promise<string> {
    return this.base(source).withExec(["bun", "run", "typecheck"]).stdout();
  }

  /** Architecture boundary and cycle detection */
  @func()
  async architecture(source: Directory): Promise<string> {
    return this.base(source)
      .withExec(["bun", "run", "architecture:check"])
      .stdout();
  }

  /** Vitest unit tests with coverage thresholds enforced */
  @func()
  async test(source: Directory): Promise<string> {
    return this.withCoverageTest(this.base(source)).stdout();
  }

  /** Dependency vulnerability scan */
  @func()
  async securityAudit(source: Directory): Promise<string> {
    return this.base(source)
      .withExec(["bun", "run", "security:audit"])
      .stdout();
  }

  /** Next.js production build */
  @func()
  async build(source: Directory): Promise<string> {
    return this.base(source)
      .withEnvVariable("CI", "true")
      .withExec(["bun", "run", "build"])
      .stdout();
  }

  /**
   * Run all CI checks in parallel — equivalent to the full merge-gate.
   * Fails if any job fails.
   */
  @func()
  async check(source: Directory): Promise<string> {
    const base = this.base(source);

    const [lintOut, typecheckOut, archOut, testOut, auditOut, buildOut] =
      await Promise.all([
        base.withExec(["bun", "run", "lint"]).stdout(),
        base.withExec(["bun", "run", "typecheck"]).stdout(),
        base.withExec(["bun", "run", "architecture:check"]).stdout(),
        this.withCoverageTest(base).stdout(),
        base.withExec(["bun", "run", "security:audit"]).stdout(),
        base
          .withEnvVariable("CI", "true")
          .withExec(["bun", "run", "build"])
          .stdout(),
      ]);

    return [
      "=== LINT ===",
      lintOut,
      "=== TYPECHECK ===",
      typecheckOut,
      "=== ARCHITECTURE ===",
      archOut,
      "=== TEST ===",
      testOut,
      "=== SECURITY AUDIT ===",
      auditOut,
      "=== BUILD ===",
      buildOut,
      "",
      "All checks passed.",
    ].join("\n");
  }
}
