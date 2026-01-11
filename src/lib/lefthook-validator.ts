/**
 * Lefthook Configuration Validator
 *
 * Validates .lefthook.yml for:
 * - YAML syntax correctness
 * - Security audit level consistency with CI
 * - Valid branch references
 * - Command existence in PATH
 */

import * as fs from "fs";
import * as yaml from "js-yaml";
import { execSync } from "child_process";

// ============================================================================
// Types
// ============================================================================

interface CommandConfig {
  run?: string;
  glob?: string;
  only?: Array<{ ref: string }>;
  stage_fixed?: boolean;
  fail_text?: string;
  interactive?: boolean;
}

interface HookConfig {
  parallel?: boolean;
  commands?: Record<string, CommandConfig>;
}

export interface LefthookConfig {
  "pre-commit"?: HookConfig;
  "pre-push"?: HookConfig;
  "commit-msg"?: HookConfig;
  "post-checkout"?: HookConfig;
}

export interface ValidatorDeps {
  readFile: (path: string) => string;
  fileExists: (path: string) => boolean;
  commandExists: (cmd: string) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Default Dependencies
// ============================================================================

export const defaultDeps: ValidatorDeps = {
  readFile: (path: string) => fs.readFileSync(path, "utf8"),
  fileExists: (path: string) => fs.existsSync(path),
  commandExists: (cmd: string) => {
    try {
      execSync(`which ${cmd}`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  },
};

// ============================================================================
// Validator Class
// ============================================================================

export class LefthookConfigValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(private deps: ValidatorDeps = defaultDeps) {}

  /**
   * Parse YAML content into typed config
   */
  parseYaml(content: string): LefthookConfig {
    return yaml.load(content) as LefthookConfig;
  }

  /**
   * Extract the binary name from a run command
   * e.g., "pnpm eslint --fix" -> "pnpm"
   * e.g., "NODE_ENV=test CI=true pnpm test" -> "pnpm"
   */
  extractCommandBinary(runCommand: string): string | null {
    const trimmed = runCommand.trim();

    // Handle multiline commands (take first line)
    const firstLine = trimmed.split("\n")[0]?.trim();
    if (!firstLine) return null;

    // Skip echo/env variable assignments
    if (firstLine.startsWith("echo ")) return "echo";

    // Handle multiple env prefix patterns (e.g., NODE_ENV=test CI=true)
    // Keep removing env prefixes until we get to the actual command
    let withoutEnv = firstLine;
    while (/^[A-Z_]+=\S+\s+/.test(withoutEnv)) {
      withoutEnv = withoutEnv.replace(/^[A-Z_]+=\S+\s+/, "");
    }

    // Get first word
    const binary = withoutEnv.split(/\s+/)[0];
    return binary ?? null;
  }

  /**
   * Validate that security audit uses --audit-level=high
   */
  validateSecurityAuditLevel(config: LefthookConfig): void {
    const prePushConfig = config["pre-push"];
    if (!prePushConfig?.commands) return;

    const auditCommands = Object.entries(prePushConfig.commands).filter(
      ([name, cmd]) =>
        cmd.run && (cmd.run.includes("audit") || name.includes("audit"))
    );

    if (auditCommands.length === 0) return;

    const usesHighLevel = auditCommands.some(([, cmd]) =>
      cmd.run?.includes("--audit-level=high")
    );

    if (!usesHighLevel) {
      this.errors.push(
        "❌ Security audit level mismatch: Lefthook should use --audit-level=high to match CI"
      );
    }
  }

  /**
   * Validate branch references in 'only' conditions
   */
  validateBranchReferences(config: LefthookConfig): void {
    const bundleAnalysis = config["pre-push"]?.commands?.["bundle-analysis"];
    if (!bundleAnalysis?.only) return;

    const commonBranches = ["main", "master", "develop"];
    const onlyRefs = bundleAnalysis.only;

    const invalidRefs = onlyRefs.filter((refObj) => {
      const branchName = refObj.ref;
      return !commonBranches.includes(branchName);
    });

    if (invalidRefs.length > 0) {
      invalidRefs.forEach((refObj) => {
        this.errors.push(
          `❌ Invalid branch reference: ${refObj.ref} in bundle-analysis`
        );
      });
    }
  }

  /**
   * Validate that all command binaries exist in PATH
   */
  validateCommandsExist(config: LefthookConfig): void {
    const hooks: Array<keyof LefthookConfig> = [
      "pre-commit",
      "pre-push",
      "commit-msg",
      "post-checkout",
    ];

    const checkedBinaries = new Set<string>();

    for (const hookName of hooks) {
      const hook = config[hookName];
      if (!hook?.commands) continue;

      for (const [cmdName, cmdConfig] of Object.entries(hook.commands)) {
        if (!cmdConfig.run) continue;

        const binary = this.extractCommandBinary(cmdConfig.run);
        if (!binary || checkedBinaries.has(binary)) continue;

        checkedBinaries.add(binary);

        // Skip built-in shell commands
        if (["echo", "cat", "true", "false"].includes(binary)) continue;

        if (!this.deps.commandExists(binary)) {
          this.errors.push(
            `❌ Command not found: '${binary}' (used in ${hookName}:${cmdName})`
          );
        }
      }
    }
  }

  /**
   * Validate the complete configuration
   */
  validate(configPath: string = ".lefthook.yml"): ValidationResult {
    this.errors = [];
    this.warnings = [];

    if (!this.deps.fileExists(configPath)) {
      this.errors.push(`❌ ${configPath} not found`);
      return { valid: false, errors: this.errors, warnings: this.warnings };
    }

    try {
      const content = this.deps.readFile(configPath);
      const config = this.parseYaml(content);

      this.validateSecurityAuditLevel(config);
      this.validateBranchReferences(config);
      this.validateCommandsExist(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.errors.push(`❌ YAML parsing error: ${message}`);
    }

    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
    };
  }

  /**
   * Print results to console
   */
  printResults(result: ValidationResult): void {
    if (!result.valid) {
      console.error("\n❌ Configuration Validation Failed");
      result.errors.forEach((error) => console.error(error));
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.log("\n⚠️ Configuration Warnings");
      result.warnings.forEach((warning) => console.log(warning));
    }

    if (result.valid && result.warnings.length === 0) {
      console.log("\n✅ Configuration Validation Passed");
      console.log("No configuration inconsistencies detected");
    }
  }
}
