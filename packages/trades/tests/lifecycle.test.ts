import type {
  TradeSide,
  TradeStatus,
  TradeWantKind,
} from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import {
  listingClosing,
  needsYou,
  type OfferEvent,
  partyAction,
  proposerId,
  takesOffers,
  type TradeEvent,
  type TradeItemState,
  tradeListingId,
  type TradeState,
  tradeState,
  transition,
  type TransitionRefusal,
  waitingSide,
} from "../src/lifecycle";

function objekt(sender: "from" | "to", transferred = false): TradeItemState {
  return { kind: "objekt", sender, transferred };
}

function payment(sender: "from" | "to", confirmed = false): TradeItemState {
  return { kind: "payment", sender, confirmed };
}

// a sale: the poster sends one objekt, the claimer pays for it
const sale = (sent = false, confirmed = false) => [
  objekt("from", sent),
  payment("to", confirmed),
];

// a pending trade here is a direct offer, which `from` proposes; listingOffer() builds the other kind
function trade(
  status: Exclude<TradeStatus, "cancelled">,
  items: readonly TradeItemState[],
): TradeState {
  switch (status) {
    case "pending":
      return directOffer(items);
    default:
      return { status, items };
  }
}

function directOffer(items: readonly TradeItemState[]): TradeState {
  return { status: "pending", proposedBy: "from", items };
}

// an offer on a listing, which its claimer (`to`) proposes to the poster
function listingOffer(items: readonly TradeItemState[]): TradeState {
  return { status: "pending", proposedBy: "to", items };
}

function statusAfter(state: TradeState, event: TradeEvent) {
  const result = transition(state, event);
  return result.ok ? result.trade.status : result.reason;
}

// a 1-for-6 shaped swap: the poster sends 3, the claimer sends 3
const sixObjekts = (transferred = false) => [
  objekt("from", transferred),
  objekt("from", transferred),
  objekt("from", transferred),
  objekt("to", transferred),
  objekt("to", transferred),
  objekt("to", transferred),
];

/**
 * One event per status check, with an acting side that may take it, the
 * statuses it is allowed from with nothing sent yet, and where it goes.
 * Every other status refuses with wrong_status.
 */
const allowed: [TradeEvent, TradeStatus[], TradeStatus][] = [
  [{ type: "accept", by: "to" }, ["pending"], "accepted"],
  [{ type: "staff_complete" }, ["disputed"], "completed"],
  [{ type: "staff_cancel" }, ["accepted", "disputed"], "cancelled"],
  [{ type: "staff_extend" }, ["disputed"], "accepted"],
];

describe("transition: status checks", () => {
  for (const [event, from, to] of allowed) {
    describe(event.type, () => {
      test.each(["pending", "accepted", "disputed", "completed"] as const)(
        "from %s",
        (status) => {
          const expected = from.includes(status) ? to : "wrong_status";
          expect(statusAfter(trade(status, sixObjekts()), event)).toBe(
            expected,
          );
        },
      );
    });
  }
});

/**
 * Who may answer a pending offer: a direct offer, which `from` proposes, and
 * an offer on a listing, which its claimer (`to`) proposes to the poster and
 * which can't be countered.
 */
describe("transition: answering an offer", () => {
  const items = [objekt("from"), objekt("to")];
  const direct = directOffer(items);
  const onListing = listingOffer(items);

  test.each([
    ["accept", "from", "wrong_party"],
    ["decline", "to", "declined"],
    ["counter", "to", "countered"],
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
    ["counter", "from", "listing_offer"],
    ["withdraw", "to", "withdrawn"],
    ["withdraw", "from", "wrong_party"],
  ] satisfies [OfferEvent, TradeSide, TradeStatus | TransitionRefusal][])(
    "an offer on a listing: %s by %s gives %s",
    (type, by, expected) => {
      expect(statusAfter(onListing, { type, by })).toBe(expected);
    },
  );
});

