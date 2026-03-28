export type StoredCoachMessage = {
  _id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  blocks?: string;
  turnId?: string;
  createdAt: number;
  summarizedAt?: number;
};

function isStartOfTurn(messages: StoredCoachMessage[], index: number): boolean {
  if (index <= 0) {
    return true;
  }

  const current = messages[index]!;
  const previous = messages[index - 1]!;

  if (current.turnId && current.turnId !== previous.turnId) {
    return true;
  }

  return current.role === "user";
}

export function sliceRecentWholeTurns(
  messages: StoredCoachMessage[],
  windowSize: number
): StoredCoachMessage[] {
  if (messages.length <= windowSize) {
    return messages;
  }

  const candidateStart = Math.max(messages.length - windowSize, 0);

  if (isStartOfTurn(messages, candidateStart)) {
    return messages.slice(candidateStart);
  }

  for (let index = candidateStart + 1; index < messages.length; index += 1) {
    if (isStartOfTurn(messages, index)) {
      return messages.slice(index);
    }
  }

  let start = candidateStart;
  while (start > 0 && !isStartOfTurn(messages, start)) {
    start -= 1;
  }

  return messages.slice(start);
}
