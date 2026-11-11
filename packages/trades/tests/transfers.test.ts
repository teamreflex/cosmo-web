import { describe, expect, test } from "bun:test";
import {
  type ChainRow,
  type ExpectedItem,
  foldTransfers,
  itemStatus,
} from "../src/transfers";

const KAIRU = "0x000000000000000000000000000000000000aaaa";
const TRADER_B = "0x000000000000000000000000000000000000bbbb";
const OUTSIDER = "0x000000000000000000000000000000000000cccc";
const AT = new Date("2026-10-11T12:00:00Z");

describe("foldTransfers", () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 11, 12, minute));
  const hash = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;

  function move(tokenId: number, from: string, to: string, n = 1): ChainRow {
    return {
      type: "transfer",
      tokenId,
      from,
      to,
      timestamp: at(n),
      hash: hash(n),
    };
  }

  function lock(tokenId: number, transferable: boolean): ChainRow {
    return { type: "transferability", tokenId, transferable, timestamp: at(0) };
  }

  // @Kairu owes trader B token `tokenId` in trade `tradeId`
  function owed(
    tokenId: number,
    tradeId = "trade-1",
    { from = KAIRU, to = TRADER_B, transferred = false } = {},
  ): [number, ExpectedItem] {
    return [
      tokenId,
      { kind: "live", itemId: tokenId * 10, tradeId, from, to, transferred },
    ];
  }

  function offeredBy(
    tokenId: number,
    offerId: string,
    from = KAIRU,
  ): [number, ExpectedItem] {
    return [tokenId, { kind: "offered", offerId, from }];
  }

  // the expected items keyed by token, in the order given
  function expected(...entries: [number, ExpectedItem][]) {
    const byToken = new Map<number, ExpectedItem[]>();
    for (const [tokenId, item] of entries) {
      byToken.set(tokenId, [...(byToken.get(tokenId) ?? []), item]);
    }
    return byToken;
  }

  test("records a token routed through another wallet once it reaches the receiver (FOLD-02)", () => {
    expect(
      foldTransfers(
        [move(201, KAIRU, OUTSIDER, 1), move(201, OUTSIDER, TRADER_B, 2)],
        expected(owed(201)),
      ),
    ).toEqual({
      trades: new Map([
        [
          "trade-1",
          [
            { type: "token_moved", tokenId: 201 },
            { type: "transferred", itemId: 2010, at: at(2), hash: hash(2) },
          ],
        ],
      ]),
      breaks: new Map(),
      departed: new Map(),
    });
  });

  test("ignores a duplicate row for the same transfer (FOLD-03)", () => {
    const row = move(201, KAIRU, TRADER_B, 1);
    expect(foldTransfers([row, row], expected(owed(201)))).toEqual({
      trades: new Map([
        [
          "trade-1",
          [{ type: "transferred", itemId: 2010, at: at(1), hash: hash(1) }],
        ],
      ]),
      breaks: new Map(),
      departed: new Map(),
    });
  });

  test("breaks a listing once when several of its tokens leave (FOLD-04)", () => {
    expect(
      foldTransfers(
        [move(201, KAIRU, OUTSIDER, 1), move(202, KAIRU, OUTSIDER, 2)],
        expected(offeredBy(201, "listing-1"), offeredBy(202, "listing-1")),
      ),
    ).toEqual({
      trades: new Map(),
      breaks: new Map([["listing-1", { tokenId: 201, reason: "moved" }]]),
      departed: new Map([["listing-1", [201, 202]]]),
    });
  });

  test("transfers a live token and breaks the other listing offering it (FOLD-06)", () => {
    expect(
      foldTransfers(
        [move(201, KAIRU, TRADER_B, 1)],
        expected(owed(201), offeredBy(201, "listing-2")),
      ),
    ).toEqual({
      trades: new Map([
        [
          "trade-1",
          [{ type: "transferred", itemId: 2010, at: at(1), hash: hash(1) }],
        ],
      ]),
      breaks: new Map([["listing-2", { tokenId: 201, reason: "moved" }]]),
      departed: new Map([["listing-2", [201]]]),
    });
  });

  test("ignores transfers into the holder or between others (FOLD-07)", () => {
    expect(
      foldTransfers(
        [move(201, OUTSIDER, KAIRU, 1), move(201, TRADER_B, OUTSIDER, 2)],
        expected(owed(201), offeredBy(201, "listing-1")),
      ),
    ).toEqual({ trades: new Map(), breaks: new Map(), departed: new Map() });
  });

  describe("transferability (FOLD-08)", () => {
    const items = expected(
      owed(201),
      offeredBy(202, "listing-1"),
      owed(203, "trade-1", { transferred: true }),
    );

    test("turning untransferable posts an event, breaks, or is ignored once arrived", () => {
      expect(
        foldTransfers(
          [lock(201, false), lock(202, false), lock(203, false)],
          items,
        ),
      ).toEqual({
        trades: new Map([
          ["trade-1", [{ type: "token_untransferable", tokenId: 201 }]],
        ]),
        breaks: new Map([
          ["listing-1", { tokenId: 202, reason: "untransferable" }],
        ]),
        departed: new Map([["listing-1", [202]]]),
      });
    });

    test("turning transferable is ignored", () => {
      expect(
        foldTransfers(
          [lock(201, true), lock(202, true), lock(203, true)],
          items,
        ),
      ).toEqual({ trades: new Map(), breaks: new Map(), departed: new Map() });
    });
  });

  describe("both directions in one trade (FOLD-09)", () => {
    const items = expected(
      owed(201),
      owed(202, "trade-1", { from: TRADER_B, to: KAIRU }),
    );

    test("each side's token reaching the other, in mixed case, is transferred", () => {
      expect(
        foldTransfers(
          [
            move(201, KAIRU.toUpperCase(), TRADER_B, 1),
            move(202, TRADER_B, KAIRU.toUpperCase(), 2),
          ],
          items,
        ),
      ).toEqual({
        trades: new Map([
          [
            "trade-1",
            [
              { type: "transferred", itemId: 2010, at: at(1), hash: hash(1) },
              { type: "transferred", itemId: 2020, at: at(2), hash: hash(2) },
            ],
          ],
        ]),
        breaks: new Map(),
        departed: new Map(),
      });
    });
  });

  test("groups events per trade in row order, each with its own time and hash (FOLD-10)", () => {
    const { trades } = foldTransfers(
      [
        move(201, KAIRU, TRADER_B, 1),
        move(202, KAIRU, TRADER_B, 2),
        move(203, KAIRU, OUTSIDER, 3),
        move(204, KAIRU, TRADER_B, 4),
      ],
      expected(
        owed(201, "trade-1"),
        owed(202, "trade-2"),
        owed(203, "trade-1"),
        owed(204, "trade-2"),
      ),
    );
    expect(trades).toEqual(
      new Map([
        [
          "trade-1",
          [
            { type: "transferred", itemId: 2010, at: at(1), hash: hash(1) },
            { type: "token_moved", tokenId: 203 },
          ],
        ],
        [
          "trade-2",
          [
            { type: "transferred", itemId: 2020, at: at(2), hash: hash(2) },
            { type: "transferred", itemId: 2040, at: at(4), hash: hash(4) },
          ],
        ],
      ]),
    );
  });
});

