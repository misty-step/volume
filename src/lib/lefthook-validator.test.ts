// @vitest-environment node

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

import { describe, it, expect, beforeEach, vi } from "vitest";
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
      run: bun run test:coverage
    security-audit:
      run: bun run security:audit
    architecture-check:
      run: bun run architecture:check
    build-and-analyze:
      run: bun run analyze
      only:
        - ref: master

commit-msg:
  commands:
    commitlint:
      run: bunx commitlint --edit {1}
`;

const packageJsonWithValidAuditScript = JSON.stringify({
  scripts: {
    "security:audit": "bun audit --audit-level=high",
    "architecture:check": "bun run architecture:cycles",
  },
});

const configMissingAuditCommand = `
pre-push:
  commands:
    test:
      run: bun run test
`;

const configMissingPrePushHook = `
pre-commit:
  commands:
    lint:
      run: bun run lint
`;

const configMissingPrePushCommands = `
pre-push:
  parallel: true
`;

const configInvalidAuditCommand = `
pre-push:
  commands:
    security-audit:
      run: bun audit --audit-level=high
    architecture-check:
      run: bun run architecture:check
`;

const configMissingArchitectureCommand = `
pre-push:
  commands:
    test-suite:
      run: bun run test:coverage
    security-audit:
      run: bun run security:audit
`;

const configInvalidArchitectureCommand = `
pre-push:
  commands:
    security-audit:
      run: bun run security:audit
    architecture-check:
      run: tsx scripts/check-circular-deps.ts
`;

const configInvalidBranch = `
pre-push:
  commands:
    build-and-analyze:
      run: bun run analyze
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

pre-push:
  commands:
    security-audit:
      run: bun run security:audit
    architecture-check:
      run: bun run architecture:check
`;

const configWithEnvPrefix = `
pre-push:
  commands:
    test-suite:
      run: NODE_ENV=test CI=true bun run test:coverage
    security-audit:
      run: bun run security:audit
    architecture-check:
      run: bun run architecture:check
`;

function createMockDeps(overrides: Partial<ValidatorDeps> = {}): ValidatorDeps {
  return {
    readFile: (path) =>
      path === "package.json" ? packageJsonWithValidAuditScript : validConfig,
    fileExists: (path) => path === ".lefthook.yml" || path === "package.json",
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
      const buildAndAnalyze =
        config["pre-push"]?.commands?.["build-and-analyze"];

      expect(buildAndAnalyze?.only).toEqual([{ ref: "master" }]);
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

  describe("validateSecurityAuditCommand", () => {
    it("passes when Lefthook runs bun run security:audit", () => {
      validator = new LefthookConfigValidator(createMockDeps());
      const result = validator.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("Security audit")
      );
    });

    it("fails when the security-audit command is missing", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configMissingAuditCommand,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Missing security-audit pre-push command")
      );
    });

    it("fails when the pre-push hook is missing entirely", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configMissingPrePushHook,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Missing pre-push hook")
      );
    });

    it("fails when the pre-push hook has no commands", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configMissingPrePushCommands,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Missing pre-push commands")
      );
    });

    it("fails when the security-audit command bypasses the package script", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configInvalidAuditCommand,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Security audit command mismatch")
      );
    });

    it("fails when package.json defines a different audit script", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? JSON.stringify({
                  scripts: {
                    "security:audit": "bun audit",
                  },
                })
              : validConfig,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Security audit script mismatch")
      );
    });
  });

  describe("validateArchitectureCheckCommand", () => {
    it("passes when Lefthook runs bun run architecture:check", () => {
      validator = new LefthookConfigValidator(createMockDeps());
      const result = validator.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("architecture-check")
      );
    });

    it("fails when the architecture-check command is missing", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configMissingArchitectureCommand,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Missing architecture-check pre-push command")
      );
    });

    it("fails when the architecture-check command bypasses the package script", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configInvalidArchitectureCommand,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Architecture check command mismatch")
      );
    });

    it("fails when package.json defines a different architecture script", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? JSON.stringify({
                  scripts: {
                    "security:audit": "bun audit --audit-level=high",
                    "architecture:check": "tsx scripts/check-circular-deps.ts",
                  },
                })
              : validConfig,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Architecture check script mismatch")
      );
    });
  });

  describe("resolvePackageJsonPath", () => {
    it("uses package.json next to the config file when present", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          fileExists: (path) =>
            path === "configs/.lefthook.yml" || path === "configs/package.json",
        })
      );

      expect(validator.resolvePackageJsonPath("configs/.lefthook.yml")).toBe(
        "configs/package.json"
      );
    });

    it("falls back to the repo root package.json when adjacent file is absent", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          fileExists: (path) =>
            path === "configs/.lefthook.yml" || path === "package.json",
        })
      );

      expect(validator.resolvePackageJsonPath("configs/.lefthook.yml")).toBe(
        "package.json"
      );
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
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configMain,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(true);
    });

    it("fails for invalid branch references", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configInvalidBranch,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Invalid branch reference: feature-branch")
      );
    });

    it("fails for invalid skip branch references", () => {
      const configInvalidSkipBranch = `
