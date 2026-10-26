import {
  type ListingStatus,
  listingStatuses,
  type TradeSide,
  type TradeStatus,
  tradeStatuses,
  type TradeWantKind,
} from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import {
  listingClosing,
  type ListingEvent,
  listingTransition,
  needsYou,
  type OfferEvent,
  offerTransition,
  owingSides,
  partyAction,
  proposerId,
  sideUserId,
  takesOffers,
  type TradeEvent,
  type TradeItemState,
  type TradeState,
  tradeState,
  transition,
  transitionListing,
  type TransitionRefusal,
  waitingSide,
} from "../src/lifecycle";

function objekt(sender: "from" | "to", transferred = false): TradeItemState {
  return { kind: "objekt", sender, transferred };
}

function payment(
  sender: "from" | "to",
  { markedPaid = false, confirmed = false } = {},
): TradeItemState {
  return { kind: "payment", sender, markedPaid, confirmed };
}

// a pending trade here is a direct offer, which `from` proposes; listingOffer() builds the other kind
function trade(
  status: TradeStatus,
  items: readonly TradeItemState[],
): TradeState {
  switch (status) {
    case "pending":
      return directOffer(items);
    case "cancelled":
      return { status, cancelledBy: "from", items };
    default:
      return { status, items };
  }
}

function directOffer(items: readonly TradeItemState[]): TradeState {
  return { status: "pending", proposedBy: "from", fromListing: false, items };
}

// an offer on a listing, which its claimer (`to`) proposes to the poster
function listingOffer(items: readonly TradeItemState[]): TradeState {
  return { status: "pending", proposedBy: "to", fromListing: true, items };
}

function statusAfter(state: TradeState, event: TradeEvent) {
  const result = transition(state, event);
  return result.ok ? result.trade.status : result.reason;
}

// a purchase: the seller (`from`) sends a token, the buyer (`to`) pays
const purchase = [objekt("from"), payment("to")];

// a 1-for-6 shaped swap: the poster sends 3, the claimer sends 3
const sixObjekts = (transferred = false) => [
  objekt("from", transferred),
  objekt("from", transferred),
  objekt("from", transferred),
  objekt("to", transferred),
  objekt("to", transferred),
  objekt("to", transferred),
];

function apply(state: TradeState, event: TradeEvent) {
  const result = transition(state, event);
  if (!result.ok) throw new Error(result.reason);
  return result.trade;
}

/**
 * Each event with an acting side that may take it, the statuses it is
 * allowed from with `purchase`'s items, and where it goes. Every status not
 * listed refuses with wrong_status (LIFE-03, LIFE-06, LIFE-13, LIFE-14,
 * LIFE-16, LIFE-17, UNIT-05).
 */
const allowed: [TradeEvent, TradeStatus[], TradeStatus | "unchanged"][] = [
  [{ type: "accept", by: "to" }, ["pending"], "accepted"],
  [{ type: "decline", by: "to" }, ["pending"], "declined"],
  [{ type: "counter", by: "to" }, ["pending"], "countered"],
  [{ type: "withdraw", by: "from" }, ["pending"], "withdrawn"],
  [{ type: "transfer", item: 0 }, ["accepted", "disputed"], "unchanged"],
  [{ type: "mark_paid", item: 1, by: "to" }, ["accepted"], "accepted"],
  [
    { type: "confirm_payment", item: 1, by: "from" },
    ["accepted", "disputed"],
    "unchanged",
  ],
  [{ type: "cancel", by: "from" }, ["accepted"], "cancelled"],
  [{ type: "cancel", by: "to" }, ["accepted"], "cancelled"],
  [{ type: "dispute", by: "from" }, ["accepted"], "disputed"],
  [{ type: "dispute", by: "to" }, ["accepted"], "disputed"],
  [{ type: "dispute", by: "staff" }, ["accepted"], "disputed"],
  [{ type: "time_out" }, ["accepted"], "timed_out"],
  [{ type: "staff_complete" }, ["disputed"], "completed"],
  [{ type: "staff_cancel" }, ["accepted", "disputed"], "cancelled"],
  [{ type: "staff_extend" }, ["disputed"], "accepted"],
];

