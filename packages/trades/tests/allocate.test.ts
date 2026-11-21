import { describe, expect, test } from "bun:test";
import {
  allocate,
  allocateUnits,
  fillsExactly,
  type InventoryObjekt,
  listingOfferRefusal,
  type OfferedToken,
  offerUnits,
  paymentFits,
  type TradeWant,
  unitsLeft,
  unitsOf,
} from "../src/allocate";
import { MAX_PER_ROW, MAX_TOTAL_WANTED } from "../src/caps";
import type { ListingUnits } from "../src/lifecycle";
import type { ListingPayment, TradePayment } from "../src/payment";
import type { RangeFilter } from "../src/range";

let nextTokenId = 1;

function objekt(
  season: string,
  member: string,
  collectionNo: string,
): InventoryObjekt {
  return {
    tokenId: nextTokenId++,
    slug: `${season}-${member}-${collectionNo}`.toLowerCase(),
    artist: "artms",
    member,
    collectionNo,
    season,
    class: collectionNo.startsWith("1") ? "First" : "Double",
    onOffline: collectionNo.endsWith("Z") ? "online" : "offline",
  };
}

function range(count: number, filter: Partial<RangeFilter>): TradeWant {
  return {
    kind: "range",
    count,
    ranges: [
      {
        artist: [],
        member: [],
        collectionNo: [],
        season: [],
        class: [],
        on_offline: [],
        ...filter,
      },
    ],
  };
}

function exact(count: number, slug: string): TradeWant {
  return { kind: "exact", count, slug };
}

function choice(count: number, slugs: string[]): TradeWant {
  return { kind: "choice", count, slugs };
}

describe("allocate", () => {
  test("a choice row takes any mix of its collections, copies included", () => {
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const heejinAgain = objekt("Atom01", "HeeJin", "101Z");
    const kimlip = objekt("Atom01", "KimLip", "101Z");
    const haseul = objekt("Atom01", "HaSeul", "101Z");
    const wants = [choice(3, ["atom01-heejin-101z", "atom01-kimlip-101z"])];

    expect(allocate(wants, [heejin, haseul, kimlip, heejinAgain])).toEqual([
      {
        tokenIds: [heejin.tokenId, kimlip.tokenId, heejinAgain.tokenId],
        missing: 0,
      },
    ]);
  });

  test("moves tokens between a range and a choice row to cover both", () => {
    /**
     * Both rows have two candidates, so the choice row goes first and takes
     * HeeJin, which the range needs beside KimLip.
     */
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    const haseul = objekt("Atom01", "HaSeul", "101Z");
    const kimlip = objekt("Atom01", "KimLip", "101Z");
    const wants = [
      choice(1, ["atom01-heejin-101z", "atom01-haseul-101z"]),
      range(2, { member: ["HeeJin", "KimLip"] }),
    ];

    expect(allocate(wants, [heejin, haseul, kimlip])).toEqual([
      { tokenIds: [haseul.tokenId], missing: 0 },
      { tokenIds: [heejin.tokenId, kimlip.tokenId], missing: 0 },
    ]);
  });
});

describe("allocateUnits", () => {
  const firsts = (count: number) =>
    Array.from({ length: count }, () => objekt("Atom01", "HaSeul", "101Z"));
  const wants = [range(1, { member: ["HaSeul"] })];

  test("takes as many units as the inventory fills", () => {
    const inventory = firsts(3);
    expect(
      allocateUnits(wants, inventory, { kind: "pool", free: 8, unitSize: 1 }),
    ).toEqual({
      units: 3,
      allocation: [{ tokenIds: inventory.map((o) => o.tokenId), missing: 0 }],
    });
  });

  test("stops at the per-row cap on the scaled row", () => {
    const inventory = firsts(MAX_PER_ROW + 2);
    expect(
      allocateUnits([range(2, { member: ["HaSeul"] })], inventory, {
        kind: "pool",
        free: 20,
        unitSize: 1,
      }).units,
    ).toBe(Math.floor(MAX_PER_ROW / 2));
  });

  test("stops at the total cap across rows", () => {
    const inventory = [
      ...firsts(MAX_TOTAL_WANTED),
      ...Array.from({ length: MAX_TOTAL_WANTED }, () =>
        objekt("Atom01", "HeeJin", "101Z"),
      ),
    ];
    const both = [
      range(1, { member: ["HaSeul"] }),
      exact(1, "atom01-heejin-101z"),
    ];
    expect(
      allocateUnits(both, inventory, { kind: "pool", free: 20, unitSize: 1 })
        .units,
    ).toBe(MAX_TOTAL_WANTED / 2);
  });

  test("is 0 with one unit's shortfall when nothing fills", () => {
    const heejin = objekt("Atom01", "HeeJin", "101Z");
    expect(
      allocateUnits([exact(2, "atom01-heejin-101z")], [heejin], {
        kind: "pool",
        free: 4,
        unitSize: 1,
      }),
    ).toEqual({
      units: 0,
      allocation: [{ tokenIds: [heejin.tokenId], missing: 1 }],
    });
  });

  test("is 0 when the free pool can't make a unit", () => {
    expect(
      allocateUnits(wants, firsts(2), { kind: "pool", free: 1, unitSize: 2 }),
    ).toMatchObject({ units: 0 });
  });
});

