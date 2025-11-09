import { describe, expect, it } from "vitest";
import { resolveSignedInState } from "./HomeContent";

describe("resolveSignedInState", () => {
  it("returns initial state while auth is loading", () => {
    expect(
      resolveSignedInState({
        initialSignedIn: false,
        isLoaded: false,
        userId: null,
      })
    ).toBe(false);

    expect(
      resolveSignedInState({
        initialSignedIn: true,
        isLoaded: false,
        userId: null,
      })
    ).toBe(true);
  });

  it("returns true when auth is loaded with a user", () => {
    expect(
      resolveSignedInState({
        initialSignedIn: false,
        isLoaded: true,
        userId: "user_123",
      })
    ).toBe(true);
  });

  it("returns false when auth is loaded without a user", () => {
    expect(
      resolveSignedInState({
        initialSignedIn: true,
        isLoaded: true,
        userId: null,
      })
    ).toBe(false);
  });
});