describe("transition: every event from every status", () => {
  for (const [event, from, to] of allowed) {
    describe(event.type, () => {
      test.each([...tradeStatuses])("from %s", (status) => {
        const expected = from.includes(status)
          ? to === "unchanged"
            ? status
            : to
          : "wrong_status";
        expect(statusAfter(trade(status, purchase), event)).toBe(expected);
      });
    });
  }
});

/**
 * An offer on a listing is pending too, but its claimer (`to`) proposed it:
 * the poster answers it and can't counter it, the claimer withdraws it,
 * and every other event refuses it as any pending trade.
 */
describe("transition: every event on a pending offer on a listing", () => {
  const answers: [TradeEvent, TradeStatus | TransitionRefusal][] = [
    [{ type: "accept", by: "from" }, "accepted"],
    [{ type: "decline", by: "from" }, "declined"],
    [{ type: "counter", by: "from" }, "listing_offer"],
    [{ type: "withdraw", by: "to" }, "withdrawn"],
  ];
  const answered = new Set(answers.map(([event]) => event.type));
  const others = allowed.flatMap(
    ([event]): [TradeEvent, TransitionRefusal][] =>
      answered.has(event.type) ? [] : [[event, "wrong_status"]],
  );

  test.each([...answers, ...others])("%o gives %s", (event, expected) => {
    expect(statusAfter(listingOffer(purchase), event)).toBe(expected);
  });
});

/**
 * Every answer to a pending offer by each side: a direct offer, which `from`
 * proposes, and an offer on a listing, which its claimer (`to`) proposes to
 * the poster and which can't be countered.
 */
describe("transition: answering an offer", () => {
  const items = [objekt("from"), objekt("to")];
  const direct = directOffer(items);
  const onListing = listingOffer(items);

  test.each([
    ["accept", "to", "accepted"],
    ["accept", "from", "wrong_party"],
    ["decline", "to", "declined"],
    ["decline", "from", "wrong_party"],
    ["counter", "to", "countered"],
    ["counter", "from", "wrong_party"],
    ["withdraw", "from", "withdrawn"],
    ["withdraw", "to", "wrong_party"],
  ] satisfies [OfferEvent, TradeSide, TradeStatus | TransitionRefusal][])(
    "a direct offer: %s by %s gives %s",
    (type, by, expected) => {
      expect(statusAfter(direct, { type, by })).toBe(expected);
    },
  );

  test.each([
    ["accept", "from", "accepted"],
    ["accept", "to", "wrong_party"],
    ["decline", "from", "declined"],
    ["decline", "to", "wrong_party"],
    ["counter", "from", "listing_offer"],
    ["counter", "to", "wrong_party"],
    ["withdraw", "to", "withdrawn"],
    ["withdraw", "from", "wrong_party"],
  ] satisfies [OfferEvent, TradeSide, TradeStatus | TransitionRefusal][])(
    "an offer on a listing: %s by %s gives %s",
    (type, by, expected) => {
      expect(statusAfter(onListing, { type, by })).toBe(expected);
    },
  );

  test("an answered offer leaves its proposer behind", () => {
    expect(apply(onListing, { type: "accept", by: "from" })).toEqual({
      status: "accepted",
      items,
    });
    expect(apply(direct, { type: "withdraw", by: "from" })).toEqual({
      status: "withdrawn",
      items,
    });
  });
});

