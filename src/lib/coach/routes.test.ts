import { describe, expect, it } from "vitest";
import { buildCoachPromptPath, COACH_HOME_PATH } from "@/lib/coach/routes";

describe("coach routes", () => {
  it("uses the root route as the canonical coach home", () => {
    expect(COACH_HOME_PATH).toBe("/");
  });

  it("builds prompt deeplinks on the root route", () => {
    expect(buildCoachPromptPath("show history overview")).toBe(
      "/?prompt=show%20history%20overview"
    );
  });
});
