import {
  ChatUnavailable,
  RateLimited,
  SessionEnded,
  TokenExpired,
} from "@apollo/chat/errors";
import { describe, expect, test } from "bun:test";
import { rejoinPlan } from "../src/lib/client/chat-conversation";

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
