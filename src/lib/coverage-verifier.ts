/**
 * Coverage Verification Library
 *
 * Validates test coverage against defined thresholds.
 * Uses dependency injection for testability.
 */

import * as fs from "fs";
import * as path from "path";

export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export interface CoverageSummary {
  total: {
    lines: CoverageMetric;
    statements: CoverageMetric;
    functions: CoverageMetric;
    branches: CoverageMetric;
  };
}

export interface Thresholds {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface VerificationResult {
  passed: boolean;
  failures: string[];
}

export interface CoverageVerifierDeps {
  readFile: (filePath: string) => string;
  fileExists: (filePath: string) => boolean;
  getCwd: () => string;
}

export const defaultDeps: CoverageVerifierDeps = {
  readFile: (filePath: string) => fs.readFileSync(filePath, "utf8"),
  fileExists: (filePath: string) => fs.existsSync(filePath),
  getCwd: () => process.cwd(),
};

// Default thresholds matching vitest.config.ts
export const DEFAULT_THRESHOLDS: Thresholds = {
  lines: 47,
  functions: 70,
  branches: 83,
  statements: 47,
};

export class CoverageVerifier {
  private thresholds: Thresholds;

  constructor(
    private deps: CoverageVerifierDeps = defaultDeps,
    thresholds: Thresholds = DEFAULT_THRESHOLDS
  ) {
    this.thresholds = thresholds;
  }

  /**
   * Verify coverage meets all thresholds
   */
  verify(coveragePath?: string): VerificationResult {
    const fullPath =
      coveragePath ??
      path.join(this.deps.getCwd(), "coverage", "coverage-summary.json");

    if (!this.deps.fileExists(fullPath)) {
      return {
        passed: false,
        failures: ["Coverage report not found. Run tests with coverage first."],
      };
    }

    let coverage: CoverageSummary;
    try {
      const content = this.deps.readFile(fullPath);
      coverage = JSON.parse(content) as CoverageSummary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        passed: false,
        failures: [`Failed to parse coverage report: ${message}`],
      };
    }

    if (!coverage.total) {
      return {
        passed: false,
        failures: ["Invalid coverage report: missing 'total' section"],
      };
    }

    return this.checkThresholds(coverage.total);
  }

  /**
   * Check individual thresholds against actual coverage
   */
  checkThresholds(actual: CoverageSummary["total"]): VerificationResult {
    const failures: string[] = [];

    for (const metric of Object.keys(this.thresholds) as Array<
      keyof Thresholds
    >) {
      const required = this.thresholds[metric];
      const actualValue = actual[metric]?.pct ?? 0;
      if (actualValue < required) {
        failures.push(
          `${metric} coverage ${actualValue}% is below threshold ${required}%`
        );
      }
    }

    return { passed: failures.length === 0, failures };
  }

  /**
   * Print verification result to console
   */
  printResult(result: VerificationResult): void {
    if (result.passed) {
      console.log("All coverage thresholds passed");
    } else {
      console.error("Coverage thresholds not met:");
      result.failures.forEach((failure) => console.error(`  ${failure}`));
    }
  }
}
