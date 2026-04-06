// @vitest-environment node

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";

interface WorkflowConfig {
  jobs?: Record<
    string,
    {
      needs?: string[] | string;
      steps?: Array<{ run?: string }>;
    }
  >;
}

const repoRoot = path.resolve(import.meta.dirname, "../..");

function readCiWorkflow(): WorkflowConfig {
  const workflowPath = path.join(repoRoot, ".github/workflows/ci.yml");
  return yaml.load(fs.readFileSync(workflowPath, "utf8")) as WorkflowConfig;
}

describe("ci workflow contract", () => {
  it("defines an architecture job", () => {
    const workflow = readCiWorkflow();

    expect(workflow.jobs?.architecture).toBeDefined();
  });

  it("keeps architecture in merge-gate dependencies", () => {
    const workflow = readCiWorkflow();
    const mergeGateNeeds = workflow.jobs?.["merge-gate"]?.needs;
    const needs = Array.isArray(mergeGateNeeds)
      ? mergeGateNeeds
      : mergeGateNeeds
        ? [mergeGateNeeds]
        : [];

    expect(needs).toContain("architecture");
  });

  it("runs the architecture checker in the architecture job", () => {
    const workflow = readCiWorkflow();
    const architectureRuns =
      workflow.jobs?.architecture?.steps
        ?.map((step) => step.run?.trim())
        .filter((run): run is string => Boolean(run)) ?? [];

    expect(architectureRuns).toContain("bun run architecture:check");
  });
});
