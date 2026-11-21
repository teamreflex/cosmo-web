import type {
  ListingOfferMode,
  TradeSide,
  TradeStatus,
  TradeWantKind,
} from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import {
  type ClaimTerms,
  claimTerms,
  type DeadlineOwed,
  editUnitsRefusal,
  type ListingAcceptance,
  listingAcceptance,
  listingClosing,
  listingParts,
  listingUnits,
  type NextStep,
  nextStep,
  type OfferEvent,
  otherSide,
  owedAtDeadline,
  partyAction,
  proposerId,
  type TradeEvent,
  type TradeItemState,
  tradeItemState,
  tradeListingId,
  tradeListings,
  type TradeParts,
  tradeParts,
  type TradeState,
  tradeState,
  transition,
  type TransitionRefusal,
  waitingSide,
} from "../src/lifecycle";
import type { ListingUnits } from "../src/lifecycle";
import type { PaymentPrice, TradePayment } from "../src/payment";

function objekt(sender: "from" | "to", transferred = false): TradeItemState {
  return { kind: "objekt", sender, transferred };
}

function payment(
  sender: "from" | "to",
  confirmed = false,
  markedPaid = false,
): TradeItemState {
  return {
    kind: "payment",
    sender,
    stage: confirmed ? "confirmed" : markedPaid ? "marked" : "unpaid",
  };
}

