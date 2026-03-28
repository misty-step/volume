import { describe, expect, it } from "vitest";

import { sliceRecentWholeTurns } from "./history";

function message(
  id: string,
  role: "user" | "assistant" | "tool",
  turnId: string | undefined,
  createdAt: number
) {
  return {
    _id: id,
    role,
    content: JSON.stringify({ role, content: id }),
    turnId,
    createdAt,
  };
}

describe("sliceRecentWholeTurns", () => {
  it("returns all messages when already within the window", () => {
    const messages = [
      message("m1", "user", "turn-1", 1),
      message("m2", "assistant", "turn-1", 2),
    ];

    expect(sliceRecentWholeTurns(messages, 5)).toEqual(messages);
  });

  it("rewinds to the start of the truncated turn when turn ids are present", () => {
    const messages = [
      message("m1", "user", "turn-1", 1),
      message("m2", "assistant", "turn-1", 2),
      message("m3", "tool", "turn-1", 3),
      message("m4", "assistant", "turn-1", 4),
      message("m5", "user", "turn-2", 5),
      message("m6", "assistant", "turn-2", 6),
      message("m7", "tool", "turn-2", 7),
    ];

    expect(
      sliceRecentWholeTurns(messages, 4).map((entry) => entry._id)
    ).toEqual(["m5", "m6", "m7"]);
  });

  it("falls back to user-message boundaries when legacy messages lack turn ids", () => {
    const messages = [
      message("m1", "user", undefined, 1),
      message("m2", "assistant", undefined, 2),
      message("m3", "tool", undefined, 3),
      message("m4", "user", undefined, 4),
      message("m5", "assistant", undefined, 5),
      message("m6", "tool", undefined, 6),
    ];

    expect(
      sliceRecentWholeTurns(messages, 4).map((entry) => entry._id)
    ).toEqual(["m4", "m5", "m6"]);
  });
});
