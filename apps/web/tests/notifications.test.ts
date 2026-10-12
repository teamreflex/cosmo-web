import { describe, expect, test } from "bun:test";
import {
  groupNotifications,
  type NotificationRow,
} from "../src/lib/universal/notifications";

type ListMatchRow = Extract<NotificationRow, { kind: "list_match" }>;
type TradeRow = Extract<NotificationRow, { kind: "trade" }>;

const HOUR = 60 * 60 * 1000;
const start = Date.UTC(2026, 9, 10);

function row(
  id: string,
  hoursAgo: number,
  overrides: Partial<ListMatchRow> = {},
): ListMatchRow {
  return {
    kind: "list_match",
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

function tradeRow(
  id: string,
  hoursAgo: number,
  overrides: Partial<TradeRow> = {},
): TradeRow {
  return {
    kind: "trade",
    id,
    createdAt: new Date(start - hoursAgo * HOUR),
    type: "trade_token_moved",
    unread: true,
    actor: { userId: "actor", username: "Actor" },
    counterparty: { userId: "actor", username: "Actor" },
    offer: { id: "trade", status: "accepted", listingId: "listing" },
    token: { tokenId: 1, serial: 217, collection: null },
    objekts: [],
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
    expect(bursts[0]).toMatchObject({ itemCount: 3 });
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

    expect(bursts[0]).toMatchObject({
      itemCount: 7,
      collections: ["b", "c", "d", "e", "f"].map((id) =>
        expect.objectContaining({ slug: `slug-${id}` }),
      ),
    });
  });

  test("NOTIF-04: list-match bursts still group around trade rows, which stand alone", () => {
    const moved = tradeRow("t1", 1);
    const items = groupNotifications([
      row("a", 0),
      moved,
      row("b", 2),
      // the same trade, type and actor as t1, which a list match would merge
      tradeRow("t2", 3),
      row("c", 4),
    ]);

    expect(items.map((i) => [i.kind, i.ids])).toEqual([
      ["list_match", ["a", "b", "c"]],
      ["trade", ["t1"]],
      ["trade", ["t2"]],
    ]);
    const { id: _, createdAt, ...fields } = moved;
    expect(items[1]).toEqual({ ...fields, ids: ["t1"], lastAt: createdAt });
  });
});
