import { describe, expect, test } from "bun:test";
import {
  type ChainRow,
  type ExpectedItem,
  decideTransfer,
} from "../src/transfers";

const KAIRU = "0x000000000000000000000000000000000000aaaa";
const TRADER_B = "0x000000000000000000000000000000000000bbbb";
const OUTSIDER = "0x000000000000000000000000000000000000cccc";
const AT = new Date("2026-10-11T12:00:00Z");
const HASH = `0x${"ab".repeat(32)}`;

function transfer(from: string, to: string): ChainRow {
  return {
    type: "transfer",
    tokenId: 201,
    from,
    to,
    timestamp: AT,
    hash: HASH,
  };
}

function transferability(transferable: boolean): ChainRow {
  return { type: "transferability", tokenId: 201, transferable, timestamp: AT };
}

// @Kairu owes trader B this serial
const live: ExpectedItem = {
  kind: "live",
  itemId: 7,
  tradeId: "trade-1",
  from: KAIRU,
  to: TRADER_B,
  transferred: false,
};

// @Kairu offers this serial on an open listing
const offered: ExpectedItem = {
  kind: "offered",
  offerId: "listing-1",
  from: KAIRU,
};

describe("decideTransfer: live trade items", () => {
  test("a transfer to the receiver marks the item transferred", () => {
    expect(decideTransfer(transfer(KAIRU, TRADER_B), [live])).toEqual([
      {
        type: "transferred",
        itemId: 7,
        tradeId: "trade-1",
        at: AT,
        hash: HASH,
      },
    ]);
  });

  test("compares addresses case-insensitively", () => {
    expect(
      decideTransfer(transfer(KAIRU.toUpperCase(), TRADER_B.toUpperCase()), [
        live,
      ]),
    ).toEqual([
      {
        type: "transferred",
        itemId: 7,
        tradeId: "trade-1",
        at: AT,
        hash: HASH,
      },
    ]);
  });

  test("a transfer to anyone else posts a moved event", () => {
    expect(decideTransfer(transfer(KAIRU, OUTSIDER), [live])).toEqual([
      { type: "event", tradeId: "trade-1", event: "serial_moved" },
    ]);
  });

  test("turning untransferable posts an event", () => {
    expect(decideTransfer(transferability(false), [live])).toEqual([
      { type: "event", tradeId: "trade-1", event: "serial_untransferable" },
    ]);
  });

  test.each([
    ["a transfer into the sender", transfer(OUTSIDER, KAIRU)],
    ["a transfer between others", transfer(TRADER_B, OUTSIDER)],
    ["turning transferable", transferability(true)],
  ])("ignores %s", (_, row) => {
    expect(decideTransfer(row, [live])).toEqual([{ type: "ignore" }]);
  });

  test("ignores everything once the item arrived", () => {
    const arrived = { ...live, transferred: true };
    for (const row of [
      transfer(TRADER_B, OUTSIDER),
      transfer(KAIRU, TRADER_B),
      transferability(false),
    ]) {
      expect(decideTransfer(row, [arrived])).toEqual([{ type: "ignore" }]);
    }
  });
});

describe("decideTransfer: offered items", () => {
  test.each([
    ["the serial leaves the holder", transfer(KAIRU, OUTSIDER)],
    ["the serial turns untransferable", transferability(false)],
  ])("breaks when %s", (_, row) => {
    expect(decideTransfer(row, [offered])).toEqual([
      { type: "breaks", offerId: "listing-1" },
    ]);
  });

  test.each([
    ["a transfer into the holder", transfer(OUTSIDER, KAIRU)],
    ["a transfer between others", transfer(TRADER_B, OUTSIDER)],
    ["turning transferable", transferability(true)],
  ])("ignores %s", (_, row) => {
    expect(decideTransfer(row, [offered])).toEqual([{ type: "ignore" }]);
  });
});

test("decides each item holding the serial, in order", () => {
  const pendingOffer: ExpectedItem = {
    kind: "offered",
    offerId: "offer-1",
    from: KAIRU,
  };
  expect(
    decideTransfer(transfer(KAIRU, OUTSIDER), [offered, pendingOffer]),
  ).toEqual([
    { type: "breaks", offerId: "listing-1" },
    { type: "breaks", offerId: "offer-1" },
  ]);
  expect(decideTransfer(transfer(KAIRU, OUTSIDER), [])).toEqual([]);
});
