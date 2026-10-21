import {
  ChatUnavailable,
  RateLimited,
  SessionEnded,
  TokenExpired,
} from "@apollo/chat/errors";
import { describe, expect, test } from "bun:test";
import {
  applyUpdates,
  type ConversationUpdate,
  noConversation,
  rejoinPlan,
} from "../src/lib/client/chat-conversation";

describe("rejoinPlan", () => {
  test("an expired token or changed session rejoins at once, quietly, with a new token", () => {
    expect(rejoinPlan(new TokenExpired(), 0)).toEqual({
      fresh: true,
      quiet: true,
      wait: 0,
    });
    expect(rejoinPlan(new SessionEnded(), 0)).toMatchObject({ quiet: true });
  });

  test("a refusal straight after another failure backs off and shows it", () => {
    expect(rejoinPlan(new SessionEnded(), 1)).toEqual({
      fresh: true,
      quiet: false,
      wait: 2000,
    });
  });

  test("other drops back off from a second, doubling up to 15 seconds", () => {
    const waits = [0, 1, 2, 3, 4, 5].map(
      (failures) => rejoinPlan(new ChatUnavailable(), failures).wait,
    );
    expect(waits).toEqual([1000, 2000, 4000, 8000, 15_000, 15_000]);
    expect(rejoinPlan(new ChatUnavailable(), 0)).toMatchObject({
      fresh: false,
      quiet: false,
    });
  });

  test("a rate limit waits as long as the server says", () => {
    expect(rejoinPlan(new RateLimited({ retryAfterMs: 4200 }), 3).wait).toBe(
      4200,
    );
  });
});

describe("applyUpdates", () => {
  const down = (failures: number) => ({ _tag: "Down", failures }) as const;
  const caughtUp = { _tag: "CaughtUp" } as const;
  const connection = (...updates: ConversationUpdate[]) =>
    applyUpdates(noConversation, updates).connection;

  test("failed first joins stay connecting until unreachable", () => {
    expect(connection(down(1), down(2))).toEqual({
      state: "connecting",
      unreachable: false,
    });
    expect(connection(down(1), down(2), down(3))).toEqual({
      state: "connecting",
      unreachable: true,
    });
  });

  test("a drop after being live reconnects until unreachable", () => {
    expect(connection(caughtUp, down(1))).toEqual({
      state: "reconnecting",
      unreachable: false,
    });
    expect(connection(caughtUp, down(1), down(2), down(3))).toEqual({
      state: "reconnecting",
      unreachable: true,
    });
    expect(connection(caughtUp, down(3), caughtUp)).toEqual({ state: "live" });
  });
});