describe("transition: parties", () => {
  test.each([
    [{ type: "accept", by: "from" }],
    [{ type: "decline", by: "from" }],
    [{ type: "counter", by: "from" }],
    [{ type: "withdraw", by: "to" }],
  ] satisfies [TradeEvent][])(
    "refuses %o on a pending offer (UNIT-05)",
    (event) => {
      expect(statusAfter(trade("pending", purchase), event)).toBe(
        "wrong_party",
      );
    },
  );

  test("only the payer marks paid, and only the receiver confirms", () => {
    const state = trade("accepted", purchase);
    expect(statusAfter(state, { type: "mark_paid", item: 1, by: "from" })).toBe(
      "wrong_party",
    );
    expect(
      statusAfter(state, { type: "confirm_payment", item: 1, by: "to" }),
    ).toBe("wrong_party");
  });

  test("either party may cancel or dispute (LIFE-04, UNIT-01)", () => {
    for (const items of [purchase, sixObjekts()]) {
      const state = trade("accepted", items);
      for (const by of ["from", "to"] as const) {
        expect(transition(state, { type: "cancel", by })).toEqual({
          ok: true,
          trade: { status: "cancelled", cancelledBy: by, items },
        });
        expect(statusAfter(state, { type: "dispute", by })).toBe("disputed");
      }
    }
  });

  test("staff cancelling is recorded as staff", () => {
    expect(
      transition(trade("disputed", purchase), { type: "staff_cancel" }),
    ).toEqual({
      ok: true,
      trade: { status: "cancelled", cancelledBy: "staff", items: purchase },
    });
  });

  test("staff cancel ends a trade once items were sent (LIFE-15)", () => {
    const items = [objekt("from", true), objekt("to")];
    for (const status of ["accepted", "disputed"] as const) {
      expect(
        transition(trade(status, items), { type: "staff_cancel" }),
      ).toEqual({
        ok: true,
        trade: { status: "cancelled", cancelledBy: "staff", items },
      });
    }
  });

  test("a ban disputes an accepted trade as staff, leaving its items (LIFE-01)", () => {
    const items = [objekt("from"), objekt("to")];
    expect(
      transition(trade("accepted", items), { type: "dispute", by: "staff" }),
    ).toEqual({ ok: true, trade: { status: "disputed", items } });
  });

  test("a ban skips a trade that is already disputed (LIFE-03)", () => {
    expect(
      transition(trade("disputed", purchase), { type: "dispute", by: "staff" }),
    ).toEqual({ ok: false, reason: "wrong_status" });
  });
});

describe("transition: cancelling", () => {
  test.each([
    ["a token arrived", [objekt("from", true), payment("to")]],
    ["the claimer's token arrived", [objekt("from"), objekt("to", true)]],
    [
      "the buyer marked paid",
      [objekt("from"), payment("to", { markedPaid: true })],
    ],
    [
      "the seller confirmed",
      [objekt("from"), payment("to", { confirmed: true })],
    ],
  ])("is refused once %s (LIFE-05, UNIT-02)", (_, items) => {
    for (const by of ["from", "to"] as const) {
      expect(
        statusAfter(trade("accepted", items), { type: "cancel", by }),
      ).toBe("already_started");
    }
  });

  test.each([
    ["a token arrived", [objekt("from", true), payment("to")]],
    ["part of one side arrived", sixObjekts().with(0, objekt("from", true))],
    [
      "all of one side arrived",
      [...sixObjekts(true).slice(0, 3), ...sixObjekts().slice(3)],
    ],
    ["all but one arrived", sixObjekts(true).with(5, objekt("to"))],
  ])("a dispute is still possible once %s (LIFE-02, UNIT-04)", (_, items) => {
    for (const by of ["from", "to"] as const) {
      expect(
        statusAfter(trade("accepted", items), { type: "dispute", by }),
      ).toBe("disputed");
    }
  });

  /**
   * Every way a trade can sit outside accepted, with each canceller, so the
   * page offers no party action in any of them.
   */
  test.each([
    { status: "disputed", items: sixObjekts() },
    { status: "completed", items: sixObjekts(true) },
    { status: "cancelled", cancelledBy: "from", items: sixObjekts() },
    { status: "cancelled", cancelledBy: "to", items: sixObjekts() },
    { status: "cancelled", cancelledBy: "staff", items: sixObjekts() },
    { status: "timed_out", items: sixObjekts() },
  ] satisfies TradeState[])(
    "cancel and dispute are refused when %o (UNIT-03)",
    (state) => {
      for (const type of ["cancel", "dispute"] as const) {
        for (const by of ["from", "to"] as const) {
          expect(statusAfter(state, { type, by })).toBe("wrong_status");
        }
      }
    },
  );
});

