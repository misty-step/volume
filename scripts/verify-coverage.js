#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Simple coverage verification - uses vitest's built-in thresholds
class CoverageVerifier {
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

    // Use same thresholds as vitest.config.ts
    const thresholds = {
      lines: 50,
      functions: 70,
      branches: 84,
      statements: 50,
    };

    this.checkThresholds(coverage.total, thresholds, "global");
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
}

// Simple interface
const verifier = new CoverageVerifier();
verifier.verify();
