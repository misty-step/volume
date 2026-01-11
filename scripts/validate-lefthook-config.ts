#!/usr/bin/env npx tsx
/**
 * CLI wrapper for Lefthook Configuration Validator
 *
 * This script is invoked by Lefthook pre-commit hook.
 * The actual validator logic lives in src/lib/lefthook-validator.ts
 */

import { LefthookConfigValidator } from "../src/lib/lefthook-validator";

const validator = new LefthookConfigValidator();
const result = validator.validate();
validator.printResults(result);

if (!result.valid) {
  process.exit(1);
}
