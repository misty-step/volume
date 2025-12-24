#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Simple Lefthook configuration validation
 */
class LefthookConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    const configPath = ".lefthook.yml";

    if (!fs.existsSync(configPath)) {
      this.errors.push("❌ .lefthook.yml not found");
      return false;
    }

    try {
      const config = this.parseYaml(fs.readFileSync(configPath, "utf8"));

      this.validateSecurityAuditLevel(config);
      this.validateBranchReferences(config);
    } catch (error) {
      this.errors.push(`❌ YAML parsing error: ${error.message}`);
      return false;
    }

    return this.errors.length === 0;
  }

  parseYaml(yamlContent) {
    // Simple YAML parsing for basic structure
    const lines = yamlContent.split("\n");
    const config = {
      "pre-commit": {},
      "pre-push": {},
      "commit-msg": {},
      "post-checkout": {},
    };
    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Detect sections
      if (trimmed.endsWith(":")) {
        currentSection = trimmed.slice(0, -1).trim();
        if (!config[currentSection]) {
          config[currentSection] = { commands: {} };
        }
        continue;
      }

      // Skip section headers
      if (trimmed.endsWith(":")) continue;

      // Parse commands
      const commandMatch = trimmed.match(/^(.+?):\s*(.+)$/);
      if (commandMatch && currentSection) {
        const [, indent, command] = commandMatch;
        const cleanedCommand = command.trim();

        // Skip non-command lines
        if (!cleanedCommand || !cleanedCommand.includes("run:")) continue;

        const commandName = cleanedCommand.split(":")[0].trim();
        const commandRun = cleanedCommand
          .split(":")[1]
          .trim()
          .replace(/['"]/g, "");

        config[currentSection].commands[commandName] = { run: commandRun };
      }
    }

    return config;
  }

  validateSecurityAuditLevel(config) {
    const prePushConfig = config["pre-push"];
    if (!prePushConfig) return;

    const auditCommands = Object.entries(prePushConfig.commands || {}).filter(
      ([name, cmd]) =>
        cmd.run && (cmd.run.includes("audit") || name.includes("audit"))
    );

    if (auditCommands.length === 0) return;

    // Check for --audit-level=high (should match CI)
    const usesHighLevel = auditCommands.some(([name, cmd]) =>
      cmd.run.includes("--audit-level=high")
    );

    if (!usesHighLevel) {
      this.errors.push(
        "❌ Security audit level mismatch: Lefthook should use --audit-level=high to match CI"
      );
    }
  }

  validateBranchReferences(config) {
    const bundleAnalysis = config["pre-push"]?.commands?.["bundle-analysis"];
    if (!bundleAnalysis?.only) return;

    const commonBranches = ["main", "master", "develop"];
    const onlyRefs = Array.isArray(bundleAnalysis.only)
      ? bundleAnalysis.only
      : [];
    const invalidRefs = onlyRefs.filter((ref) => {
      const branchName = ref.startsWith("ref:") ? ref.substring(5) : ref;
      return !commonBranches.includes(branchName);
    });

    if (invalidRefs.length > 0) {
      invalidRefs.forEach((ref) => {
        const branchName = ref.startsWith("ref:") ? ref.substring(5) : ref;
        this.errors.push(
          `❌ Invalid branch reference: ${branchName} in bundle-analysis`
        );
      });
    }
  }

  printResults() {
    if (this.errors.length > 0) {
      console.error("\n❌ Configuration Validation Failed");
      this.errors.forEach((error) => console.error(error));
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      console.log("\n⚠️ Configuration Warnings");
      this.warnings.forEach((warning) => console.log(warning));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log("\n✅ Configuration Validation Passed");
      console.log("No configuration inconsistencies detected");
    }
  }
}

// Simple interface
const validator = new LefthookConfigValidator();
validator.validate();
validator.printResults();
