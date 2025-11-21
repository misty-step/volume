import { describe, it, expect } from "vitest";
import { EventDefinitions, AnalyticsEventName } from "../events";

describe("EventCatalog", () => {
  it("should have metadata for every defined event", () => {
    const eventNames = Object.keys(EventDefinitions) as AnalyticsEventName[];
    expect(eventNames.length).toBeGreaterThan(0);

    eventNames.forEach((name) => {
      const meta = EventDefinitions[name];
      expect(meta).toBeDefined();
      expect(meta.description).toBeTruthy();
      expect(meta.owner).toMatch(/^(growth|product|platform)$/);
      expect(Array.isArray(meta.required)).toBe(true);
    });
  });

  it("should define required fields correctly", () => {
    const setLogged = EventDefinitions["Set Logged"];
    expect(setLogged.required).toContain("setId");
    expect(setLogged.required).toContain("exerciseId");
    expect(setLogged.required).toContain("reps");
  });

  it("should mark PII fields", () => {
    const exerciseCreated = EventDefinitions["Exercise Created"];
    expect(exerciseCreated.piiFields).toContain("userId");
  });
});
