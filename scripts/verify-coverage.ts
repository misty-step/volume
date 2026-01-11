#!/usr/bin/env npx tsx
/**
 * CLI wrapper for Coverage Verifier
 *
 * This script is invoked by CI to verify coverage thresholds.
 * The actual verifier logic lives in src/lib/coverage-verifier.ts
 */

import { CoverageVerifier } from "../src/lib/coverage-verifier";

const verifier = new CoverageVerifier();
const result = verifier.verify();
verifier.printResult(result);

if (!result.passed) {
  process.exit(1);
}