describe("allocateUnits on a buy listing", () => {
  const haseuls = (count: number) =>
    Array.from({ length: count }, () => objekt("Atom01", "HaSeul", "101Z"));
  const wants = [range(1, { member: ["HaSeul"] })];

  test("stops at the units the listing has left", () => {
    expect(
      allocateUnits(wants, haseuls(5), { kind: "buy", maxUnits: 3, taken: 1 })
        .units,
    ).toBe(2);
  });

  test("takes several units in one claim when the inventory fills them", () => {
    expect(
      allocateUnits(wants, haseuls(2), { kind: "buy", maxUnits: 3, taken: 0 })
        .units,
    ).toBe(2);
  });

  test("is 0 once its trades hold every unit", () => {
    expect(
      allocateUnits(wants, haseuls(5), { kind: "buy", maxUnits: 3, taken: 3 }),
    ).toMatchObject({ units: 0 });
  });
});

describe("unitsLeft", () => {
  test.each([
    [
      "a pool's free objekts in whole units",
      { kind: "pool", unitSize: 2, free: 5 },
      2,
    ],
    [
      "a buy listing's units no trade holds",
      { kind: "buy", maxUnits: 3, taken: 2 },
      1,
    ],
    ["none at the cap", { kind: "buy", maxUnits: 3, taken: 3 }, 0],
    [
      "none past it, after an edit lowered it",
      { kind: "buy", maxUnits: 2, taken: 3 },
      0,
    ],
  ] satisfies [string, Parameters<typeof unitsLeft>[0], number][])(
    "%s",
    (_, room, expected) => {
      expect(unitsLeft(room)).toBe(expected);
    },
  );
});

describe("offerUnits", () => {
  test("a pool listing's offer takes its picks in units", () => {
    expect(
      offerUnits(
        { picks: [1, 2, 3, 4], units: null },
        { kind: "pool", unitSize: 2 },
      ),
    ).toBe(2);
  });

  test("a buy listing's offer takes the units it recorded and picks nothing", () => {
    const buy = { kind: "buy", maxUnits: 3 } satisfies ListingUnits;
    expect(offerUnits({ picks: [], units: 2 }, buy)).toBe(2);
    expect(offerUnits({ picks: [1], units: 2 }, buy)).toBeNull();
    expect(offerUnits({ picks: [], units: null }, buy)).toBeNull();
  });
});

describe("unitsOf", () => {
  test.each([
    ["several units", 6, 2, 3],
    ["a count between units", 5, 2, null],
    ["a sale's one objekt", 1, 1, 1],
  ] satisfies [string, number, number, number | null][])(
    "%s",
    (_, picked, unitSize, expected) => {
      expect(unitsOf(picked, unitSize)).toBe(expected);
    },
  );
});

describe("fillsExactly", () => {
  const kimlip = "atom01-kimlip-101z";
  const kimlips = (count: number) =>
    Array.from({ length: count }, () => objekt("Atom01", "KimLip", "101Z"));

  test("a token too many doesn't", () => {
    expect(fillsExactly([exact(2, kimlip)], kimlips(3))).toBe(false);
  });

  test("a sale's want rows are filled only by no tokens", () => {
    expect(fillsExactly([], [])).toBe(true);
    expect(fillsExactly([], kimlips(1))).toBe(false);
  });

  test("tokens that leave a row unfilled don't", () => {
    const wants = [
      range(1, { member: ["HeeJin", "KimLip"] }),
      choice(1, ["atom01-heejin-101z", "atom01-haseul-101z"]),
    ];
    expect(fillsExactly(wants, kimlips(2))).toBe(false);
  });
});

describe("listingOfferRefusal", () => {
  const kimlip = "atom01-kimlip-101z";
  const found = (token: InventoryObjekt): OfferedToken => ({
    kind: "found",
    ...token,
  });
  const kimlips = (count: number) =>
    Array.from({ length: count }, () =>
      found(objekt("Atom01", "KimLip", "101Z")),
    );
  // a listing of four pool objekts in units of two, for two KimLip 101Z a unit
  const listing = {
    pool: new Set([101, 102, 103, 104]),
    units: { kind: "pool", unitSize: 2 } satisfies ListingUnits,
    wants: [exact(2, kimlip)],
    payment: null,
  };

  test("several units fit with every row scaled to them", () => {
    expect(
      listingOfferRefusal(
        {
          picks: [101, 102, 103, 104],
          units: null,
          given: kimlips(4),
          payment: null,
        },
        listing,
      ),
    ).toBeNull();
    expect(
      listingOfferRefusal(
        {
          picks: [101, 102, 103, 104],
          units: null,
          given: kimlips(2),
          payment: null,
        },
        listing,
      ),
    ).toEqual({ reason: "terms_changed" });
  });

  test("picks that are no longer whole units change the terms", () => {
    expect(
      listingOfferRefusal(
        { picks: [101, 102], units: null, given: kimlips(2), payment: null },
        { ...listing, units: { kind: "pool", unitSize: 3 } },
      ),
    ).toEqual({ reason: "terms_changed" });
  });

  test("a token the indexer doesn't know is named, not read as the terms", () => {
    expect(
      listingOfferRefusal(
        {
          picks: [101, 102],
          units: null,
          given: [...kimlips(1), { kind: "missing", tokenId: 9001 }],
          payment: null,
        },
        listing,
      ),
    ).toEqual({ reason: "token_missing", tokenId: 9001 });
  });

  test("the terms are judged before the claimer's tokens", () => {
    expect(
      listingOfferRefusal(
        {
          picks: [101, 105],
          units: null,
          given: [{ kind: "missing", tokenId: 9001 }],
          payment: null,
        },
        listing,
      ),
    ).toEqual({ reason: "terms_changed" });
  });
});