describe("partyAction", () => {
  const due = { deadlinePassed: true, arrived: false };
  const open = { deadlinePassed: false, arrived: false };
  const reason = (
    state: TradeState,
    type: "cancel" | "dispute",
    facts: { deadlinePassed: boolean; arrived: boolean },
  ) => {
    const result = partyAction(state, { type, by: "from" }, facts);
    return result.ok ? result.trade.status : result.reason;
  };

  test.each(["cancel", "dispute"] as const)(
    "%s: a trade that moved on is refused before its deadline (UNIT-06)",
    (type) => {
      expect(reason(trade("completed", sixObjekts(true)), type, due)).toBe(
        "wrong_status",
      );
      expect(reason(trade("disputed", sixObjekts()), type, due)).toBe(
        "wrong_status",
      );
    },
  );

  test.each(["cancel", "dispute"] as const)(
    "%s: a due trade is refused before anything else",
    (type) => {
      expect(reason(trade("accepted", sixObjekts()), type, due)).toBe(
        "deadline_passed",
      );
      expect(
        reason(
          trade("accepted", [objekt("from", true), objekt("to")]),
          type,
          due,
        ),
      ).toBe("deadline_passed");
    },
  );

  test("cancel: refused once a token arrived, recorded or not", () => {
    expect(
      reason(
        trade("accepted", [objekt("from", true), objekt("to")]),
        "cancel",
        open,
      ),
    ).toBe("already_started");
    expect(
      reason(trade("accepted", sixObjekts()), "cancel", {
        deadlinePassed: false,
        arrived: true,
      }),
    ).toBe("already_started");
    expect(reason(trade("accepted", sixObjekts()), "cancel", open)).toBe(
      "cancelled",
    );
  });

  test("dispute: an arrival doesn't stop it", () => {
    expect(
      reason(trade("accepted", sixObjekts()), "dispute", {
        deadlinePassed: false,
        arrived: true,
      }),
    ).toBe("disputed");
  });
});

describe("transition: items", () => {
  const swap = [objekt("from"), objekt("to"), objekt("to")];

  test("a swap completes when the last token arrives", () => {
    let state = trade("accepted", swap);
    for (const item of [0, 2]) {
      const result = transition(state, { type: "transfer", item });
      if (!result.ok) throw new Error(result.reason);
      state = result.trade;
      expect(state.status).toBe("accepted");
    }
    expect(transition(state, { type: "transfer", item: 1 })).toEqual({
      ok: true,
      trade: {
        status: "completed",
        items: [objekt("from", true), objekt("to", true), objekt("to", true)],
      },
    });
  });

  test("six tokens from both sides complete on the last one, in any order (LIFE-07)", () => {
    for (const order of [
      [0, 1, 2, 3, 4, 5],
      [5, 0, 4, 1, 3, 2],
    ]) {
      let state = trade("accepted", sixObjekts());
      for (const [step, item] of order.entries()) {
        state = apply(state, { type: "transfer", item });
        expect(state.status).toBe(step < 5 ? "accepted" : "completed");
      }
      expect(state.items).toEqual(sixObjekts(true));
    }
  });

  test("a purchase completes on the transfer and the confirmation, in either order", () => {
    const sent = trade("accepted", [objekt("from", true), payment("to")]);
    expect(
      statusAfter(sent, { type: "confirm_payment", item: 1, by: "from" }),
    ).toBe("completed");

    const confirmed = trade("accepted", [
      objekt("from"),
      payment("to", { confirmed: true }),
    ]);
    expect(statusAfter(confirmed, { type: "transfer", item: 0 })).toBe(
      "completed",
    );
  });

  test("marking paid never completes a purchase", () => {
    const state = trade("accepted", [objekt("from", true), payment("to")]);
    expect(statusAfter(state, { type: "mark_paid", item: 1, by: "to" })).toBe(
      "accepted",
    );
  });

  test("a disputed trade records all six tokens but stays disputed (LIFE-09)", () => {
    let state = trade("disputed", sixObjekts());
    for (const item of [0, 1, 2, 3, 4, 5]) {
      state = apply(state, { type: "transfer", item });
      expect(state.status).toBe("disputed");
    }
    expect(state.items).toEqual(sixObjekts(true));
  });

  test("a disputed trade records the last token but stays disputed", () => {
    expect(
      transition(trade("disputed", [objekt("from", true), objekt("to")]), {
        type: "transfer",
        item: 1,
      }),
    ).toEqual({
      ok: true,
      trade: {
        status: "disputed",
        items: [objekt("from", true), objekt("to", true)],
      },
    });
  });

  test.each([
    ["an index past the end", { type: "transfer", item: 2 }],
    ["a negative index", { type: "transfer", item: -1 }],
    ["a negative index past the start", { type: "transfer", item: -3 }],
    ["a fractional index", { type: "transfer", item: 0.5 }],
    ["a negative payment index", { type: "mark_paid", item: -1, by: "to" }],
    [
      "a negative confirmation index",
      { type: "confirm_payment", item: -1, by: "from" },
    ],
    ["a payment as a token", { type: "transfer", item: 1 }],
    ["a token as a payment", { type: "mark_paid", item: 0, by: "to" }],
    [
      "a confirmation for a token",
      { type: "confirm_payment", item: 0, by: "to" },
    ],
  ] satisfies [string, TradeEvent][])("refuses %s", (_, event) => {
    expect(statusAfter(trade("accepted", purchase), event)).toBe(
      "no_such_item",
    );
  });

  test.each([
    [{ type: "transfer", item: 0 }],
    [{ type: "mark_paid", item: 1, by: "to" }],
    [{ type: "confirm_payment", item: 1, by: "from" }],
  ] satisfies [TradeEvent][])("refuses %o twice", (event) => {
    const done = trade("accepted", [
      objekt("from", true),
      payment("to", { markedPaid: true, confirmed: true }),
    ]);
    expect(statusAfter(done, event)).toBe("already_done");
  });

  test.each([6, -1, -7])(
    "refuses index %d on six tokens without touching any (LIFE-08, LIFE-24)",
    (item) => {
      expect(
        transition(trade("accepted", sixObjekts()), { type: "transfer", item }),
      ).toEqual({ ok: false, reason: "no_such_item" });
    },
  );

  test("refuses a transfer on an ended trade (LIFE-08)", () => {
    for (const status of ["completed", "cancelled", "timed_out"] as const) {
      expect(
        statusAfter(trade(status, sixObjekts()), { type: "transfer", item: 0 }),
      ).toBe("wrong_status");
    }
  });

  test("leaves the given state untouched", () => {
    const items = [objekt("from"), objekt("to")];
    transition(trade("accepted", items), { type: "transfer", item: 0 });
    expect(items).toEqual([objekt("from"), objekt("to")]);
  });
});