describe("itemStatus", () => {
  const pinned = { fromAddress: KAIRU, toAddress: TRADER_B };
  const live = { status: "accepted", ...pinned } as const;
  const pending = { status: "pending", ...pinned } as const;
  const unsent = { sender: "from", transferredAt: null } as const;
  const held = (owner: string, transferable = true) => ({
    owner,
    transferable,
  });

  test("a recorded transfer is sent, open or not", () => {
    for (const trade of [live, { status: "completed", ...pinned } as const]) {
      expect(
        itemStatus({ sender: "from", transferredAt: AT }, undefined, trade),
      ).toBe("sent");
    }
  });

  test.each(["timed_out", "declined"] as const)(
    "a %s trade's unsent item is not sent",
    (status) => {
      expect(itemStatus(unsent, held(TRADER_B), { status, ...pinned })).toBe(
        "not_sent",
      );
    },
  );

  test("a live item follows its token's owner", () => {
    for (const trade of [live, { status: "disputed", ...pinned } as const]) {
      expect(itemStatus(unsent, held(TRADER_B), trade)).toBe("arrived");
      expect(itemStatus(unsent, held(OUTSIDER), trade)).toBe("moved");
      expect(itemStatus(unsent, held(KAIRU), trade)).toBe("waiting");
      expect(itemStatus(unsent, held(KAIRU, false), trade)).toBe(
        "untransferable",
      );
      expect(itemStatus(unsent, undefined, trade)).toBe("waiting");
    }
  });

  test("nothing on a pending offer has started, and a token at its receiver has only moved", () => {
    expect(itemStatus(unsent, held(KAIRU), pending)).toBe("not_started");
    expect(itemStatus(unsent, undefined, pending)).toBe("not_started");
    expect(itemStatus(unsent, held(TRADER_B), pending)).toBe("moved");
    expect(itemStatus(unsent, held(OUTSIDER), pending)).toBe("moved");
    expect(itemStatus(unsent, held(KAIRU, false), pending)).toBe(
      "untransferable",
    );
  });

  test("the receiver is the sender's other side", () => {
    expect(
      itemStatus({ sender: "to", transferredAt: null }, held(KAIRU), live),
    ).toBe("arrived");
  });
});
