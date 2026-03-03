// @vitest-environment node

import { describe, expect, it } from "vitest";
import { VOLUME_TOKENS } from "@/config/design-tokens";
import { dt } from "./design-tokens";

describe("design tokens", () => {
  it("exports dt token classes used by coach blocks", () => {
    expect(dt.metric.val).toContain("text-");
    expect(dt.metric.unit).toContain("text-");
    expect(dt.block).toContain("rounded");
    expect(typeof dt.sectionTitle).toBe("string");
    expect(typeof dt.eyebrowClass).toBe("string");
  });

  it("exports VOLUME_TOKENS with typed color and typography values", () => {
    expect(typeof VOLUME_TOKENS.colors.accent).toBe("string");
    expect(typeof VOLUME_TOKENS.colors.background).toBe("string");
    expect(typeof VOLUME_TOKENS.typography.metric.value).toBe("string");
    expect(typeof VOLUME_TOKENS.motion.fadeIn).toBe("string");
    expect(typeof VOLUME_TOKENS.radius.default).toBe("string");
  });
});
