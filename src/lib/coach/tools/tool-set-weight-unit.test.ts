import { describe, expect, it } from "vitest";
import { runSetWeightUnitTool } from "./tool-set-weight-unit";

describe("runSetWeightUnitTool", () => {
  it("unit:'lbs' -> status title contains 'LBS', client_action payload.unit==='lbs'", () => {
    const result = runSetWeightUnitTool({ unit: "lbs" });
    const status = result.blocks.find((b) => b.type === "status");
    const action = result.blocks.find((b) => b.type === "client_action");
    expect((status as { title: string }).title).toMatch(/LBS/);
    expect(
      (action as { action: string; payload: { unit: string } }).action
    ).toBe("set_weight_unit");
    expect((action as { payload: { unit: string } }).payload.unit).toBe("lbs");
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.unit).toBe("lbs");
  });

  it("unit:'kg' -> status title contains 'KG'", () => {
    const result = runSetWeightUnitTool({ unit: "kg" });
    const status = result.blocks.find((b) => b.type === "status");
    expect((status as { title: string }).title).toMatch(/KG/);
    expect(result.outputForModel.unit).toBe("kg");
  });

  it("invalid unit 'pounds' -> throws ZodError", () => {
    expect(() => runSetWeightUnitTool({ unit: "pounds" })).toThrow();
  });

  it("outputForModel.status is always 'ok'", () => {
    expect(runSetWeightUnitTool({ unit: "lbs" }).outputForModel.status).toBe(
      "ok"
    );
    expect(runSetWeightUnitTool({ unit: "kg" }).outputForModel.status).toBe(
      "ok"
    );
  });

  it("missing unit field -> throws", () => {
    expect(() => runSetWeightUnitTool({})).toThrow();
  });
});
