import { describe, it, expect } from "vitest";
import { suggestNextSet, wouldBePR } from "./set-suggestion-engine";
import type { Set } from "@/types/domain";

// Test helpers
const createSet = (overrides: Partial<Set> = {}): Set => ({
  _id: "set123" as any,
  _creationTime: 0,
  userId: "user123",
  exerciseId: "exercise123" as any,
  reps: 10,
  weight: 135,
  performedAt: Date.now(),
  ...overrides,
});

describe("Set Suggestion Engine", () => {
  describe("suggestNextSet", () => {
    describe("No Last Set", () => {
      it("returns null when no last set provided", () => {
        expect(suggestNextSet(null, "lbs")).toBeNull();
      });
    });

    describe("Rep-Based Exercises - Bodyweight", () => {
      it("suggests +1 rep for bodyweight exercises", () => {
        const lastSet = createSet({ reps: 10, weight: 0 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          reps: 11,
          strategy: "increase-reps",
          isPotentialPR: true,
        });
        expect(suggestion?.reasoning).toContain("endurance");
      });

      it("continues progression beyond 20 reps for bodyweight", () => {
        const lastSet = createSet({ reps: 20, weight: 0 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          reps: 21,
          strategy: "increase-reps",
          isPotentialPR: true,
        });
      });
    });

    describe("Rep-Based Exercises - Weighted (Double Progression)", () => {
      it("suggests +1 rep when below target (12 reps)", () => {
        const lastSet = createSet({ reps: 10, weight: 135 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          reps: 11,
          weight: 135,
          strategy: "increase-reps",
          isPotentialPR: true,
        });
        expect(suggestion?.reasoning).toContain("endurance");
        expect(suggestion?.reasoning).toContain("target: 12");
      });

      it("suggests +5 lbs when at target reps (12)", () => {
        const lastSet = createSet({ reps: 12, weight: 135 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          reps: 10, // Reset to target-2
          weight: 140, // +5 lbs
          strategy: "increase-weight",
          isPotentialPR: true,
        });
        expect(suggestion?.reasoning).toContain("add weight");
        expect(suggestion?.reasoning).toContain("+5 lbs");
      });

      it("suggests +2.5 kg when at target reps (unit: kg)", () => {
        const lastSet = createSet({ reps: 12, weight: 60 });
        const suggestion = suggestNextSet(lastSet, "kg");

        expect(suggestion).toMatchObject({
          reps: 10,
          weight: 62.5, // +2.5 kg
          strategy: "increase-weight",
        });
        expect(suggestion?.reasoning).toContain("+2.5 kg");
      });

      it("suggests +1 rep when just below target (11 reps)", () => {
        const lastSet = createSet({ reps: 11, weight: 135 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          reps: 12,
          weight: 135,
          strategy: "increase-reps",
        });
      });

      it("suggests +5 lbs when above target (13+ reps)", () => {
        const lastSet = createSet({ reps: 15, weight: 135 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          reps: 10,
          weight: 140,
          strategy: "increase-weight",
        });
      });
    });

    describe("Duration-Based Exercises", () => {
      it("suggests +5 seconds for duration exercises", () => {
        const lastSet = createSet({
          duration: 60,
          reps: undefined,
          weight: undefined,
        });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          duration: 65,
          strategy: "increase-duration",
          isPotentialPR: true,
        });
        expect(suggestion?.reasoning).toContain("+5 seconds");
      });

      it("marks duration increase as potential PR", () => {
        const lastSet = createSet({
          duration: 30,
          reps: undefined,
          weight: undefined,
        });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion?.isPotentialPR).toBe(true);
      });
    });

    describe("Edge Cases", () => {
      it("handles reps at exactly target (12)", () => {
        const lastSet = createSet({ reps: 12, weight: 100 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion?.strategy).toBe("increase-weight");
        expect(suggestion?.weight).toBe(105);
      });

      it("handles very low reps (1 rep)", () => {
        const lastSet = createSet({ reps: 1, weight: 200 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          reps: 2,
          weight: 200,
          strategy: "increase-reps",
        });
      });

      it("handles zero weight as bodyweight", () => {
        const lastSet = createSet({ reps: 5, weight: 0 });
        const suggestion = suggestNextSet(lastSet, "lbs");

        expect(suggestion).toMatchObject({
          reps: 6,
          strategy: "increase-reps",
        });
        expect(suggestion?.weight).toBeUndefined();
      });
    });
  });

  describe("wouldBePR", () => {
    it("returns false if no historical best", () => {
      const suggestion = {
        reps: 11,
        weight: 135,
        reasoning: "test",
        strategy: "increase-reps" as const,
        isPotentialPR: true,
      };

      expect(wouldBePR(suggestion, null)).toBe(false);
    });

    it("returns false if suggestion not marked as potential PR", () => {
      const suggestion = {
        reps: 10,
        weight: 135,
        reasoning: "test",
        strategy: "maintain" as const,
        isPotentialPR: false,
      };
      const historicalBest = createSet({ reps: 10, weight: 135 });

      expect(wouldBePR(suggestion, historicalBest)).toBe(false);
    });

    it("returns true for more reps at same weight", () => {
      const suggestion = {
        reps: 11,
        weight: 135,
        reasoning: "test",
        strategy: "increase-reps" as const,
        isPotentialPR: true,
      };
      const historicalBest = createSet({ reps: 10, weight: 135 });

      expect(wouldBePR(suggestion, historicalBest)).toBe(true);
    });

    it("returns true for more weight at same reps", () => {
      const suggestion = {
        reps: 10,
        weight: 140,
        reasoning: "test",
        strategy: "increase-weight" as const,
        isPotentialPR: true,
      };
      const historicalBest = createSet({ reps: 10, weight: 135 });

      expect(wouldBePR(suggestion, historicalBest)).toBe(true);
    });

    it("returns true for more weight even with fewer reps", () => {
      const suggestion = {
        reps: 8,
        weight: 200,
        reasoning: "test",
        strategy: "increase-weight" as const,
        isPotentialPR: true,
      };
      const historicalBest = createSet({ reps: 10, weight: 185 });

      expect(wouldBePR(suggestion, historicalBest)).toBe(true);
    });

    it("returns false for same reps at same weight", () => {
      const suggestion = {
        reps: 10,
        weight: 135,
        reasoning: "test",
        strategy: "maintain" as const,
        isPotentialPR: false,
      };
      const historicalBest = createSet({ reps: 10, weight: 135 });

      expect(wouldBePR(suggestion, historicalBest)).toBe(false);
    });

    it("returns true for longer duration", () => {
      const suggestion = {
        duration: 65,
        reasoning: "test",
        strategy: "increase-duration" as const,
        isPotentialPR: true,
      };
      const historicalBest = createSet({
        duration: 60,
        reps: undefined,
        weight: undefined,
      });

      expect(wouldBePR(suggestion, historicalBest)).toBe(true);
    });

    it("returns false for same duration", () => {
      const suggestion = {
        duration: 60,
        reasoning: "test",
        strategy: "maintain" as const,
        isPotentialPR: false,
      };
      const historicalBest = createSet({
        duration: 60,
        reps: undefined,
        weight: undefined,
      });

      expect(wouldBePR(suggestion, historicalBest)).toBe(false);
    });
  });

  describe("Double Progression Strategy", () => {
    it("follows complete double progression cycle", () => {
      // Start: 10 reps @ 100 lbs
      let lastSet = createSet({ reps: 10, weight: 100 });
      let suggestion = suggestNextSet(lastSet, "lbs");

      // Session 1: Should suggest 11 reps @ 100 lbs
      expect(suggestion).toMatchObject({ reps: 11, weight: 100 });

      // Session 2: User hits 11 reps @ 100 lbs
      lastSet = createSet({ reps: 11, weight: 100 });
      suggestion = suggestNextSet(lastSet, "lbs");

      // Should suggest 12 reps @ 100 lbs
      expect(suggestion).toMatchObject({ reps: 12, weight: 100 });

      // Session 3: User hits 12 reps @ 100 lbs (target reached)
      lastSet = createSet({ reps: 12, weight: 100 });
      suggestion = suggestNextSet(lastSet, "lbs");

      // Should suggest adding weight: 10 reps @ 105 lbs
      expect(suggestion).toMatchObject({ reps: 10, weight: 105 });
      expect(suggestion?.strategy).toBe("increase-weight");

      // Cycle repeats with new weight
      lastSet = createSet({ reps: 10, weight: 105 });
      suggestion = suggestNextSet(lastSet, "lbs");

      // Should suggest 11 reps @ 105 lbs
      expect(suggestion).toMatchObject({ reps: 11, weight: 105 });
    });
  });
});