describe("payment-only offers", () => {
  // a sale of two pool objekts one at a time, for a payment and no objekts
  const sale = (payment: ListingPayment) => ({
    pool: new Set([101, 102]),
    units: { kind: "pool", unitSize: 1 } satisfies ListingUnits,
    wants: [],
    payment,
  });
  const offer = (picks: number[], amount: number) => ({
    picks,
    units: null,
    given: [],
    payment: { sender: "to", amount, currency: "USD" } satisfies TradePayment,
  });

  test.each([
    ["any amount on a listing open to offers", "price_or_offer", 250, null],
    ["any amount on a listing that only takes offers", "offer_only", 250, null],
    ["the asking price at a fixed price", "price_only", 300, null],
    [
      "another amount at a fixed price",
      "price_only",
      250,
      { reason: "terms_changed" },
    ],
  ] satisfies [
    string,
    ListingPayment["mode"],
    number,
    { reason: "terms_changed" } | null,
  ][])("%s", (_, mode, amount, expected) => {
    const payment: ListingPayment =
      mode === "offer_only"
        ? { side: "to", currency: "USD", methods: ["wise"], mode, amount: null }
        : { side: "to", currency: "USD", methods: ["wise"], mode, amount: 300 };
    expect(listingOfferRefusal(offer([101], amount), sale(payment))).toEqual(
      expected,
    );
  });

  test("a fixed price is judged for every unit the offer takes", () => {
    const payment: ListingPayment = {
      side: "to",
      currency: "USD",
      methods: ["wise"],
      mode: "price_only",
      amount: 300,
    };
    expect(listingOfferRefusal(offer([101, 102], 600), sale(payment))).toBe(
      null,
    );
    expect(listingOfferRefusal(offer([101, 102], 300), sale(payment))).toEqual({
      reason: "terms_changed",
    });
  });

  test("a payment the listing no longer has, or one it gained, changes the terms", () => {
    const payment: ListingPayment = {
      side: "to",
      currency: "USD",
      methods: ["wise"],
      mode: "offer_only",
      amount: null,
    };
    expect(paymentFits(null, payment, 1)).toBe(false);
    expect(
      paymentFits({ sender: "to", amount: 250, currency: "USD" }, null, 1),
    ).toBe(false);
    expect(paymentFits(null, null, 1)).toBe(true);
  });

  test("another side or currency changes the terms", () => {
    const payment: ListingPayment = {
      side: "to",
      currency: "USD",
      methods: ["wise"],
      mode: "price_or_offer",
      amount: 300,
    };
    expect(
      paymentFits({ sender: "from", amount: 250, currency: "USD" }, payment, 1),
    ).toBe(false);
    expect(
      paymentFits({ sender: "to", amount: 250, currency: "KRW" }, payment, 1),
    ).toBe(false);
  });
});

describe("offers on a buy listing", () => {
  const kimlip = "atom01-kimlip-101z";
  const kimlips = (count: number) =>
    Array.from({ length: count }, (): OfferedToken => ({
      kind: "found",
      ...objekt("Atom01", "KimLip", "101Z"),
    }));
  // $3 for each KimLip 101Z, up to three
  const listing = {
    pool: new Set<number>(),
    units: { kind: "buy", maxUnits: 3 } satisfies ListingUnits,
    wants: [exact(1, kimlip)],
    payment: {
      side: "from",
      currency: "USD",
      methods: ["wise"],
      mode: "price_only",
      amount: 300,
    } satisfies ListingPayment,
  };
  const payment = (amount: number): TradePayment => ({
    sender: "from",
    amount,
    currency: "USD",
  });

  test("two units fit at the price for both", () => {
    expect(
      listingOfferRefusal(
        { picks: [], units: 2, given: kimlips(2), payment: payment(600) },
        listing,
      ),
    ).toBeNull();
  });

  test("a payment for another number of units changes the terms", () => {
    expect(
      listingOfferRefusal(
        { picks: [], units: 2, given: kimlips(2), payment: payment(300) },
        listing,
      ),
    ).toEqual({ reason: "terms_changed" });
  });

  test("tokens for another number of units change the terms", () => {
    expect(
      listingOfferRefusal(
        { picks: [], units: 2, given: kimlips(1), payment: payment(600) },
        listing,
      ),
    ).toEqual({ reason: "terms_changed" });
  });
});
