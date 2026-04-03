#!/usr/bin/env bun
/**
 * CLI wrapper for ArchitectureChecker
 *
 * This script is invoked by CI and Lefthook.
 * The actual verifier logic lives in src/lib/architecture-checker.ts
 */

import { ArchitectureChecker } from "../src/lib/architecture-checker";

try {
  const checker = new ArchitectureChecker();
  const result = checker.check();
  checker.printResult(result);

  if (!result.passed) {
    process.exit(1);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\n❌ Architecture verification crashed");
  console.error(message);
  process.exit(1);
}
