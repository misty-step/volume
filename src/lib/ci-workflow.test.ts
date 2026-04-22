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
      steps?: Array<{
        id?: string;
        name?: string;
        run?: string;
        uses?: string;
        with?: Record<string, string>;
      }>;
    }
  >;
}

const repoRoot = path.resolve(import.meta.dirname, "../..");

function readCiWorkflow(): WorkflowConfig {
  const workflowPath = path.join(repoRoot, ".github/workflows/ci.yml");
  return yaml.load(fs.readFileSync(workflowPath, "utf8")) as WorkflowConfig;
}

describe("ci workflow contract", () => {
  it("keeps ci.yml to a single merge-gate wrapper job", () => {
    const workflow = readCiWorkflow();

    expect(Object.keys(workflow.jobs ?? {})).toEqual(["merge-gate"]);
  });

  it("runs the canonical Dagger check from merge-gate", () => {
    const workflow = readCiWorkflow();
    const mergeGateSteps = workflow.jobs?.["merge-gate"]?.steps ?? [];
    const daggerStep = mergeGateSteps.find(
      (step) =>
        step.id === "dagger" ||
        step.uses?.startsWith("dagger/dagger-for-github@")
    );

    expect(daggerStep).toBeDefined();
    expect(daggerStep?.uses).toMatch(/^dagger\/dagger-for-github@/);
    expect(daggerStep?.with?.call).toBe("check --source=.");
  });

  it("keeps PR status publication inside the merge-gate wrapper", () => {
    const workflow = readCiWorkflow();
    const mergeGateSteps = workflow.jobs?.["merge-gate"]?.steps ?? [];
    const statusStep = mergeGateSteps.find(
      (step) => step.name === "Publish merge-gate status on PR head"
    );

    expect(statusStep?.run).toContain('context="merge-gate"');
  });
});
