import { describe, expect, test } from "bun:test";
import {
  type DisputeDetails,
  type DisputeItemRow,
  disputeWebhookRequest,
} from "../src/disputes";

const at = new Date("2026-11-21T00:00:00Z");

// the field listing what `party` sends in a trade of one item
function sends(
  party: "seller" | "buyer",
  item: DisputeItemRow,
  tokens: DisputeDetails["tokens"] = new Map(),
) {
  const { body } = disputeWebhookRequest(
    "https://discord.invalid/hook",
    "https://apollo.invalid",
    {
      reportId: "r",
      tradeId: "t",
      reason: "deadline_passed",
      note: null,
      openedBy: null,
      fromUserId: null,
      toUserId: null,
    },
    {
      parties: {
        from: { username: "seller", cosmoUsername: null },
        to: { username: "buyer", cosmoUsername: null },
      },
      items: [item],
      tokens,
    },
  );
  return body.embeds[0]?.fields.find((field) => field.name === `${party} sends`)
    ?.value;
}

// what the buyer, who only pays, sends
function buyerSends(payment: {
  method: "wise" | null;
  markedPaidAt: Date | null;
  confirmedAt: Date | null;
}) {
  return sends("buyer", {
    id: 1,
    sender: "to",
    kind: "payment",
    tokenId: null,
    substituteTokenId: null,
    member: null,
    season: null,
    amount: "3.00",
    currency: "USD",
    ...payment,
  });
}

// Intl puts a no-break space between the currency code and the amount
describe("disputeWebhookRequest", () => {
  test.each([
    [null, null, null, "- USD\u00a03.00, not confirmed"],
    [null, at, null, "- USD\u00a03.00, marked paid, not confirmed"],
    ["wise", at, at, "- USD\u00a03.00, confirmed via wise"],
    ["wise", null, at, "- USD\u00a03.00, confirmed via wise"],
  ] as const)(
    "a payment confirmed by %p, marked paid at %p and confirmed at %p reads %p",
    (method, markedPaidAt, confirmedAt, expected) => {
      expect(buyerSends({ method, markedPaidAt, confirmedAt })).toBe(expected);
    },
  );
});

describe("disputeWebhookRequest: objekts", () => {
  // what the seller, who sends one objekt, sends
  function sellerSends(substituteTokenId: number | null) {
    return sends(
      "seller",
      {
        id: 1,
        sender: "from",
        kind: "objekt",
        tokenId: 10,
        substituteTokenId,
        member: "HeeJin",
        season: "Atom01",
        amount: null,
        currency: null,
        method: null,
        markedPaidAt: null,
        confirmedAt: null,
      },
      new Map([
        [10, { collectionNo: "101Z", serial: 1 }],
        [11, { collectionNo: "101Z", serial: 2 }],
      ]),
    );
  }

  test("names the pinned serial", () => {
    expect(sellerSends(null)).toBe("- HeeJin Atom01 101Z #00001");
  });

  test("names an accepted copy and the serial it stood in for", () => {
    expect(sellerSends(11)).toBe(
      "- HeeJin Atom01 101Z #00002, accepted in place of #00001",
    );
  });
});