pre-push:
  commands:
    security-audit:
      run: bun run security:audit
    build-check:
      run: bun run build
      skip:
        - ref: typo-branch
`;
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configInvalidSkipBranch,
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Invalid branch reference: typo-branch")
      );
    });

    it("passes when no build-and-analyze command exists", () => {
      const configNoBuildAndAnalyze = `
pre-push:
  commands:
    test:
      run: bun run test
    security-audit:
      run: bun run security:audit
    architecture-check:
      run: bun run architecture:check
`;
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configNoBuildAndAnalyze,
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
          commandExists: (cmd) => cmd !== "bun",
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("Command not found: 'bun'")
      );
    });

    it("skips built-in shell commands", () => {
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configWithMultilineCommand,
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
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configWithEnvPrefix,
          commandExists: (cmd) => cmd === "bun",
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

      const bunChecks = checkedCommands.filter((c) => c === "bun");
      const bunxChecks = checkedCommands.filter((c) => c === "bunx");

      expect(bunChecks.length).toBe(1);
      expect(bunxChecks.length).toBe(1);
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
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : "invalid: yaml: content:",
        })
      );

      const result = validator.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("YAML parsing error")
      );
    });

    it("uses custom config path when provided", () => {
      const calledPaths: string[] = [];
      validator = new LefthookConfigValidator(
        createMockDeps({
          fileExists: (path) => {
            calledPaths.push(path);
            return true;
          },
        })
      );

      validator.validate("custom-lefthook.yml");

      expect(calledPaths[0]).toBe("custom-lefthook.yml");
    });

    it("reads package.json relative to the config path when available", () => {
      const readPaths: string[] = [];
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) => {
            readPaths.push(path);
            return path === "configs/package.json"
              ? packageJsonWithValidAuditScript
              : validConfig;
          },
          fileExists: (path) =>
            path === "configs/.lefthook.yml" || path === "configs/package.json",
        })
      );

      const result = validator.validate("configs/.lefthook.yml");

      expect(result.valid).toBe(true);
      expect(readPaths).toContain("configs/package.json");
    });

    it("collects multiple errors", () => {
      const configMultipleErrors = `
pre-push:
  commands:
    security-audit:
      run: pnpm audit
    build-and-analyze:
      run: bun run analyze
      only:
        - ref: bad-branch
`;
      validator = new LefthookConfigValidator(
        createMockDeps({
          readFile: (path) =>
            path === "package.json"
              ? packageJsonWithValidAuditScript
              : configMultipleErrors,
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

describe("printResults", () => {
  it("should log errors to stderr when validation fails", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const validator = new LefthookConfigValidator(createMockDeps());

    validator.printResults({
      valid: false,
      errors: ["❌ Config not found"],
      warnings: [],
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Validation Failed")
    );
    expect(errorSpy).toHaveBeenCalledWith("❌ Config not found");
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("should log warnings to stderr via console.warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const validator = new LefthookConfigValidator(createMockDeps());

    validator.printResults({
      valid: true,
      errors: [],
      warnings: ["⚠️ Deprecated pattern"],
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Warnings"));
    expect(warnSpy).toHaveBeenCalledWith("⚠️ Deprecated pattern");
    warnSpy.mockRestore();
  });

  it("should log success to stdout when valid with no warnings", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const validator = new LefthookConfigValidator(createMockDeps());

    validator.printResults({
      valid: true,
      errors: [],
      warnings: [],
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Validation Passed")
    );
    logSpy.mockRestore();
    warnSpy.mockRestore();
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