describe("transition: parties", () => {
  test("either party may cancel or dispute (LIFE-04, UNIT-01)", () => {
    const items = sixObjekts();
    const state = trade("accepted", items);
    for (const by of ["from", "to"] as const) {
      expect(transition(state, { type: "cancel", by })).toEqual({
        ok: true,
        trade: { status: "cancelled", cancelledBy: by, items },
      });
      expect(statusAfter(state, { type: "dispute", by })).toBe("disputed");
    }
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
});

describe("transition: cancelling", () => {
  test("a dispute is still possible once part of one side arrived (LIFE-02, UNIT-04)", () => {
    for (const by of ["from", "to"] as const) {
      expect(
        statusAfter(
          trade("accepted", sixObjekts().with(0, objekt("from", true))),
          { type: "dispute", by },
        ),
      ).toBe("disputed");
    }
  });
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
      expect(reason(trade("disputed", sixObjekts()), type, due)).toBe(
        "wrong_status",
      );
    },
  );

  test.each(["cancel", "dispute"] as const)(
    "%s: a due trade is refused before anything else",
    (type) => {
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

  test("confirm_payment: refused past the deadline, recorded before it", () => {
    const confirm = { type: "confirm_payment", item: 1, by: "from" } as const;
    const settle = (deadlinePassed: boolean) => {
      const result = partyAction(trade("accepted", sale(true)), confirm, {
        deadlinePassed,
        arrived: false,
      });
      return result.ok ? result.trade.status : result.reason;
    };
    expect(settle(true)).toBe("deadline_passed");
    expect(settle(false)).toBe("completed");
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

  test("times out when neither sent", () => {
    const items = [objekt("from"), objekt("to")];
    expect(transition(trade("accepted", items), { type: "time_out" })).toEqual({
      ok: true,
      trade: { status: "timed_out", items },
    });
  });
});

describe("transition: payments", () => {
  test("only the payment's recipient confirms it", () => {
    const accepted = trade("accepted", sale());
    expect(
      statusAfter(accepted, { type: "confirm_payment", item: 1, by: "to" }),
    ).toBe("wrong_party");
    expect(
      transition(accepted, { type: "confirm_payment", item: 1, by: "from" }),
    ).toEqual({
      ok: true,
      trade: { status: "accepted", items: sale(false, true) },
    });
  });

  test("a confirmation that settles the trade completes it", () => {
    expect(
      statusAfter(trade("accepted", sale(true)), {
        type: "confirm_payment",
        item: 1,
        by: "from",
      }),
    ).toBe("completed");
  });

  test("the last token arriving after a confirmation completes it", () => {
    expect(
      statusAfter(trade("accepted", sale(false, true)), {
        type: "transfer",
        item: 0,
      }),
    ).toBe("completed");
  });

  test("a payment confirms once, and never as a transfer", () => {
    expect(
      statusAfter(trade("accepted", sale(false, true)), {
        type: "confirm_payment",
        item: 1,
        by: "from",
      }),
    ).toBe("already_done");
    expect(
      statusAfter(trade("accepted", sale()), { type: "transfer", item: 1 }),
    ).toBe("no_such_item");
    expect(
      statusAfter(trade("accepted", sale()), {
        type: "confirm_payment",
        item: 0,
        by: "to",
      }),
    ).toBe("no_such_item");
  });

  test("a disputed trade records a confirmation but stays disputed", () => {
    expect(
      statusAfter(trade("disputed", sale(true)), {
        type: "confirm_payment",
        item: 1,
        by: "from",
      }),
    ).toBe("disputed");
  });

  test("the payer may cancel until the payment is confirmed", () => {
    expect(
      statusAfter(trade("accepted", sale(false, true)), {
        type: "cancel",
        by: "to",
      }),
    ).toBe("already_started");
    expect(
      statusAfter(trade("accepted", sale()), { type: "cancel", by: "to" }),
    ).toBe("cancelled");
  });

  test("the recipient of an unconfirmed payment can't cancel", () => {
    expect(
      statusAfter(trade("accepted", sale()), { type: "cancel", by: "from" }),
    ).toBe("payment_due");
    // the poster paying on top is the payer, so the claimer is the recipient
    const onTop = [objekt("from"), payment("from"), objekt("to")];
    expect(
      statusAfter(trade("accepted", onTop), { type: "cancel", by: "to" }),
    ).toBe("payment_due");
    expect(
      statusAfter(trade("accepted", onTop), { type: "cancel", by: "from" }),
    ).toBe("cancelled");
  });

  test("a swap without a payment cancels as before", () => {
    expect(
      statusAfter(trade("accepted", sixObjekts()), {
        type: "cancel",
        by: "from",
      }),
    ).toBe("cancelled");
  });

  test("times out when the payment was never confirmed and nothing was sent", () => {
    expect(statusAfter(trade("accepted", sale()), { type: "time_out" })).toBe(
      "timed_out",
    );
  });

  test.each([
    ["the objekt arrived, the payment is unconfirmed", sale(true), "from"],
    ["the payment is confirmed, the objekt not sent", sale(false, true), "to"],
  ] satisfies [string, TradeItemState[], TradeSide][])(
    "disputes at the deadline when %s, reported by the waiting side",
    (_, items, waiting) => {
      expect(statusAfter(trade("accepted", items), { type: "time_out" })).toBe(
        "disputed",
      );
      expect(waitingSide(items)).toBe(waiting);
    },
  );

  test("the poster's payment on top is owed by the poster", () => {
    const items = [objekt("from", true), payment("from"), objekt("to", true)];
    expect(waitingSide(items)).toBe("to");
    expect(statusAfter(trade("accepted", items), { type: "time_out" })).toBe(
      "disputed",
    );
  });
});

describe("transition: staff extend", () => {
  test("completes a disputed trade whose items all arrived (LIFE-25)", () => {
    expect(
      transition(trade("disputed", sixObjekts(true)), { type: "staff_extend" }),
    ).toEqual({
      ok: true,
      trade: { status: "completed", items: sixObjekts(true) },
    });
  });
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
  ] satisfies [string, TradeItemState[], TradeSide | null][])(
    "%s",
    (_, items, expected) => {
      expect(waitingSide(items)).toBe(expected);
    },
  );
});

describe("proposerId", () => {
  const row = {
    id: "3f2a9c1e-7d4b-4e8a-9b6c-1a2b3c4d5e6f",
    fromUserId: "poster",
    toUserId: "claimer",
  };

  test("the proposer is the user on the side that proposed", () => {
    expect(proposerId({ ...row, proposedBy: "from" })).toBe("poster");
    expect(proposerId({ ...row, proposedBy: "to" })).toBe("claimer");
  });
});

describe("tradeListingId", () => {
  const listingId = "8c1f0d0e-6b8e-4a59-9a43-3f0c2a1e5d10";

  test("names the listing any item came from", () => {
    expect(
      tradeListingId([{ listingId: null }, { listingId }, { listingId }]),
    ).toBe(listingId);
  });
});

describe("needsYou (UNIT-05)", () => {
  const partial = [objekt("from", true), objekt("from"), objekt("to", true)];
  const running = { deadlinePassed: false };

  test("an accepted trade needs the sides still owing", () => {
    expect(needsYou(trade("accepted", partial), "from", running)).toBe(true);
    expect(needsYou(trade("accepted", partial), "to", running)).toBe(false);
  });

  test("an accepted trade past its deadline needs no one", () => {
    expect(
      needsYou(trade("accepted", sixObjekts()), "from", {
        deadlinePassed: true,
      }),
    ).toBe(false);
  });

  test("a pending offer needs only the side that didn't propose it (UNIT-06)", () => {
    const direct = directOffer(sixObjekts());
    expect(needsYou(direct, "to", running)).toBe(true);
    expect(needsYou(direct, "from", running)).toBe(false);
    const onListing = listingOffer(sixObjekts());
    expect(needsYou(onListing, "from", running)).toBe(true);
    expect(needsYou(onListing, "to", running)).toBe(false);
  });

  test("an unconfirmed payment needs its recipient, never its sender", () => {
    const sent = trade("accepted", sale(true));
    expect(needsYou(sent, "from", running)).toBe(true);
    expect(needsYou(sent, "to", running)).toBe(false);
    const confirmed = trade("accepted", sale(false, true));
    expect(needsYou(confirmed, "from", running)).toBe(true);
    expect(needsYou(confirmed, "to", running)).toBe(false);
    expect(
      needsYou(trade("accepted", sale(true)), "from", { deadlinePassed: true }),
    ).toBe(false);
  });

  test("a disputed trade never needs anyone (UNIT-06)", () => {
    expect(needsYou(trade("disputed", sixObjekts()), "from", running)).toBe(
      false,
    );
  });
});

describe("listingClosing", () => {
  test.each([
    ["a pool of exactly one unit stays open", 2, 2, false, false, null],
    ["a pool of several units stays open", 5, 2, false, true, null],
    ["a pool short of a unit closes broken", 1, 2, false, false, "break"],
    [
      "a pool short of a unit after a completion closes filled",
      1,
      2,
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
    [
      'exact and "any of" rows together are claimed',
      ["exact", "choice"],
      false,
    ],
    [
      "a range row among others takes offers",
      ["exact", "range", "choice"],
      true,
    ],
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
    confirmedAt: null,
  };
  const at = new Date("2026-10-12T12:00:00Z");
  const listingId = "8c1f0d0e-6b8e-4a59-9a43-3f0c2a1e5d10";

  test("reads items in order, by what their timestamps say", () => {
    expect(
      tradeState({ status: "accepted", cancelledBy: null, proposedBy: null }, [
        { kind: "objekt", sender: "from", ...unsent, transferredAt: at },
        { kind: "objekt", sender: "to", ...unsent },
      ]),
    ).toEqual({
      status: "accepted",
      items: [objekt("from", true), objekt("to")],
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
});