// a sale: the poster sends one objekt, the claimer pays for it
const sale = (sent = false, confirmed = false, markedPaid = false) => [
  objekt("from", sent),
  payment("to", confirmed, markedPaid),
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

  test("mark_paid: refused past the deadline, recorded before it", () => {
    const mark = { type: "mark_paid", item: 1, by: "to" } as const;
    const marked = (deadlinePassed: boolean) => {
      const result = partyAction(trade("accepted", sale()), mark, {
        deadlinePassed,
        arrived: false,
      });
      return result.ok ? result.trade.items[1] : result.reason;
    };
    expect(marked(true)).toBe("deadline_passed");
    expect(marked(false)).toEqual(payment("to", false, true));
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

/**
 * The payer marking a payment paid is a record: it changes no status and
 * settles nothing, and only the deadline counts it, as the payer having
 * done their part.
 */
describe("transition: marking paid", () => {
  const markPaid = (by: TradeSide) =>
    ({ type: "mark_paid", item: 1, by }) satisfies TradeEvent;

  test("only the payer marks it, and the trade stays where it was", () => {
    expect(statusAfter(trade("accepted", sale()), markPaid("from"))).toBe(
      "wrong_party",
    );
    expect(transition(trade("accepted", sale(true)), markPaid("to"))).toEqual({
      ok: true,
      trade: { status: "accepted", items: sale(true, false, true) },
    });
    expect(statusAfter(trade("disputed", sale()), markPaid("to"))).toBe(
      "disputed",
    );
  });

  test.each([
    [
      "already marked",
      trade("accepted", sale(false, false, true)),
      "already_done",
    ],
    ["already confirmed", trade("accepted", sale(false, true)), "already_done"],
    ["ended", trade("timed_out", sale()), "wrong_status"],
    ["still an offer", listingOffer(sale()), "wrong_status"],
  ] satisfies [string, TradeState, TransitionRefusal][])(
    "is refused once %s",
    (_, state, refusal) => {
      expect(statusAfter(state, markPaid("to"))).toBe(refusal);
    },
  );

  test("names a payment, never an objekt", () => {
    expect(
      statusAfter(trade("accepted", sale()), {
        type: "mark_paid",
        item: 0,
        by: "from",
      }),
    ).toBe("no_such_item");
  });

  test("never completes a trade; the recipient's confirmation does", () => {
    const marked = trade("accepted", sale(true, false, true));
    expect(statusAfter(marked, { type: "transfer", item: 0 })).toBe(
      "already_done",
    );
    expect(
      statusAfter(marked, { type: "confirm_payment", item: 1, by: "from" }),
    ).toBe("completed");
    expect(
      statusAfter(trade("accepted", sale(false, true, true)), {
        type: "transfer",
        item: 0,
      }),
    ).toBe("completed");
  });

  test("leaves cancelling as it was", () => {
    const marked = trade("accepted", sale(false, false, true));
    expect(statusAfter(marked, { type: "cancel", by: "to" })).toBe("cancelled");
    expect(statusAfter(marked, { type: "cancel", by: "from" })).toBe(
      "payment_due",
    );
  });

  test.each([
    ["nothing was done", sale(), "timed_out", null],
    [
      "only the payment was marked paid",
      sale(false, false, true),
      "disputed",
      "to",
    ],
    [
      "the payment was marked paid and the objekt arrived",
      sale(true, false, true),
      "disputed",
      null,
    ],
  ] satisfies [string, TradeItemState[], TradeStatus, TradeSide | null][])(
    "at the deadline, when %s, it is %s",
    (_, items, status, waiting) => {
      expect(statusAfter(trade("accepted", items), { type: "time_out" })).toBe(
        status,
      );
      expect(waitingSide(items)).toBe(waiting);
    },
  );
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

describe("nextStep (UNIT-05)", () => {
  const partial = [objekt("from", true), objekt("from"), objekt("to", true)];
  const running = { deadlinePassed: false };

  test("an accepted trade asks the sides still owing to send", () => {
    expect(nextStep(trade("accepted", partial), "from", running)).toEqual({
      kind: "send",
      count: 1,
    });
    expect(nextStep(trade("accepted", partial), "to", running)).toBeNull();
  });

  test("an accepted trade past its deadline asks no one", () => {
    expect(
      nextStep(trade("accepted", sixObjekts()), "from", {
        deadlinePassed: true,
      }),
    ).toBeNull();
  });

  test("a pending offer asks only the side that didn't propose it to answer (UNIT-06)", () => {
    const direct = directOffer(sixObjekts());
    expect(nextStep(direct, "to", running)).toEqual({ kind: "answer" });
    expect(nextStep(direct, "from", running)).toBeNull();
    const onListing = listingOffer(sixObjekts());
    expect(nextStep(onListing, "from", running)).toEqual({ kind: "answer" });
    expect(nextStep(onListing, "to", running)).toBeNull();
  });

  // the payer and the recipient, by who sends the payment and the objekts
  const payingTrades = [
    ["a sale", [objekt("from")], "to"],
    ["a buy listing's trade", [objekt("to")], "from"],
    ["objekts and the claimer's payment", [objekt("from"), objekt("to")], "to"],
    ["the poster paying on top", [objekt("from"), objekt("to")], "from"],
  ] satisfies [string, TradeItemState[], TradeSide][];

  // every objekt arrived, so only the payment is left
  test.each(
    payingTrades.flatMap(([name, objekts, payer]) =>
      (
        [
          ["unpaid", false, false, { kind: "mark_paid" }, { kind: "confirm" }],
          ["marked paid", false, true, null, { kind: "confirm" }],
          ["confirmed", true, true, null, null],
        ] satisfies [
          string,
          boolean,
          boolean,
          NextStep | null,
          NextStep | null,
        ][]
      ).map(
        ([stage, confirmed, markedPaid, payerStep, recipientStep]) =>
          [
            `${name}, ${stage}`,
            [
              ...objekts.map((item) => ({ ...item, transferred: true })),
              payment(payer, confirmed, markedPaid),
            ],
            payer,
            payerStep,
            recipientStep,
          ] as const,
      ),
    ),
  )(
    "%s: the payer's step and the recipient's",
    (_, items, payer, payerStep, recipientStep) => {
      const state = trade("accepted", items);
      expect(nextStep(state, payer, running)).toEqual(payerStep);
      expect(nextStep(state, otherSide(payer), running)).toEqual(recipientStep);
    },
  );

  test.each(payingTrades)(
    "%s: a side still owing an objekt sends it before its payment step",
    (_, objekts, payer) => {
      const state = trade("accepted", [...objekts, payment(payer)]);
      for (const side of ["from", "to"] as const) {
        const count = objekts.filter((item) => item.sender === side).length;
        expect(nextStep(state, side, running)).toEqual(
          count > 0
            ? { kind: "send", count }
            : side === payer
              ? { kind: "mark_paid" }
              : { kind: "confirm" },
        );
      }
    },
  );

  test("a regular trade with every objekt arrived asks no one", () => {
    const state = trade("accepted", [objekt("from", true), objekt("to", true)]);
    expect(nextStep(state, "from", running)).toBeNull();
    expect(nextStep(state, "to", running)).toBeNull();
  });

  test("a payment's recipient still owing an objekt is asked to send it", () => {
    expect(
      nextStep(trade("accepted", sale(false, true)), "from", running),
    ).toEqual({ kind: "send", count: 1 });
  });

  test("a disputed trade never asks anyone (UNIT-06)", () => {
    expect(
      nextStep(trade("disputed", sixObjekts()), "from", running),
    ).toBeNull();
  });
});

/**
 * A deadline dispute's wording follows what is owed; a trade without a
 * payment always reads as objekts owed, main's wording.
 */
describe("owedAtDeadline", () => {
  test.each([
    [
      "a swap with one side unsent",
      [objekt("from", true), objekt("to")],
      "objekts",
    ],
    [
      "a swap with everything arrived",
      [objekt("from", true), objekt("to", true)],
      "objekts",
    ],
    ["a sale with the objekt sent", sale(true), "payment"],
    ["a sale with the payment marked paid", sale(true, false, true), "payment"],
    ["a sale with the payment confirmed", sale(false, true), "objekts"],
    ["a sale with both still owed", sale(), "both"],
    [
      "a buy listing's trade with the objekt sent",
      [objekt("to", true), payment("from")],
      "payment",
    ],
    [
      "objekts and the claimer's payment, all unsent",
      [objekt("from"), objekt("to"), payment("to")],
      "both",
    ],
    [
      "the poster paying on top, the payment confirmed",
      [objekt("from", true), objekt("to"), payment("from", true)],
      "objekts",
    ],
  ] satisfies [string, TradeItemState[], DeadlineOwed][])(
    "%s",
    (_, items, expected) => {
      expect(owedAtDeadline(items)).toBe(expected);
    },
  );
});

describe("tradeItemState", () => {
  const at = new Date("2026-11-21T00:00:00Z");
  const row = {
    sender: "to",
    transferredAt: null,
    markedPaidAt: null,
    confirmedAt: null,
  } as const;

  test.each([
    ["an objekt not yet arrived", { kind: "objekt" }, objekt("to")],
    [
      "an objekt arrived",
      { kind: "objekt", transferredAt: at },
      objekt("to", true),
    ],
    ["an unpaid payment", { kind: "payment" }, payment("to")],
    [
      "a payment marked paid",
      { kind: "payment", markedPaidAt: at },
      payment("to", false, true),
    ],
    [
      "a payment confirmed after a mark",
      { kind: "payment", markedPaidAt: at, confirmedAt: at },
      payment("to", true),
    ],
  ] satisfies [
    string,
    Pick<Parameters<typeof tradeItemState>[0], "kind"> &
      Partial<Parameters<typeof tradeItemState>[0]>,
    TradeItemState,
  ][])("%s", (_, stored, expected) => {
    expect(tradeItemState({ ...row, ...stored })).toEqual(expected);
  });
});

describe("tradeParts", () => {
  const progress = [
    ["unpaid", false, false],
    ["marked paid", false, true],
    ["confirmed", true, false],
  ] as const;

  test("a swap: both send", () => {
    expect(tradeParts([objekt("from"), objekt("to"), objekt("to")])).toEqual({
      from: "send",
      to: "send",
    });
  });

  test.each(
    (
      [
        ["a sale", [objekt("from")], "to", { from: "send", to: "pay" }],
        [
          "a buy listing's trade",
          [objekt("to")],
          "from",
          {
            from: "pay",
            to: "send",
          },
        ],
        [
          "objekts and the claimer's payment",
          [objekt("from"), objekt("to")],
          "to",
          {
            from: "send",
            to: "send_pay",
          },
        ],
        [
          "the poster paying on top",
          [objekt("from"), objekt("to")],
          "from",
          {
            from: "send_pay",
            to: "send",
          },
        ],
      ] satisfies [string, TradeItemState[], TradeSide, TradeParts][]
    ).flatMap(([name, objekts, sender, parts]) =>
      progress.map(
        ([stage, confirmed, markedPaid]) =>
          [
            `${name}, ${stage}`,
            [...objekts, payment(sender, confirmed, markedPaid)],
            parts,
          ] as const,
      ),
    ),
  )("%s", (_, items, parts) => {
    expect(tradeParts(items)).toEqual(parts);
  });
});

describe("listingParts", () => {
  test.each([
    [
      "a pool listing for objekts",
      "pool",
      null,
      1,
      { from: "send", to: "send" },
    ],
    ["a sale", "pool", "to", 0, { from: "send", to: "pay" }],
    [
      "objekts and the claimer's payment",
      "pool",
      "to",
      2,
      {
        from: "send",
        to: "send_pay",
      },
    ],
    [
      "the poster paying on top",
      "pool",
      "from",
      1,
      {
        from: "send_pay",
        to: "send",
      },
    ],
    ["a buy listing", "buy", "from", 1, { from: "pay", to: "send" }],
  ] satisfies [
    string,
    ListingUnits["kind"],
    TradeSide | null,
    number,
    TradeParts,
  ][])("%s", (_, units, paymentSide, objektWants, parts) => {
    expect(listingParts({ units, paymentSide, objektWants })).toEqual(parts);
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
    expect(
      listingClosing({
        units: { kind: "pool", unitSize },
        pool,
        live,
        completed,
        completedUnits: 0,
      }),
    ).toBe(expected);
  });

  // a buy listing of three units, which has no pool
  test.each([
    ["stays open with no trade", 0, false, null],
    ["stays open short of its units", 2, false, null],
    ["fills once its completed trades fill every unit", 3, false, "fill"],
    ["fills past its units, after an edit lowered them", 4, false, "fill"],
    ["stays open while a trade is live", 3, true, null],
  ] satisfies [string, number, boolean, "fill" | null][])(
    "a buy listing %s",
    (_, completedUnits, live, expected) => {
      expect(
        listingClosing({
          units: { kind: "buy", maxUnits: 3 },
          pool: 0,
          live,
          completed: completedUnits > 0,
          completedUnits,
        }),
      ).toBe(expected);
    },
  );
});

describe("listingUnits", () => {
  test("parses a pool listing's unit size", () => {
    expect(listingUnits({ id: "l", unitSize: 2, maxUnits: null })).toEqual({
      kind: "pool",
      unitSize: 2,
    });
  });

  test("parses a buy listing's most units", () => {
    expect(listingUnits({ id: "l", unitSize: null, maxUnits: 3 })).toEqual({
      kind: "buy",
      maxUnits: 3,
    });
  });

  test.each([
    ["neither, as a trade has", null, null],
    ["both", 2, 3],
  ] satisfies [string, number | null, number | null][])(
    "throws on %s",
    (_, unitSize, maxUnits) => {
      expect(() => listingUnits({ id: "l", unitSize, maxUnits })).toThrow();
    },
  );
});

describe("tradeListings", () => {
  test("names each listing with the pool tokens the trade took from it", () => {
    expect(
      tradeListings([
        { listingId: "a", tokenId: 1 },
        { listingId: null, tokenId: 2 },
        { listingId: "a", tokenId: 3 },
      ]),
    ).toEqual(new Map([["a", [1, 3]]]));
  });

  test("finds a buy listing through the poster's payment, with no tokens", () => {
    expect(
      tradeListings([
        { listingId: null, tokenId: 2 },
        { listingId: "buy", tokenId: null },
      ]),
    ).toEqual(new Map([["buy", []]]));
  });

  test("a direct offer has no listing", () => {
    expect(tradeListings([{ listingId: null, tokenId: 2 }]).size).toBe(0);
  });
});

describe("listingAcceptance", () => {
  test.each([
    [
      'exact and "any of" rows together are claimed',
      ["exact", "choice"],
      null,
      "claim",
    ],
    [
      "a range row among others takes offers",
      ["exact", "range", "choice"],
      null,
      "offer",
    ],
    ["a fixed price is claimed", [], "price_only", "claim"],
    [
      "a price open to offers takes either",
      ["exact"],
      "price_or_offer",
      "either",
    ],
    ["a payment with no asking price takes offers", [], "offer_only", "offer"],
    [
      "a range row beside a price open to offers takes offers",
      ["range"],
      "price_or_offer",
      "offer",
    ],
  ] satisfies [
    string,
    TradeWantKind[],
    ListingOfferMode | null,
    ListingAcceptance,
  ][])("%s", (_, kinds, mode, expected) => {
    const wants = kinds.map((kind) => ({ kind }));
    expect(listingAcceptance(wants, mode)).toBe(expected);
  });
});

describe("claimTerms", () => {
  const price = (
    mode: Exclude<ListingOfferMode, "offer_only">,
  ): PaymentPrice => ({ mode, amount: 300 });

  test.each([
    [
      "no payment, no amount: a claim",
      [],
      null,
      undefined,
      { kind: "claim", amount: null },
    ],
    ["no payment with an amount is refused", [], null, 250, null],
    [
      "a fixed price claims at it",
      [],
      price("price_only"),
      undefined,
      { kind: "claim", amount: 300 },
    ],
    [
      "a fixed price refuses another amount",
      [],
      price("price_only"),
      250,
      null,
    ],
    [
      "a fixed price refuses its own amount sent as an offer",
      [],
      price("price_only"),
      300,
      null,
    ],
    [
      "open to offers claims at the asking price",
      [],
      price("price_or_offer"),
      undefined,
      { kind: "claim", amount: 300 },
    ],
    [
      "open to offers takes another amount as an offer",
      [],
      price("price_or_offer"),
      250,
      { kind: "offer", amount: 250 },
    ],
    [
      "open to offers claims at once on the asking price",
      [],
      price("price_or_offer"),
      300,
      { kind: "claim", amount: 300 },
    ],
    [
      "offer only needs an amount",
      [],
      { mode: "offer_only", amount: null },
      undefined,
      null,
    ],
    [
      "offer only takes an amount as an offer",
      [],
      { mode: "offer_only", amount: null },
      250,
      { kind: "offer", amount: 250 },
    ],
    [
      "a range row makes the asking price an offer",
      ["range"],
      price("price_or_offer"),
      undefined,
      { kind: "offer", amount: 300 },
    ],
    [
      "a range row at a fixed price offers at it",
      ["range"],
      price("price_only"),
      undefined,
      { kind: "offer", amount: 300 },
    ],
    [
      "a range row with no payment offers",
      ["range"],
      null,
      undefined,
      { kind: "offer", amount: null },
    ],
  ] satisfies [
    string,
    TradeWantKind[],
    PaymentPrice | null,
    number | undefined,
    { kind: ClaimTerms["kind"]; amount: number | null } | null,
  ][])("%s", (_, kinds, price, proposed, expected) => {
    // a sale's payment, which the claimer sends in USD
    expect(
      claimTerms(
        {
          wants: kinds.map((kind) => ({ kind })),
          payment:
            price === null
              ? null
              : { side: "to", currency: "USD", methods: ["wise"], ...price },
        },
        proposed,
      ),
    ).toEqual(
      expected === null
        ? null
        : {
            kind: expected.kind,
            payment:
              expected.amount === null
                ? null
                : ({
                    sender: "to",
                    currency: "USD",
                    amount: expected.amount,
                  } satisfies TradePayment),
          },
    );
  });
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

describe("editUnitsRefusal", () => {
  const pool: ListingUnits = { kind: "pool", unitSize: 1 };
  const buy = (maxUnits: number): ListingUnits => ({ kind: "buy", maxUnits });
  const held = {
    units: buy(3),
    live: false,
    completed: false,
    taken: 0,
    completedUnits: 0,
  };

  test("a listing with no trade may change its kind", () => {
    expect(editUnitsRefusal(pool, held)).toBeNull();
    expect(editUnitsRefusal(buy(2), { ...held, units: pool })).toBeNull();
  });

  test.each([
    ["a live trade", { live: true, taken: 1 }],
    ["a completed trade", { completed: true, taken: 1, completedUnits: 1 }],
  ])("%s keeps the listing's kind", (_, trades) => {
    expect(editUnitsRefusal(pool, { ...held, ...trades })).toBe("kind_fixed");
    expect(editUnitsRefusal(buy(2), { ...held, ...trades, units: pool })).toBe(
      "kind_fixed",
    );
  });

  test.each([
    ["below the units live and completed trades fill", 2, 3, 1, "units_taken"],
    ["at them, with one still live", 3, 3, 2, null],
    ["at the completed units alone", 2, 2, 2, "units_taken"],
    ["above them", 4, 3, 2, null],
  ] satisfies [string, number, number, number, "units_taken" | null][])(
    "most units %s",
    (_, maxUnits, taken, completedUnits, expected) => {
      expect(
        editUnitsRefusal(buy(maxUnits), {
          ...held,
          live: taken > completedUnits,
          completed: completedUnits > 0,
          taken,
          completedUnits,
        }),
      ).toBe(expected);
    },
  );
});