describe("transition: timing out", () => {
  test("disputes when one side sent and the other still owes (LIFE-10)", () => {
    // B sent 3 of 6, @Kairu sent theirs
    const items = [
      objekt("from", true),
      ...[true, true, true, false, false, false].map((sent) =>
        objekt("to", sent),
      ),
    ];
    expect(transition(trade("accepted", items), { type: "time_out" })).toEqual({
      ok: true,
      trade: { status: "disputed", items },
    });
  });

  test("disputes when only the poster owes, after the claimer sent", () => {
    const items = [objekt("from", true), objekt("from"), objekt("to", true)];
    expect(statusAfter(trade("accepted", items), { type: "time_out" })).toBe(
      "disputed",
    );
  });

  test("disputes when each side sent only part (LIFE-11)", () => {
    const items = [
      objekt("from", true),
      objekt("from"),
      objekt("to"),
      objekt("to", true),
    ];
    expect(statusAfter(trade("accepted", items), { type: "time_out" })).toBe(
      "disputed",
    );
  });

  test("times out when neither sent", () => {
    const items = [objekt("from"), objekt("to")];
    expect(transition(trade("accepted", items), { type: "time_out" })).toEqual({
      ok: true,
      trade: { status: "timed_out", items },
    });
  });

  test("disputes a buyer who never marked paid once the objekt arrived", () => {
    const items = [objekt("from", true), payment("to")];
    expect(statusAfter(trade("accepted", items), { type: "time_out" })).toBe(
      "disputed",
    );
  });

  test("completes when only the seller's confirmation is missing (LIFE-12)", () => {
    const items = [objekt("from", true), payment("to", { markedPaid: true })];
    expect(statusAfter(trade("accepted", items), { type: "time_out" })).toBe(
      "completed",
    );
  });

  test("never times out a disputed trade", () => {
    expect(statusAfter(trade("disputed", purchase), { type: "time_out" })).toBe(
      "wrong_status",
    );
  });
});

describe("transition: staff extend", () => {
  test("unfreezes a disputed trade with items still owed (LIFE-16)", () => {
    const items = [objekt("from", true), objekt("to")];
    expect(
      transition(trade("disputed", items), { type: "staff_extend" }),
    ).toEqual({ ok: true, trade: { status: "accepted", items } });
  });

  test("completes a disputed trade whose items all arrived (LIFE-25)", () => {
    expect(
      transition(trade("disputed", sixObjekts(true)), { type: "staff_extend" }),
    ).toEqual({
      ok: true,
      trade: { status: "completed", items: sixObjekts(true) },
    });
  });
});

