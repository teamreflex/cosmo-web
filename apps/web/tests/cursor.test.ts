import { describe, expect, it } from "bun:test";
import { decodeCursor, encodeCursor } from "../src/lib/server/cursor.server";

const ID = "b1f5f7df-00f6-40a8-8351-52b83f7696bc";

describe("decodeCursor", () => {
  // a timestamptz column read as a string, and one cast to text with its microseconds
  it.each(["2025-04-30 11:58:23+00", "2026-10-24 11:56:58.223458+00"])(
    "reads back a cursor over %s",
    (timestamp) => {
      expect(decodeCursor(encodeCursor(timestamp, ID))).toEqual({
        timestamp,
        id: ID,
      });
    },
  );

  it.each([
    ["isn't base64 of both parts", "garbage"],
    ["has no timestamp", encodeCursor("yesterday", ID)],
    ["has no row id", encodeCursor("2025-04-30 11:58:23+00", "1 OR 1=1")],
  ])("reads a cursor that %s as no cursor", (_, cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
