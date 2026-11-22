import { describe, expect, test } from "bun:test";
import {
  isNewSince,
  type MarketActivityRow,
  marketActivityTradeStatuses,
  marketSnapshot,
} from "../src/lib/universal/market-activity";
import type { MyTradeSide } from "../src/lib/universal/trades";

const nobody = { user: null, cosmoUsername: null };
const nothing: MyTradeSide = {
  items: [],
  sent: 0,
  part: "send",
  payment: null,
};

function row(id: string, updatedAt: number): MarketActivityRow {
  return {
    id,
    updatedAt: new Date(updatedAt),
    state: { status: "completed" },
    origin: { kind: "direct_offer" },
    from: nobody,
    to: nobody,
    fromSide: nothing,
    toSide: nothing,
  };
}

describe("isNewSince", () => {
  // the feed is newest first, as Refresh saw it
  const shown = [row("a", 300), row("b", 200), row("c", 100)];
  const snapshot = marketSnapshot(shown);

  test("a row shown before the refresh is not new", () => {
    expect(isNewSince(snapshot, row("b", 200))).toBe(false);
  });

  test("a trade that arrived since is new", () => {
    expect(isNewSince(snapshot, row("d", 400))).toBe(true);
  });

  test("a shown trade that changed since is new", () => {
    expect(isNewSince(snapshot, row("c", 500))).toBe(true);
  });

  test("an older page loaded after the refresh is not new", () => {
    expect(isNewSince(snapshot, row("e", 50))).toBe(false);
  });

  test("with nothing shown, every row after the refresh is new", () => {
    expect(isNewSince(marketSnapshot([]), row("a", 50))).toBe(true);
  });
});

describe("marketActivityTradeStatuses", () => {
  test("a status group narrows the kind", () => {
    expect(
      marketActivityTradeStatuses({ view: "trades", status: "open" }),
    ).toEqual(["accepted", "disputed"]);
  });

  test("a kind and a status that share nothing allow nothing", () => {
    expect(
      marketActivityTradeStatuses({ view: "trades", status: "pending" }),
    ).toEqual([]);
  });
});
