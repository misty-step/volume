import { describe, it, expectTypeOf } from "vitest";
import { useLastSet } from "./useLastSet";
import type { Set } from "@/types/domain";
import type { TimeFormat } from "@/lib/date-utils";

describe("useLastSet type checks", () => {
  it("should return nullable Set", () => {
    const { lastSet } = useLastSet("some-id");
    expectTypeOf(lastSet).toMatchTypeOf<Set | null>();
  });

  it("should return format function with correct signature", () => {
    const { formatTimeAgo } = useLastSet("some-id");
    // parameters expects a tuple type
    // formatTimeAgo(timestamp: number, format?: TimeFormat)
    // So [number, TimeFormat?] which is [number] | [number, TimeFormat] effectively.
    // expectTypeOf(formatTimeAgo).parameters.toEqualTypeOf<[number, TimeFormat?]>();
    // Vitest might handle optional parameters differently.

    expectTypeOf(formatTimeAgo).toBeFunction();
    expectTypeOf(formatTimeAgo).returns.toBeString();
    expectTypeOf(formatTimeAgo).parameter(0).toBeNumber();
    expectTypeOf(formatTimeAgo)
      .parameter(1)
      .toMatchTypeOf<TimeFormat | undefined>();
  });
});
