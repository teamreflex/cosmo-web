import { describe, expect, test } from "bun:test";
import {
  groupNotifications,
  type NotificationRow,
} from "../src/lib/universal/notifications";

const HOUR = 60 * 60 * 1000;
const start = Date.UTC(2026, 9, 10);

function row(
  id: string,
  hoursAgo: number,
  overrides: Partial<NotificationRow> = {},
): NotificationRow {
  return {
    id,
    createdAt: new Date(start - hoursAgo * HOUR),
    type: "trade_have",
    unread: true,
    actor: { userId: "actor", username: "Actor" },
    list: { id: "list", slug: "have" },
    collection: {
      slug: `slug-${id}`,
      name: `Collection ${id}`,
      frontImage: "",
      frontImageVersion: null,
    },
    ...overrides,
  };
}

describe("groupNotifications", () => {
  test("groups a partition's rows while neighbours are within six hours", () => {
    const bursts = groupNotifications([
      row("a", 0),
      row("b", 5),
      row("c", 10),
      row("d", 17),
    ]);

    expect(bursts.map((b) => b.ids)).toEqual([["a", "b", "c"], ["d"]]);
    expect(bursts[0]?.lastAt).toEqual(new Date(start));
    expect(bursts[0]?.itemCount).toBe(3);
  });

  test("keeps types, actors, lists and read states apart", () => {
    const bursts = groupNotifications([
      row("a", 0),
      row("b", 1, { type: "trade_want" }),
      row("c", 2, { actor: { userId: "other", username: null } }),
      row("d", 3, { list: { id: "other", slug: "other" } }),
      row("e", 4, { unread: false }),
      row("f", 5),
    ]);

    expect(bursts.map((b) => b.ids)).toEqual([
      ["a", "f"],
      ["b"],
      ["c"],
      ["d"],
      ["e"],
    ]);
  });

  test("keeps the newest five collections and skips missing ones", () => {
    const bursts = groupNotifications([
      row("a", 0, { collection: null }),
      ...["b", "c", "d", "e", "f", "g"].map((id, i) => row(id, i + 1)),
    ]);

    expect(bursts[0]?.itemCount).toBe(7);
    expect(bursts[0]?.collections.map((c) => c.slug)).toEqual([
      "slug-b",
      "slug-c",
      "slug-d",
      "slug-e",
      "slug-f",
    ]);
  });
});
