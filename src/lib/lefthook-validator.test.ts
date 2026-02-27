/**
 * Tests for Lefthook Configuration Validator
 *
 * Covers:
 * - YAML parsing
 * - Security audit level validation
 * - Branch reference validation
 * - Command existence validation
 * - Error message formatting
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LefthookConfigValidator,
  type ValidatorDeps,
} from "./lefthook-validator";

const validConfig = `
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx,js,jsx}"
      run: pnpm eslint --fix {staged_files}
      stage_fixed: true

pre-push:
  parallel: true
  commands:
    test-suite:
      run: pnpm test:coverage
    security-audit:
      run: pnpm audit --audit-level=high
    bundle-analysis:
      run: pnpm analyze
      only:
        - ref: master

commit-msg:
  commands:
    commitlint:
      run: pnpm commitlint --edit {1}
`;

const configMissingAuditLevel = `
pre-push:
  commands:
    security-audit:
      run: pnpm audit
`;

const configInvalidBranch = `
pre-push:
  commands:
    bundle-analysis:
      run: pnpm analyze
      only:
        - ref: feature-branch
`;

const configWithMultilineCommand = `
pre-commit:
  commands:
    convex-warning:
      run: |
        echo "Warning message"
        echo "Another line"
`;

const configWithEnvPrefix = `
pre-push:
  commands:
    test-suite:
      run: NODE_ENV=test CI=true pnpm test:coverage
`;

function createMockDeps(overrides: Partial<ValidatorDeps> = {}): ValidatorDeps {
  return {
    readFile: () => validConfig,
    fileExists: () => true,
    commandExists: () => true,
    ...overrides,
  };
}

describe("LefthookConfigValidator", () => {
  let validator: LefthookConfigValidator;

  describe("parseYaml", () => {
    beforeEach(() => {
      validator = new LefthookConfigValidator(createMockDeps());
    });

    it("parses valid YAML configuration", () => {
      const config = validator.parseYaml(validConfig);

      expect(config["pre-commit"]).toBeDefined();
      expect(config["pre-commit"]?.parallel).toBe(true);
      expect(config["pre-commit"]?.commands?.lint).toBeDefined();
    });

    it("parses pre-push commands correctly", () => {
      const config = validator.parseYaml(validConfig);

      expect(config["pre-push"]?.commands?.["test-suite"]).toBeDefined();
      expect(config["pre-push"]?.commands?.["security-audit"]?.run).toContain(
        "audit"
      );
    });

    it("parses only refs as array of objects", () => {
      const config = validator.parseYaml(validConfig);
      const bundleAnalysis = config["pre-push"]?.commands?.["bundle-analysis"];

      expect(bundleAnalysis?.only).toEqual([{ ref: "master" }]);
    });

    it("throws on invalid YAML", () => {
      const invalidYaml = `
pre-commit:
  commands:
    - this is wrong
      indentation: bad
`;
      expect(() => validator.parseYaml(invalidYaml)).toThrow();
    });
  });

  describe("extractCommandBinary", () => {
    beforeEach(() => {
      validator = new LefthookConfigValidator(createMockDeps());
    });

    it("extracts simple command binary", () => {
      expect(validator.extractCommandBinary("pnpm eslint --fix")).toBe("pnpm");
    });

    it("handles NODE_ENV prefix", () => {
      expect(validator.extractCommandBinary("NODE_ENV=test pnpm test")).toBe(
        "pnpm"
      );
    });

    it("handles CI=true prefix", () => {
      expect(validator.extractCommandBinary("CI=true pnpm test:coverage")).toBe(
        "pnpm"
      );
    });

    it("handles multiple env prefixes", () => {
      expect(
        validator.extractCommandBinary("NODE_ENV=test CI=true pnpm test")
      ).toBe("pnpm");
    });

    it("handles multiline commands (takes first line)", () => {
      const multiline = `echo "first"
echo "second"`;
      expect(validator.extractCommandBinary(multiline)).toBe("echo");
    });

    it("returns echo for echo commands", () => {
      expect(validator.extractCommandBinary('echo "hello"')).toBe("echo");
    });

    it("returns null for empty string", () => {
      expect(validator.extractCommandBinary("")).toBeNull();
    });

    it("handles commands with quoted arguments", () => {
      expect(
        validator.extractCommandBinary("trufflehog git file://. --fail")
      ).toBe("trufflehog");
    });
  });

  describe("validateSecurityAuditLevel", () => {
    it("passes when audit uses --audit-level=high", () => {
      validator = new LefthookConfigValidator(createMockDeps());
      const _config = validator.parseYaml(validConfig);
      const result = validator.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("audit level")
      );
    });

    it("fails when audit missing --audit-level=high", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configMissingAuditLevel,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Security audit level mismatch")
      );
    });

    it("passes when audit uses bun pm scan", () => {
      const configBunScan = `
pre-push:
  commands:
    security-audit:
      run: bun pm scan
`;
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configBunScan,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("Security audit level mismatch")
      );
    });

    it("passes when no audit commands exist", () => {
      const configNoAudit = `
pre-push:
  commands:
    test:
      run: pnpm test
`;
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configNoAudit,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(true);
    });
  });

  describe("validateBranchReferences", () => {
    it("passes for valid branch references (master)", () => {
      validator = new LefthookConfigValidator(createMockDeps());
      const result = validator.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("Invalid branch reference")
      );
    });

    it("passes for valid branch references (main)", () => {
      const configMain = validConfig.replace("master", "main");
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configMain,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(true);
    });

    it("fails for invalid branch references", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configInvalidBranch,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Invalid branch reference: feature-branch")
      );
    });

    it("passes when no bundle-analysis command exists", () => {
      const configNoBundleAnalysis = `
pre-push:
  commands:
    test:
      run: pnpm test
`;
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configNoBundleAnalysis,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(true);
    });
  });

  describe("validateCommandsExist", () => {
    it("passes when all commands exist", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          commandExists: () => true,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(true);
    });

    it("fails when command not found", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          commandExists: (cmd) => cmd !== "pnpm",
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Command not found: 'pnpm'")
      );
    });

    it("skips built-in shell commands", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configWithMultilineCommand,
          commandExists: (cmd) => {
            // Should not be called for 'echo'
            if (cmd === "echo") {
              throw new Error("Should not check echo");
            }
            return true;
          },
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(true);
    });

    it("handles commands with env prefix", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configWithEnvPrefix,
          commandExists: (cmd) => cmd === "pnpm",
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(true);
    });

    it("checks each binary only once", () => {
      const checkedCommands: string[] = [];
      validator = new LefthookConfigValidator(
        createMockDeps({
          commandExists: (cmd) => {
            checkedCommands.push(cmd);
            return true;
          },
        })
      );

      validator.validate();

      // pnpm appears multiple times but should only be checked once
      const pnpmChecks = checkedCommands.filter((c) => c === "pnpm");
      expect(pnpmChecks.length).toBe(1);
    });
  });

  describe("validate", () => {
    it("returns valid result for correct configuration", () => {
      validator = new LefthookConfigValidator(createMockDeps());

      const result = validator.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("returns error when config file not found", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          fileExists: () => false,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("not found")
      );
    });

    it("returns error on YAML parsing failure", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => "invalid: yaml: content:",
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("YAML parsing error")
      );
    });

    it("uses custom config path when provided", () => {
      let calledPath = "";
      validator = new LefthookConfigValidator(
        createMockDeps({
          fileExists: (path) => {
            calledPath = path;
            return true;
          },
        })
      );

      validator.validate("custom-lefthook.yml");

      expect(calledPath).toBe("custom-lefthook.yml");
    });

    it("collects multiple errors", () => {
      const configMultipleErrors = `
pre-push:
  commands:
    security-audit:
      run: pnpm audit
    bundle-analysis:
      run: pnpm analyze
      only:
        - ref: bad-branch
`;
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: () => configMultipleErrors,
          commandExists: () => false,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("integration test with actual config", () => {
    it("validates the real .lefthook.yml file", async () => {
      // This test uses actual filesystem - will be skipped in CI if file doesn't exist
      const fs = await import("fs");

      if (!fs.existsSync(".lefthook.yml")) {
        return; // Skip if running in environment without config
      }

      // Use real deps but mock commandExists to avoid CI failures
      const realDeps: ValidatorDeps = {
        readFile: (path) => fs.readFileSync(path, "utf8"),
        fileExists: (path) => fs.existsSync(path),
        commandExists: () => true, // Assume all commands exist
      };

      validator = new LefthookConfigValidator(realDeps);
      const result = validator.validate();

      expect(result.valid).toBe(true);
    });
  });
});

describe("error message formatting", () => {
  it("includes emoji prefix in error messages", () => {
    const validator = new LefthookConfigValidator(
      createMockDeps({
        fileExists: () => false,
      })
    );

    const result = validator.validate();

    expect(result.errors[0]).toMatch(/^❌/);
  });

  it("includes context in command not found errors", () => {
    const validator = new LefthookConfigValidator(
      createMockDeps({
        commandExists: () => false,
      })
    );

    const result = validator.validate();
    const commandError = result.errors.find((e) =>
      e.includes("Command not found")
    );

    expect(commandError).toContain("used in");
    expect(commandError).toMatch(/pre-commit|pre-push|commit-msg/);
  });
});
