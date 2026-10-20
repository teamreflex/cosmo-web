import type { TradeEvent } from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { ChatEvent, isKnownEvent } from "../src/items";

const decode = Schema.decodeUnknownExit(ChatEvent);

// UNIT-08
describe("direct offer events", () => {
  test.each([
    { type: "offered" },
    { type: "declined", by: "to" },
    { type: "declined", by: "staff" },
    { type: "declined", by: "deletion" },
    { type: "withdrawn", by: "from" },
    { type: "withdrawn", by: "staff" },
    { type: "withdrawn", by: "deletion" },
    {
      type: "countered",
      counterId: "0199f1a2-7c1e-7d4b-9a8e-2f6c1b0d3e45",
    },
    { type: "expired" },
    { type: "stale", tokenId: 201, reason: "moved" },
    { type: "stale", tokenId: 201, reason: "untransferable" },
  ] satisfies TradeEvent[])("$type decodes as itself", (event) => {
    expect(isKnownEvent(event)).toBe(true);
    const exit = decode(event);
    expect(exit._tag).toBe("Success");
    if (exit._tag === "Success") {
      expect(exit.value).toEqual(event);
    }
  });

  test.each([
    ["countered without counterId", { type: "countered" }],
    ["countered with a numeric counterId", { type: "countered", counterId: 7 }],
    ["stale without tokenId", { type: "stale", reason: "moved" }],
    [
      "stale with a string tokenId",
      { type: "stale", tokenId: "201", reason: "moved" },
    ],
    [
      "stale with a non-integer tokenId",
      { type: "stale", tokenId: 1.5, reason: "moved" },
    ],
    ["stale without its reason", { type: "stale", tokenId: 201 }],
    ["declined by a sender", { type: "declined", by: "from" }],
  ])("%s falls back to an unknown event", (_label, event) => {
    expect(isKnownEvent(event)).toBe(false);
    const exit = decode(event);
    expect(exit._tag).toBe("Success");
    if (exit._tag === "Success") {
      expect(exit.value).toEqual({ type: event.type });
    }
  });

  test("a countered event that also stored its token ids decodes as countered", () => {
    const event = { type: "countered", counterId: "c", tokenIds: [201] };
    expect(isKnownEvent(event)).toBe(true);
    const exit = decode(event);
    expect(exit._tag).toBe("Success");
    if (exit._tag === "Success") {
      expect(exit.value).toEqual({ type: "countered", counterId: "c" });
    }
  });

  test("an unknown type still decodes as an unknown event", () => {
    const event = { type: "from_the_future", tokenId: 201 };
    expect(isKnownEvent(event)).toBe(false);
    const exit = decode(event);
    expect(exit._tag).toBe("Success");
    if (exit._tag === "Success") {
      expect(exit.value).toEqual({ type: "from_the_future" });
    }
  });
});
