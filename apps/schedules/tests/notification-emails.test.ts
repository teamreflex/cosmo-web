import { setCategoryEnabled } from "@apollo/trades/notifications";
import { describe, expect, it } from "bun:test";
import { isEmailable, planEmails } from "../src/notification-emails";

const NOW = new Date("2026-10-10T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function ago(ms: number) {
  return new Date(NOW.getTime() - ms);
}

type Row = Parameters<typeof isEmailable>[0];
type Recipient = NonNullable<
  ReturnType<Parameters<typeof planEmails>[0]["recipients"]["get"]>
>;

// an unread offer @Kairu received a minute ago
function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "received",
    userId: "kairu",
    type: "offer_received",
    createdAt: ago(60_000),
    readAt: null,
    actorId: "trader-b",
    offerId: "offer-1",
    ...overrides,
  };
}

// the emails for @Kairu's rows, all about one trade with trader B
function plan(rows: Row[], recipient: Partial<Recipient> = {}) {
  return planEmails({
    rows: rows.filter((claimed) => isEmailable(claimed, NOW)),
    recipients: new Map([
      [
        "kairu",
        {
          id: "kairu",
          email: "kairu@apollo.test",
          emailVerified: true,
          banned: false,
          banExpires: null,
          emailNotifications: 0,
          ...recipient,
        },
      ],
    ]),
    offers: new Map([
      [
        "offer-1",
        {
          id: "offer-1",
          status: "accepted",
          fromUserId: "trader-b",
          toUserId: "kairu",
          deadlineAt: null,
          expiresAt: null,
          fromName: "TraderB",
          toName: "Kairu",
        },
      ],
    ]),
    items: new Map(),
    objekts: new Map(),
    now: NOW,
    appUrl: (path) => `https://apollo.test${path}`,
    cdnUrl: "https://cdn.test",
  });
}

describe("isEmailable", () => {
  it.each([
    ["read", { readAt: NOW }],
    ["of a bell-only type", { type: "trade_completed" }],
    ["older than 24 hours", { createdAt: ago(DAY + 1) }],
  ] as const)("refuses a row that is %s", (_, overrides) => {
    expect(isEmailable(row(overrides), NOW)).toBe(false);
  });

  it("takes a row exactly 24 hours old", () => {
    expect(isEmailable(row({ createdAt: ago(DAY) }), NOW)).toBe(true);
  });
});

describe("planEmails", () => {
  it.each([
    ["has no verified email", { emailVerified: false }],
    ["is banned", { banned: true }],
    [
      "opted out of the row's type",
      { emailNotifications: setCategoryEnabled(0, "offers", false) },
    ],
  ] as const)("mails nothing to a recipient who %s", (_, recipient) => {
    expect(plan([row()], recipient)).toEqual([]);
  });

  it("orders one email's rows most urgent first, newest first within a type", () => {
    const [email, ...others] = plan([
      row({ createdAt: ago(1000) }),
      row({ id: "accepted-old", type: "offer_accepted", createdAt: ago(3000) }),
      row({ id: "accepted-new", type: "offer_accepted", createdAt: ago(2000) }),
    ]);

    expect(others).toEqual([]);
    expect(email?.to).toBe("kairu@apollo.test");
    expect(email?.rowIds).toEqual(["accepted-new", "accepted-old", "received"]);
    expect(email?.items.map((item) => item.id)).toEqual(email?.rowIds);
  });
});
