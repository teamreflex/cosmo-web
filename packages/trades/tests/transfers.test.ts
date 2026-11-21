import { describe, expect, test } from "bun:test";
import { tradeState } from "../src/lifecycle";
import {
  type ChainRow,
  type ExpectedItem,
  expectedItems,
  foldTransfers,
  itemStatus,
  paymentStatus,
  recordChainEvents,
  toChainRow,
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

describe("expectedItems", () => {
  const parties = { fromAddress: KAIRU, toAddress: TRADER_B };

  test("a live item is owed by its sender's pinned address to the other party's", () => {
    const items = [
      { id: 1, sender: "from", tokenId: 201, live: true, transferredAt: null },
      { id: 2, sender: "to", tokenId: 301, live: true, transferredAt: AT },
    ] as const;

    expect(
      expectedItems(
        [{ id: "trade-1", ...parties, items }],
        items.map((item) => ({ ...item, offerId: "trade-1", ...parties })),
      ),
    ).toEqual(
      new Map([
        [
          201,
          [
            {
              kind: "live",
              itemId: 1,
              tradeId: "trade-1",
              from: KAIRU,
              to: TRADER_B,
              transferred: false,
            },
          ],
        ],
        [
          301,
          [
            {
              kind: "live",
              itemId: 2,
              tradeId: "trade-1",
              from: TRADER_B,
              to: KAIRU,
              transferred: true,
            },
          ],
        ],
      ]),
    );
  });

  test("an offered item is held by its sender: a listing's poster, or either party of a pending offer", () => {
    const offered = { live: false, ...parties } as const;

    expect(
      expectedItems(
        [],
        [
          {
            ...offered,
            tokenId: 201,
            sender: "from",
            offerId: "listing-1",
            toAddress: null,
          },
          { ...offered, tokenId: 201, sender: "from", offerId: "offer-1" },
          { ...offered, tokenId: 301, sender: "to", offerId: "offer-1" },
        ],
      ),
    ).toEqual(
      new Map([
        [
          201,
          [
            { kind: "offered", offerId: "listing-1", from: KAIRU },
            { kind: "offered", offerId: "offer-1", from: KAIRU },
          ],
        ],
        [301, [{ kind: "offered", offerId: "offer-1", from: TRADER_B }]],
      ]),
    );
  });
});

test("toChainRow skips a transfer whose indexer row was rolled back", () => {
  const transfer = {
    type: "transfer",
    from: KAIRU,
    to: TRADER_B,
    timestamp: AT,
  } as const;

  expect(toChainRow({ ...transfer, tokenId: "201", hash: null })).toEqual([]);
  expect(toChainRow({ ...transfer, tokenId: "201", hash: "0xabc" })).toEqual([
    { ...transfer, tokenId: 201, hash: "0xabc" },
  ]);
});

test("recordChainEvents marks the item an arrival names and keeps the batch's order", () => {
  const item = {
    kind: "objekt",
    sender: "from",
    listingId: null,
    transferredAt: null,
    markedPaidAt: null,
    confirmedAt: null,
  } as const;
  const items = [
    { ...item, id: 10 },
    { ...item, id: 20, sender: "to" },
  ] as const;

  expect(
    recordChainEvents(
      {
        id: "trade-1",
        items,
        state: tradeState(
          { status: "accepted", cancelledBy: null, proposedBy: null },
          items,
        ),
      },
      [
        { type: "token_moved", tokenId: 201 },
        { type: "transferred", itemId: 20, at: AT, hash: "0xabc" },
      ],
    ),
  ).toEqual({
    state: {
      status: "accepted",
      items: [
        { kind: "objekt", sender: "from", transferred: false },
        { kind: "objekt", sender: "to", transferred: true },
      ],
    },
    arrivals: [{ itemId: 20, at: AT, hash: "0xabc" }],
    events: [
      { tradeId: "trade-1", event: { type: "token_moved", tokenId: 201 } },
      {
        tradeId: "trade-1",
        event: { type: "item_transferred", itemId: 20, hash: "0xabc" },
      },
    ],
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

  test("an ended trade's unsent item is not sent", () => {
    expect(
      itemStatus(unsent, held(TRADER_B), { status: "timed_out", ...pinned }),
    ).toBe("not_sent");
  });

  test("a live item follows its token's owner", () => {
    expect(itemStatus(unsent, held(TRADER_B), live)).toBe("arrived");
    expect(itemStatus(unsent, held(OUTSIDER), live)).toBe("moved");
    expect(itemStatus(unsent, held(KAIRU), live)).toBe("waiting");
    expect(itemStatus(unsent, held(KAIRU, false), live)).toBe("untransferable");
    expect(itemStatus(unsent, undefined, live)).toBe("waiting");
  });

  test("nothing on a pending offer has started, and a token at its receiver has only moved", () => {
    expect(itemStatus(unsent, held(KAIRU), pending)).toBe("not_started");
    expect(itemStatus(unsent, undefined, pending)).toBe("not_started");
    expect(itemStatus(unsent, held(TRADER_B), pending)).toBe("moved");
  });

  test("the receiver is the sender's other side", () => {
    expect(
      itemStatus({ sender: "to", transferredAt: null }, held(KAIRU), live),
    ).toBe("arrived");
  });
});

describe("paymentStatus", () => {
  test.each([
    ["unpaid", "pending", "not_started"],
    ["unpaid", "accepted", "waiting"],
    ["unpaid", "disputed", "waiting"],
    ["unpaid", "completed", "not_confirmed"],
    ["marked", "accepted", "paid"],
    ["marked", "cancelled", "paid"],
    ["confirmed", "accepted", "confirmed"],
    ["confirmed", "cancelled", "confirmed"],
  ] as const)("a payment %s on a %s trade is %s", (stage, status, expected) => {
    expect(paymentStatus(stage, status)).toBe(expected);
  });
});
