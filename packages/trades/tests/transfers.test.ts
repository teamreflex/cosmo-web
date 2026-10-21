import { describe, expect, test } from "bun:test";
import {
  type ChainRow,
  decideTransfer,
  type ExpectedItem,
  foldTransfers,
  itemStatus,
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

// @Kairu owes trader B this token
const live: ExpectedItem = {
  kind: "live",
  itemId: 7,
  tradeId: "trade-1",
  from: KAIRU,
  to: TRADER_B,
  transferred: false,
};

// @Kairu offers this token on an open listing
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

  test("a transfer to the receiver from another wallet marks the item transferred", () => {
    expect(decideTransfer(transfer(OUTSIDER, TRADER_B), [live])).toEqual([
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
      { type: "event", tradeId: "trade-1", event: "token_moved" },
    ]);
  });

  test("turning untransferable posts an event", () => {
    expect(decideTransfer(transferability(false), [live])).toEqual([
      { type: "event", tradeId: "trade-1", event: "token_untransferable" },
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
    ["the token leaves the holder", transfer(KAIRU, OUTSIDER), "moved"],
    [
      "the token turns untransferable",
      transferability(false),
      "untransferable",
    ],
  ] as const)("breaks when %s", (_, row, reason) => {
    expect(decideTransfer(row, [offered])).toEqual([
      { type: "breaks", offerId: "listing-1", reason },
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

/**
 * A pending offer between @Kairu (the sender) and trader B: each side's
 * offered token is held by that side and nothing counts before acceptance.
 */
describe.each([
  ["the sender's", KAIRU, TRADER_B],
  ["the recipient's", TRADER_B, KAIRU],
])("a pending offer's item on %s side (UNIT-07)", (_, holder, counterparty) => {
  const item: ExpectedItem = {
    kind: "offered",
    offerId: "offer-1",
    from: holder,
  };
  const breaks = [
    ["the token leaves the holder", transfer(holder, OUTSIDER), "moved"],
    [
      "the token is sent to the counterparty early",
      transfer(holder, counterparty),
      "moved",
    ],
    [
      "the token turns untransferable",
      transferability(false),
      "untransferable",
    ],
  ] as const;
  const ignored = [
    ["a transfer into the holder", transfer(OUTSIDER, holder)],
    ["a transfer between others", transfer(counterparty, OUTSIDER)],
  ] as const;

  test.each(breaks)("goes stale when %s", (_, row, reason) => {
    expect(decideTransfer(row, [item])).toEqual([
      { type: "breaks", offerId: "offer-1", reason },
    ]);
  });

  test("says the token turned untransferable rather than moved (STALE-03)", () => {
    expect(
      foldTransfers([transferability(false)], new Map([[201, [item]]])).breaks,
    ).toEqual(
      new Map([["offer-1", { tokenId: 201, reason: "untransferable" }]]),
    );
  });

  test.each(ignored)("ignores %s", (_, row) => {
    expect(decideTransfer(row, [item])).toEqual([{ type: "ignore" }]);
  });

  test("never counts a transfer, so the offer can't complete", () => {
    for (const [, row] of [...breaks, ...ignored] as const) {
      expect(foldTransfers([row], new Map([[201, [item]]])).trades).toEqual(
        new Map(),
      );
    }
    expect(
      foldTransfers(
        [transfer(holder, counterparty), transfer(counterparty, holder)],
        new Map([[201, [item]]]),
      ),
    ).toEqual({
      trades: new Map(),
      breaks: new Map([["offer-1", { tokenId: 201, reason: "moved" }]]),
    });
  });
});

test("decides each item holding the token, in order", () => {
  const pendingOffer: ExpectedItem = {
    kind: "offered",
    offerId: "offer-1",
    from: KAIRU,
  };
  expect(
    decideTransfer(transfer(KAIRU, OUTSIDER), [offered, pendingOffer]),
  ).toEqual([
    { type: "breaks", offerId: "listing-1", reason: "moved" },
    { type: "breaks", offerId: "offer-1", reason: "moved" },
  ]);
  expect(decideTransfer(transfer(KAIRU, OUTSIDER), [])).toEqual([]);
});

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

  test("records a token passed on in the same batch once, not as moved (FOLD-01)", () => {
    expect(
      foldTransfers(
        [move(201, KAIRU, TRADER_B, 1), move(201, TRADER_B, OUTSIDER, 2)],
        expected(owed(201)),
      ),
    ).toEqual({
      trades: new Map([
        [
          "trade-1",
          [{ type: "transferred", itemId: 2010, at: at(1), hash: hash(1) }],
        ],
      ]),
      breaks: new Map(),
    });
  });

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
    });
  });

  test("breaks every listing offering the token (FOLD-05)", () => {
    expect(
      foldTransfers(
        [move(201, KAIRU, OUTSIDER)],
        expected(
          offeredBy(201, "listing-1"),
          offeredBy(201, "listing-2"),
          offeredBy(201, "listing-3"),
        ),
      ).breaks,
    ).toEqual(
      new Map([
        ["listing-1", { tokenId: 201, reason: "moved" }],
        ["listing-2", { tokenId: 201, reason: "moved" }],
        ["listing-3", { tokenId: 201, reason: "moved" }],
      ]),
    );
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
    });
  });

  test("ignores transfers into the holder or between others (FOLD-07)", () => {
    expect(
      foldTransfers(
        [move(201, OUTSIDER, KAIRU, 1), move(201, TRADER_B, OUTSIDER, 2)],
        expected(owed(201), offeredBy(201, "listing-1")),
      ),
    ).toEqual({ trades: new Map(), breaks: new Map() });
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
      });
    });

    test("turning transferable is ignored", () => {
      expect(
        foldTransfers(
          [lock(201, true), lock(202, true), lock(203, true)],
          items,
        ),
      ).toEqual({ trades: new Map(), breaks: new Map() });
    });
  });

  describe("both directions in one trade (FOLD-09)", () => {
    const CLAIMER_OTHER = "0x000000000000000000000000000000000000dddd";
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
      });
    });

    test("a token going the reverse way is ignored", () => {
      expect(
        foldTransfers(
          [move(201, TRADER_B, KAIRU, 1), move(202, KAIRU, TRADER_B, 2)],
          items,
        ),
      ).toEqual({ trades: new Map(), breaks: new Map() });
    });

    test("the claimer sending to another of their own addresses is a move", () => {
      expect(
        foldTransfers([move(202, TRADER_B, CLAIMER_OTHER)], items),
      ).toEqual({
        trades: new Map([["trade-1", [{ type: "token_moved", tokenId: 202 }]]]),
        breaks: new Map(),
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

  test("breaks a pending offer whose token moved (FOLD-11)", () => {
    expect(
      foldTransfers(
        [move(201, KAIRU, OUTSIDER)],
        expected(offeredBy(201, "offer-1")),
      ),
    ).toEqual({
      trades: new Map(),
      breaks: new Map([["offer-1", { tokenId: 201, reason: "moved" }]]),
    });
  });

  test("records a token that left and came back before reaching the receiver (FOLD-12)", () => {
    expect(
      foldTransfers(
        [
          move(201, KAIRU, OUTSIDER, 1),
          move(201, OUTSIDER, KAIRU, 2),
          move(201, KAIRU, TRADER_B, 3),
        ],
        expected(owed(201)),
      ).trades,
    ).toEqual(
      new Map([
        [
          "trade-1",
          [
            { type: "token_moved", tokenId: 201 },
            { type: "transferred", itemId: 2010, at: at(3), hash: hash(3) },
          ],
        ],
      ]),
    );
  });

  test("leaves rows for tokens nobody expects alone", () => {
    expect(
      foldTransfers([move(999, KAIRU, OUTSIDER)], expected(owed(201))),
    ).toEqual({ trades: new Map(), breaks: new Map() });
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

  test.each([
    "completed",
    "cancelled",
    "timed_out",
    "declined",
    "expired",
  ] as const)("a %s trade's unsent item is not sent", (status) => {
    expect(itemStatus(unsent, held(TRADER_B), { status, ...pinned })).toBe(
      "not_sent",
    );
  });

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
