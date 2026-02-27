import { describe, expect, it } from "vitest";
import { runSetSoundTool } from "./tool-set-sound";

describe("runSetSoundTool", () => {
  it("enabled:true -> status block contains 'enabled', client_action payload.enabled===true", () => {
    const result = runSetSoundTool({ enabled: true });
    const status = result.blocks.find((b) => b.type === "status");
    const action = result.blocks.find((b) => b.type === "client_action");
    expect(status).toBeDefined();
    expect((status as { title: string }).title).toMatch(/enabled/i);
    expect(action).toBeDefined();
    expect(
      (action as { action: string; payload: { enabled: boolean } }).action
    ).toBe("set_sound");
    expect((action as { payload: { enabled: boolean } }).payload.enabled).toBe(
      true
    );
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.enabled).toBe(true);
  });

  it("enabled:false -> status block contains 'disabled', payload.enabled===false", () => {
    const result = runSetSoundTool({ enabled: false });
    const status = result.blocks.find((b) => b.type === "status");
    const action = result.blocks.find((b) => b.type === "client_action");
    expect((status as { title: string }).title).toMatch(/disabled/i);
    expect((action as { payload: { enabled: boolean } }).payload.enabled).toBe(
      false
    );
    expect(result.outputForModel.enabled).toBe(false);
  });

  it("invalid args (no enabled field) -> throws ZodError", () => {
    expect(() => runSetSoundTool({})).toThrow();
  });

  it("outputForModel.enabled matches input", () => {
    expect(runSetSoundTool({ enabled: true }).outputForModel.enabled).toBe(
      true
    );
    expect(runSetSoundTool({ enabled: false }).outputForModel.enabled).toBe(
      false
    );
  });

  it("outputForModel.status is always 'ok'", () => {
    expect(runSetSoundTool({ enabled: true }).outputForModel.status).toBe("ok");
    expect(runSetSoundTool({ enabled: false }).outputForModel.status).toBe(
      "ok"
    );
  });
});
