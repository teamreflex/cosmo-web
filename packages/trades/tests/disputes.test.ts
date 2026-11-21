import { describe, expect, test } from "bun:test";
import { disputeWebhookRequest } from "../src/disputes";

const at = new Date("2026-11-21T00:00:00Z");

// the field listing what the buyer, who only pays, sends
function buyerSends(payment: {
  method: "wise" | null;
  markedPaidAt: Date | null;
  confirmedAt: Date | null;
}) {
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
      items: [
        {
          id: 1,
          sender: "to",
          kind: "payment",
          tokenId: null,
          member: null,
          season: null,
          amount: "3.00",
          currency: "USD",
          ...payment,
        },
      ],
      tokens: new Map(),
    },
  );
  return body.embeds[0]?.fields.find((field) => field.name === "buyer sends")
    ?.value;
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
