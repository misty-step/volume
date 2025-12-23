#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Deep module: Simple interface, complex coverage analysis
class CoverageVerifier {
  constructor() {
    this.thresholds = {
      global: {
        lines: 50,
        functions: 70,
        branches: 84.5,
        statements: 50,
      },
      critical: {
        lines: 80,
        functions: 80,
        branches: 85,
        statements: 80,
      },
    };

    this.criticalPaths = ["src/lib/", "convex/", "src/hooks/"];
  }

  verify() {
    const coveragePath = path.join(
      process.cwd(),
      "coverage",
      "coverage-summary.json"
    );

    if (!fs.existsSync(coveragePath)) {
      console.error(
        "❌ Coverage report not found. Run tests with coverage first."
      );
      process.exit(1);
    }

    const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));

    // Verify global thresholds
    this.checkThresholds(coverage.total, this.thresholds.global, "global");

    // Verify critical paths
    this.verifyCriticalPaths(coverage);

    console.log("✅ All coverage thresholds passed");
  }

  checkThresholds(actual, threshold, context) {
    for (const [metric, required] of Object.entries(threshold)) {
      const actualValue = actual[metric]?.pct || 0;

      if (actualValue < required) {
        console.error(
          `❌ ${context}: ${metric} coverage ${actualValue}% < ${required}%`
        );
        process.exit(1);
      }
    }
  }

  verifyCriticalPaths(coverage) {
    for (const criticalPath of this.criticalPaths) {
      const matchingFiles = Object.keys(coverage).filter((file) =>
        file.includes(criticalPath)
      );

      if (matchingFiles.length === 0) continue;

      const aggregated = this.aggregateCoverage(matchingFiles, coverage);
      this.checkThresholds(aggregated, this.thresholds.critical, criticalPath);
    }
  }

  aggregateCoverage(files, coverage) {
    const aggregated = {
      lines: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
    };

    for (const file of files) {
      const fileCoverage = coverage[file];
      if (!fileCoverage) continue;

      for (const metric of ["lines", "functions", "branches", "statements"]) {
        aggregated[metric].total += fileCoverage[metric]?.total || 0;
        aggregated[metric].covered += fileCoverage[metric]?.covered || 0;
      }
    }

    // Convert to percentages
    return {
      lines: {
        pct:
          Math.round(
            (aggregated.lines.covered / aggregated.lines.total) * 100
          ) || 0,
      },
      functions: {
        pct:
          Math.round(
            (aggregated.functions.covered / aggregated.functions.total) * 100
          ) || 0,
      },
      branches: {
        pct:
          Math.round(
            (aggregated.branches.covered / aggregated.branches.total) * 100
          ) || 0,
      },
      statements: {
        pct:
          Math.round(
            (aggregated.statements.covered / aggregated.statements.total) * 100
          ) || 0,
      },
    };
  }
}

// Simple interface
const verifier = new CoverageVerifier();
verifier.verify();
