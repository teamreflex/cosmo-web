import {
  ChatUnavailable,
  RateLimited,
  SessionEnded,
  TokenExpired,
} from "@apollo/chat/errors";
import type { ChatItem } from "@apollo/chat/items";
import type { TradeSide } from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import { Redacted } from "effect";
import { chatRows, unreadAfter } from "../src/components/trades/chat/chat-rows";
import {
  applyUpdates,
  noConversation,
  rejoinPlan,
} from "../src/lib/client/chat-conversation";

const DAY = Date.UTC(2026, 9, 14, 12);

function message(
  id: number,
  sender: TradeSide | null,
  minutes = id,
): Extract<ChatItem, { _tag: "Message" }> {
  return {
    _tag: "Message",
    id,
    sender,
    sentAt: new Date(DAY + minutes * 60_000),
    body: Redacted.make(`message ${id}`),
    removed: false,
  };
}

function event(
  id: number,
  value: Extract<ChatItem, { _tag: "Event" }>["event"],
  minutes = id,
): Extract<ChatItem, { _tag: "Event" }> {
  return {
    _tag: "Event",
    id,
    at: new Date(DAY + minutes * 60_000),
    event: value,
  };
}

describe("applyUpdates", () => {
  test("isn't live until the history has arrived, nor while down", () => {
    const loading = applyUpdates(noConversation, [message(1, "from")]);
    expect(loading.live).toBe(false);
    const live = applyUpdates(loading, [{ _tag: "CaughtUp" }]);
    expect(live).toMatchObject({ live: true, items: [{ id: 1 }] });
    expect(applyUpdates(live, [{ _tag: "Down" }]).live).toBe(false);
  });

  test("a removal blanks its message in place and stays as a marker", () => {
    const before = applyUpdates(noConversation, [
      message(1, "from"),
      message(2, "to"),
    ]);
    const after = applyUpdates(before, [
      event(3, { type: "message_removed", messageId: 1 }),
    ]);
    expect(after.items.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(after.items[0]).toMatchObject({ body: null, removed: true });
    expect(after.items[1]).toMatchObject({ removed: false });
    // the earlier conversation is untouched
    expect(before.items[0]).toMatchObject({ removed: false });
  });

  test("keeps an event this client doesn't know", () => {
    const after = applyUpdates(noConversation, [
      event(1, { type: "from_a_newer_server" }),
    ]);
    expect(after.items).toHaveLength(1);
  });
});

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

describe("chatRows", () => {
  test("groups a sender's messages into one run until someone else speaks", () => {
    const rows = chatRows([
      message(1, "from"),
      message(2, "from"),
      message(3, "to"),
    ]).filter((row) => row.kind === "message");
    expect(rows.map(({ first, last }) => [first, last])).toEqual([
      [true, false],
      [false, true],
      [true, true],
    ]);
  });

  test("an event ends a run, and a new day gets a divider", () => {
    const rows = chatRows([
      message(1, "from"),
      event(2, { type: "accepted" }),
      message(3, "from"),
      message(4, "from", 24 * 60),
    ]);
    expect(rows.map((row) => row.kind)).toEqual([
      "day",
      "message",
      "event",
      "message",
      "day",
      "message",
    ]);
    expect(rows[3]).toMatchObject({ first: true });
    expect(rows[5]).toMatchObject({ first: true, last: true });
  });
});

describe("unreadAfter", () => {
  test("counts the other party's messages after an id, and nothing for staff", () => {
    const items = [
      message(1, "from"),
      message(2, "to"),
      event(3, { type: "accepted" }),
      message(4, "to"),
    ];
    expect(unreadAfter(items, "from", 0)).toBe(2);
    expect(unreadAfter(items, "from", 2)).toBe(1);
    expect(unreadAfter(items, null, 0)).toBe(0);
  });
});