describe("owingSides (LIFE-23)", () => {
  test.each([
    ["nobody owes", [objekt("from", true), objekt("to", true)], []],
    ["only the poster owes", [objekt("from"), objekt("to", true)], ["from"]],
    ["only the claimer owes", [objekt("from", true), objekt("to")], ["to"]],
    ["both owe", [objekt("to"), objekt("from")], ["from", "to"]],
    [
      "both sent part",
      [objekt("from", true), objekt("from"), objekt("to"), objekt("to", true)],
      ["from", "to"],
    ],
    [
      "a payment marked paid but unconfirmed counts as paid",
      [objekt("from", true), payment("to", { markedPaid: true })],
      [],
    ],
  ] satisfies [string, TradeItemState[], TradeSide[]][])(
    "%s",
    (_, items, expected) => {
      expect(owingSides(items)).toEqual(expected);
    },
  );
});

/**
 * The reporter of a dispute at the deadline: the side that sent everything,
 * or nobody when both sent only part.
 */
describe("waitingSide", () => {
  test.each([
    ["the claimer sent everything", [objekt("from"), objekt("to", true)], "to"],
    [
      "the poster sent everything, the claimer part",
      [objekt("from", true), objekt("to", true), objekt("to")],
      "from",
    ],
    [
      "both sent part",
      [objekt("from", true), objekt("from"), objekt("to"), objekt("to", true)],
      null,
    ],
    ["both sent nothing", [objekt("from"), objekt("to")], null],
    ["nobody owes", [objekt("from", true), objekt("to", true)], null],
  ] satisfies [string, TradeItemState[], TradeSide | null][])(
    "%s",
    (_, items, expected) => {
      expect(waitingSide(items)).toBe(expected);
    },
  );
});

describe("sideUserId and proposerId", () => {
  const row = {
    id: "3f2a9c1e-7d4b-4e8a-9b6c-1a2b3c4d5e6f",
    fromUserId: "poster",
    toUserId: "claimer",
  };

  test("each side names its own user", () => {
    expect(sideUserId(row, "from")).toBe("poster");
    expect(sideUserId(row, "to")).toBe("claimer");
  });

  test("a side whose account is gone names no one", () => {
    expect(sideUserId({ ...row, toUserId: null }, "to")).toBeNull();
    expect(sideUserId({ ...row, toUserId: null }, "from")).toBe("poster");
  });

  test("the proposer is the user on the side that proposed", () => {
    expect(proposerId({ ...row, proposedBy: "from" })).toBe("poster");
    expect(proposerId({ ...row, proposedBy: "to" })).toBe("claimer");
  });

  test("a proposer whose account is gone is no one", () => {
    expect(proposerId({ ...row, toUserId: null, proposedBy: "to" })).toBeNull();
  });

  test("throws on a row without a proposer", () => {
    expect(() => proposerId({ ...row, proposedBy: null })).toThrow();
  });
});

describe("needsYou (UNIT-05)", () => {
  const partial = [objekt("from", true), objekt("from"), objekt("to", true)];
  const running = { deadlinePassed: false };

  test("an accepted trade needs the sides still owing", () => {
    expect(needsYou(trade("accepted", partial), "from", running)).toBe(true);
    expect(needsYou(trade("accepted", partial), "to", running)).toBe(false);
    for (const side of ["from", "to"] as const) {
      expect(needsYou(trade("accepted", sixObjekts()), side, running)).toBe(
        true,
      );
      expect(needsYou(trade("accepted", sixObjekts(true)), side, running)).toBe(
        false,
      );
    }
  });

  test("an accepted trade past its deadline needs no one", () => {
    for (const side of ["from", "to"] as const) {
      expect(
        needsYou(trade("accepted", sixObjekts()), side, {
          deadlinePassed: true,
        }),
      ).toBe(false);
    }
  });

  test("a pending offer needs only the side that didn't propose it, whatever the facts (UNIT-06)", () => {
    for (const deadlinePassed of [false, true]) {
      const direct = directOffer(sixObjekts());
      expect(needsYou(direct, "to", { deadlinePassed })).toBe(true);
      expect(needsYou(direct, "from", { deadlinePassed })).toBe(false);
      const onListing = listingOffer(sixObjekts());
      expect(needsYou(onListing, "from", { deadlinePassed })).toBe(true);
      expect(needsYou(onListing, "to", { deadlinePassed })).toBe(false);
    }
  });

  test.each([
    "disputed",
    "completed",
    "cancelled",
    "timed_out",
    "declined",
    "withdrawn",
    "countered",
    "expired",
    "stale",
  ] as const)("a %s trade never needs anyone (UNIT-06)", (status) => {
    for (const side of ["from", "to"] as const) {
      expect(needsYou(trade(status, sixObjekts()), side, running)).toBe(false);
    }
  });
});

