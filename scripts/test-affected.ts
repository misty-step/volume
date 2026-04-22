#!/usr/bin/env bun

import { execFileSync, spawnSync } from "child_process";
import {
  buildAffectedVitestArgs,
  selectAffectedBaseRef,
} from "../src/lib/test-affected";

const BASE_REF_CANDIDATES = ["origin/master", "master"] as const;

function gitRefExists(ref: string): boolean {
  try {
    execFileSync(
      "git",
      ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`],
      {
        stdio: "ignore",
      }
    );
    return true;
  } catch {
    return false;
  }
}

const changedFiles = process.argv.slice(2);
const baseRef = selectAffectedBaseRef(BASE_REF_CANDIDATES.filter(gitRefExists));
const vitestArgs = buildAffectedVitestArgs({ changedFiles, baseRef });

const result = spawnSync("bun", ["x", "vitest", ...vitestArgs], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
