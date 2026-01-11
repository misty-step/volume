/**
 * Tests for Coverage Verification Library
 *
 * Covers:
 * - Threshold enforcement for all metrics
 * - Missing file handling
 * - Malformed JSON handling
 * - Edge cases (0%, 100%, exact threshold)
 */

import { describe, it, expect } from "vitest";
import {
  CoverageVerifier,
  type CoverageVerifierDeps,
  type CoverageSummary,
  DEFAULT_THRESHOLDS,
} from "./coverage-verifier";

function createMockDeps(
  overrides: Partial<CoverageVerifierDeps> = {}
): CoverageVerifierDeps {
  return {
    readFile: () => JSON.stringify(createValidCoverage()),
    fileExists: () => true,
    getCwd: () => "/test",
    ...overrides,
  };
}

function createValidCoverage(
  overrides: Partial<CoverageSummary["total"]> = {}
): CoverageSummary {
  return {
    total: {
      lines: { total: 100, covered: 80, skipped: 0, pct: 80 },
      statements: { total: 100, covered: 80, skipped: 0, pct: 80 },
      functions: { total: 100, covered: 85, skipped: 0, pct: 85 },
      branches: { total: 100, covered: 90, skipped: 0, pct: 90 },
      ...overrides,
    },
  };
}

describe("CoverageVerifier", () => {
  describe("verify", () => {
    it("returns error when coverage file not found", () => {
      const verifier = new CoverageVerifier(
        createMockDeps({ fileExists: () => false })
      );

      const result = verifier.verify();

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toContain("Coverage report not found");
    });

    it("returns error on malformed JSON", () => {
      const verifier = new CoverageVerifier(
        createMockDeps({ readFile: () => "not valid json {" })
      );

      const result = verifier.verify();

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toContain("Failed to parse coverage report");
    });

    it("returns error when total section missing", () => {
      const verifier = new CoverageVerifier(
        createMockDeps({ readFile: () => JSON.stringify({}) })
      );

      const result = verifier.verify();

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toContain("missing 'total' section");
    });

    it("passes when all metrics above thresholds", () => {
      const verifier = new CoverageVerifier(createMockDeps());

      const result = verifier.verify();

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it("fails when any metric below threshold", () => {
      const lowCoverage = createValidCoverage({
        lines: { total: 100, covered: 30, skipped: 0, pct: 30 },
      });
      const verifier = new CoverageVerifier(
        createMockDeps({ readFile: () => JSON.stringify(lowCoverage) })
      );

      const result = verifier.verify();

      expect(result.passed).toBe(false);
      expect(result.failures).toContainEqual(
        expect.stringContaining("lines coverage 30%")
      );
    });

    it("uses custom coverage path when provided", () => {
      let calledPath = "";
      const verifier = new CoverageVerifier(
        createMockDeps({
          fileExists: (path) => {
            calledPath = path;
            return true;
          },
        })
      );

      verifier.verify("/custom/path/coverage.json");

      expect(calledPath).toBe("/custom/path/coverage.json");
    });

    it("uses default path when not provided", () => {
      let calledPath = "";
      const verifier = new CoverageVerifier(
        createMockDeps({
          getCwd: () => "/project",
          fileExists: (path) => {
            calledPath = path;
            return true;
          },
        })
      );

      verifier.verify();

      expect(calledPath).toBe("/project/coverage/coverage-summary.json");
    });
  });

  describe("checkThresholds", () => {
    it("passes at exactly threshold value", () => {
      const coverage = createValidCoverage({
        lines: { total: 100, covered: 50, skipped: 0, pct: 50 }, // Exactly 50%
        functions: { total: 100, covered: 70, skipped: 0, pct: 70 }, // Exactly 70%
        branches: { total: 100, covered: 85, skipped: 0, pct: 84.5 }, // Exactly 84.5%
        statements: { total: 100, covered: 50, skipped: 0, pct: 50 }, // Exactly 50%
      });
      const verifier = new CoverageVerifier(createMockDeps());

      const result = verifier.checkThresholds(coverage.total);

      expect(result.passed).toBe(true);
    });

    it("fails just below threshold", () => {
      const coverage = createValidCoverage({
        lines: { total: 100, covered: 49, skipped: 0, pct: 49.9 },
      });
      const verifier = new CoverageVerifier(createMockDeps());

      const result = verifier.checkThresholds(coverage.total);

      expect(result.passed).toBe(false);
      expect(result.failures).toContainEqual(
        expect.stringContaining("lines coverage 49.9%")
      );
    });

    it("handles 0% coverage", () => {
      const coverage = createValidCoverage({
        lines: { total: 100, covered: 0, skipped: 0, pct: 0 },
        statements: { total: 100, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 100, covered: 0, skipped: 0, pct: 0 },
        branches: { total: 100, covered: 0, skipped: 0, pct: 0 },
      });
      const verifier = new CoverageVerifier(createMockDeps());

      const result = verifier.checkThresholds(coverage.total);

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(4);
    });

    it("handles 100% coverage", () => {
      const coverage = createValidCoverage({
        lines: { total: 100, covered: 100, skipped: 0, pct: 100 },
        statements: { total: 100, covered: 100, skipped: 0, pct: 100 },
        functions: { total: 100, covered: 100, skipped: 0, pct: 100 },
        branches: { total: 100, covered: 100, skipped: 0, pct: 100 },
      });
      const verifier = new CoverageVerifier(createMockDeps());

      const result = verifier.checkThresholds(coverage.total);

      expect(result.passed).toBe(true);
    });

    it("handles missing metric gracefully (defaults to 0)", () => {
      const coverage = {
        total: {
          // lines missing entirely
          statements: { total: 100, covered: 80, skipped: 0, pct: 80 },
          functions: { total: 100, covered: 85, skipped: 0, pct: 85 },
          branches: { total: 100, covered: 90, skipped: 0, pct: 90 },
        },
      } as CoverageSummary;
      const verifier = new CoverageVerifier(createMockDeps());

      const result = verifier.checkThresholds(coverage.total);

      expect(result.passed).toBe(false);
      expect(result.failures).toContainEqual(
        expect.stringContaining("lines coverage 0%")
      );
    });

    it("collects all failing metrics", () => {
      const coverage = createValidCoverage({
        lines: { total: 100, covered: 10, skipped: 0, pct: 10 },
        statements: { total: 100, covered: 10, skipped: 0, pct: 10 },
        functions: { total: 100, covered: 10, skipped: 0, pct: 10 },
        branches: { total: 100, covered: 10, skipped: 0, pct: 10 },
      });
      const verifier = new CoverageVerifier(createMockDeps());

      const result = verifier.checkThresholds(coverage.total);

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(4);
      expect(result.failures).toContainEqual(
        expect.stringContaining("lines")
      );
      expect(result.failures).toContainEqual(
        expect.stringContaining("functions")
      );
      expect(result.failures).toContainEqual(
        expect.stringContaining("branches")
      );
      expect(result.failures).toContainEqual(
        expect.stringContaining("statements")
      );
    });
  });

  describe("custom thresholds", () => {
    it("uses custom thresholds when provided", () => {
      const customThresholds = {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      };
      const coverage = createValidCoverage({
        lines: { total: 100, covered: 80, skipped: 0, pct: 80 },
      });
      const verifier = new CoverageVerifier(
        createMockDeps({ readFile: () => JSON.stringify(coverage) }),
        customThresholds
      );

      const result = verifier.verify();

      expect(result.passed).toBe(false);
      expect(result.failures).toContainEqual(
        expect.stringContaining("below threshold 90%")
      );
    });

    it("uses default thresholds when not provided", () => {
      const coverage = createValidCoverage({
        branches: { total: 100, covered: 84, skipped: 0, pct: 84 }, // Just below 84.5%
      });
      const verifier = new CoverageVerifier(
        createMockDeps({ readFile: () => JSON.stringify(coverage) })
      );

      const result = verifier.verify();

      expect(result.passed).toBe(false);
      expect(result.failures).toContainEqual(
        expect.stringContaining("branches coverage 84%")
      );
    });
  });

  describe("DEFAULT_THRESHOLDS", () => {
    it("matches vitest.config.ts thresholds", () => {
      // These should match the thresholds in vitest.config.ts
      expect(DEFAULT_THRESHOLDS.lines).toBe(50);
      expect(DEFAULT_THRESHOLDS.functions).toBe(70);
      expect(DEFAULT_THRESHOLDS.branches).toBe(84.5);
      expect(DEFAULT_THRESHOLDS.statements).toBe(50);
    });
  });

  describe("error message formatting", () => {
    it("includes metric name in failure message", () => {
      const coverage = createValidCoverage({
        functions: { total: 100, covered: 50, skipped: 0, pct: 50 },
      });
      const verifier = new CoverageVerifier(
        createMockDeps({ readFile: () => JSON.stringify(coverage) })
      );

      const result = verifier.verify();

      expect(result.failures[0]).toContain("functions");
    });

    it("includes actual and threshold values in failure message", () => {
      const coverage = createValidCoverage({
        branches: { total: 100, covered: 80, skipped: 0, pct: 80 },
      });
      const verifier = new CoverageVerifier(
        createMockDeps({ readFile: () => JSON.stringify(coverage) })
      );

      const result = verifier.verify();

      expect(result.failures[0]).toContain("80%");
      expect(result.failures[0]).toContain("84.5%");
    });
  });
});