describe("listingClosing", () => {
  test.each([
    ["a pool of exactly one unit stays open", 2, 2, false, false, null],
    ["a pool of several units stays open", 5, 2, false, true, null],
    ["a pool short of a unit closes broken", 1, 2, false, false, "break"],
    ["an empty pool closes broken", 0, 1, false, false, "break"],
    [
      "a pool short of a unit after a completion closes filled",
      1,
      2,
      false,
      true,
      "fill",
    ],
    [
      "an empty pool after a completion closes filled",
      0,
      1,
      false,
      true,
      "fill",
    ],
    [
      "a pool short of a unit stays open while a trade is live",
      0,
      3,
      true,
      false,
      null,
    ],
    [
      "a pool short of a unit after a completion stays open while another trade is live",
      0,
      1,
      true,
      true,
      null,
    ],
  ] satisfies [
    string,
    number,
    number,
    boolean,
    boolean,
    "fill" | "break" | null,
  ][])("%s", (_, pool, unitSize, live, completed, expected) => {
    expect(listingClosing({ pool, unitSize, live, completed })).toBe(expected);
  });
});

describe("takesOffers", () => {
  test.each([
    ["exact rows are claimed", ["exact"], false],
    ['"any of" rows are claimed', ["choice"], false],
    [
      'exact and "any of" rows together are claimed',
      ["exact", "choice"],
      false,
    ],
    ["a range row takes offers", ["range"], true],
    [
      "a range row among others takes offers",
      ["exact", "range", "choice"],
      true,
    ],
    ["a payment row doesn't take offers", ["exact", "payment"], false],
  ] satisfies [string, TradeWantKind[], boolean][])(
    "%s",
    (_, kinds, expected) => {
      expect(takesOffers(kinds.map((kind) => ({ kind })))).toBe(expected);
    },
  );
});

describe("tradeState", () => {
  const unsent = {
    listingId: null,
    transferredAt: null,
    markedPaidAt: null,
    confirmedAt: null,
  };
  const at = new Date("2026-10-12T12:00:00Z");
  const listingId = "8c1f0d0e-6b8e-4a59-9a43-3f0c2a1e5d10";

  test("reads items in order, by what their timestamps say", () => {
    expect(
      tradeState({ status: "accepted", cancelledBy: null, proposedBy: null }, [
        { kind: "objekt", sender: "from", ...unsent, transferredAt: at },
        { kind: "objekt", sender: "to", ...unsent },
        { kind: "payment", sender: "to", ...unsent, markedPaidAt: at },
        { kind: "payment", sender: "to", ...unsent, confirmedAt: at },
      ]),
    ).toEqual({
      status: "accepted",
      items: [
        objekt("from", true),
        objekt("to"),
        payment("to", { markedPaid: true }),
        payment("to", { confirmed: true }),
      ],
    });
  });

  test("carries who cancelled", () => {
    expect(
      tradeState(
        { status: "cancelled", cancelledBy: "staff", proposedBy: null },
        [],
      ),
    ).toEqual({ status: "cancelled", cancelledBy: "staff", items: [] });
  });

  test("a pending direct offer carries its proposer and no listing", () => {
    expect(
      tradeState({ status: "pending", cancelledBy: null, proposedBy: "from" }, [
        { kind: "objekt", sender: "from", ...unsent },
        { kind: "objekt", sender: "to", ...unsent },
      ]),
    ).toEqual(directOffer([objekt("from"), objekt("to")]));
  });

  test("a pending offer with any item from a listing offers on that listing", () => {
    expect(
      tradeState({ status: "pending", cancelledBy: null, proposedBy: "to" }, [
        { kind: "objekt", sender: "from", ...unsent, listingId },
        { kind: "objekt", sender: "to", ...unsent },
      ]),
    ).toEqual(listingOffer([objekt("from"), objekt("to")]));
  });

  test("only a pending trade carries its proposer", () => {
    expect(
      tradeState(
        { status: "declined", cancelledBy: null, proposedBy: "from" },
        [{ kind: "objekt", sender: "from", ...unsent }],
      ),
    ).toEqual({ status: "declined", items: [objekt("from")] });
  });

  test.each([
    [
      "a listing status",
      { status: "claimed", cancelledBy: null, proposedBy: null },
    ],
    [
      "a cancel without a side",
      { status: "cancelled", cancelledBy: null, proposedBy: null },
    ],
    [
      "a pending trade without a proposer",
      { status: "pending", cancelledBy: null, proposedBy: null },
    ],
    [
      "a pending trade `to` proposed off a listing",
      { status: "pending", cancelledBy: null, proposedBy: "to" },
    ],
  ] satisfies [string, Parameters<typeof tradeState>[0]][])(
    "throws on %s",
    (_, row) => {
      expect(() => tradeState(row, [])).toThrow();
    },
  );

  test("throws on a pending trade `from` proposed on a listing", () => {
    expect(() =>
      tradeState({ status: "pending", cancelledBy: null, proposedBy: "from" }, [
        { kind: "objekt", sender: "from", ...unsent, listingId },
        { kind: "objekt", sender: "to", ...unsent },
      ]),
    ).toThrow();
  });
});

/**
 * Each listing event and the statuses it leaves from.
 */
const listingAllowed: [ListingEvent, ListingStatus[], ListingStatus][] = [
  ["fill", ["open"], "filled"],
  ["withdraw", ["open"], "withdrawn"],
  ["break", ["open"], "broken"],
  ["remove", ["open"], "removed"],
];

describe("transitionListing: every event from every status (LIFE-18)", () => {
  for (const [event, from, to] of listingAllowed) {
    test.each([...listingStatuses])(`${event} from %s`, (status) => {
      expect(transitionListing(status, event)).toEqual(
        from.includes(status)
          ? { ok: true, status: to }
          : { ok: false, reason: "wrong_status" },
      );
    });
  }
});

describe("listingTransition agrees with transitionListing (LTR-01)", () => {
  for (const [event] of listingAllowed) {
    test.each([...listingStatuses])(`${event} from %s`, (status) => {
      const { from, to } = listingTransition(event);
      const result = transitionListing(status, event);
      expect(from.includes(status)).toBe(result.ok);
      if (result.ok) expect(result.status).toBe(to);
    });
  }

  test("covers every listing event", () => {
    expect(
      listingAllowed.map(([event]) => [event, listingTransition(event)]),
    ).toEqual(listingAllowed.map(([event, from, to]) => [event, { from, to }]));
  });
});

describe("offerTransition", () => {
  test.each([
    [{ type: "accept", by: "to" }],
    [{ type: "decline", by: "to" }],
    [{ type: "counter", by: "to" }],
    [{ type: "withdraw", by: "from" }],
  ] satisfies [TradeEvent & { type: OfferEvent }][])(
    "agrees with transition for %o",
    (event) => {
      const { from, to } = offerTransition(event.type);
      expect(from).toBe("pending");
      expect(statusAfter(trade(from, purchase), event)).toBe(to);
    },
  );

  test.each([
    [{ type: "accept", by: "from" }],
    [{ type: "decline", by: "from" }],
    [{ type: "withdraw", by: "to" }],
  ] satisfies [TradeEvent & { type: OfferEvent }][])(
    "agrees with transition on an offer on a listing for %o",
    (event) => {
      const { to } = offerTransition(event.type);
      expect(statusAfter(listingOffer(purchase), event)).toBe(to);
    },
  );

  test("the timers and the drain end a pending offer as expired or stale", () => {
    expect(offerTransition("expire")).toEqual({
      from: "pending",
      to: "expired",
    });
    expect(offerTransition("go_stale")).toEqual({
      from: "pending",
      to: "stale",
    });
  });
});
