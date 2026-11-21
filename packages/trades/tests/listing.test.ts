import type {
  ListingOfferMode,
  PaymentMethod,
  TradeSide,
} from "@apollo/database/web/types";
import { describe, expect, test } from "bun:test";
import type * as z from "zod";
import {
  MAX_BUY_UNITS,
  MAX_CHOICE_OPTIONS,
  MAX_LISTING_OPTIONS,
  MAX_OFFERED,
  MAX_PER_ROW,
  MAX_TOTAL_WANTED,
  MAX_WANT_ROWS,
} from "../src/caps";
import type { ListingUnits } from "../src/lifecycle";
import {
  claimListingInputSchema,
  counterOfferInputSchema,
  editListingInputSchema,
  listingIdSchema,
  type ListingInput,
  listingInputSchema,
  type ListingOptionTerms,
  type ListingType,
  listingType,
  listingTypesOf,
  offeredTokensInputSchema,
  offerInputSchema,
} from "../src/listing";
import { MAX_NUMERIC_AMOUNT, MAX_PAYMENT_AMOUNT } from "../src/payment";
import {
  MAX_RANGE_CLAUSES,
  MAX_RANGE_VALUES,
  type RangeFilter,
} from "../src/range";

const LISTING_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const KIMLIP = "atom02-kimlip-201z";

const exact = (slug: string, count = 1) => ({
  kind: "exact" as const,
  slug,
  count,
});
const ranges = (filters: Record<string, string[]>[], count = 1) => ({
  kind: "range" as const,
  ranges: filters,
  count,
});
const range = (filter: Record<string, string[]>, count = 1) =>
  ranges([filter], count);
const choice = (slugs: string[], count = 1) => ({
  kind: "choice" as const,
  slugs,
  count,
});
const tokens = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ tokenId: i + 1 }));
const slugs = (count: number) =>
  Array.from({ length: count }, (_, i) => exact(`atom02-heejin-${100 + i}z`));

const offered = [{ tokenId: 1 }];
const pay = (amount: string) => ({ kind: "payment" as const, amount });
// the payment row of a listing that only takes offers, with no asking price
const askNothing = { kind: "payment" as const };
const usd = {
  currency: "USD",
  methods: ["paypal_ff", "wise"] satisfies PaymentMethod[],
};
const wants = [exact(KIMLIP)];
const HEEJIN = "atom02-heejin-201z";
const HASEUL = "atom02-haseul-201z";
const emptyFilter: RangeFilter = {
  artist: [],
  member: [],
  collectionNo: [],
  season: [],
  class: [],
  on_offline: [],
};

// a range row as the schemas output it, with unnarrowed columns empty
const stored = (filter: Partial<RangeFilter>, count = 1) => ({
  kind: "range" as const,
  ranges: [{ ...emptyFilter, ...filter }],
  count,
});

/**
 * Each issue as `path: message`, so tests pin both where a refusal points
 * and what it says.
 */
function issues<T>(result: z.ZodSafeParseResult<T>) {
  return result.success
    ? []
    : result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
}

/**
 * Expect a refusal with the given `path: message` issue. A trailing `*`
 * matches any message at exactly that path.
 */
function expectIssue<T>(result: z.ZodSafeParseResult<T>, issue: string) {
  expect(result.success).toBe(false);
  const found = issues(result);
  if (issue.endsWith("*")) {
    expect(
      found.map((each) => each.slice(0, each.indexOf(": ") + 2)),
    ).toContain(issue.slice(0, -1));
  } else {
    expect(found).toContain(issue);
  }
}

/**
 * Both listing schemas take the same terms; edit adds the listing's id.
 */
const termSchemas = [
  ["listingInputSchema", listingInputSchema, {}],
  ["editListingInputSchema", editListingInputSchema, { listingId: LISTING_ID }],
] as const;

// each schema wraps its own fields in the listing rules
test.each(termSchemas)(
  "%s refuses a token offered twice (SCH-04)",
  (_, schema, extra) => {
    expectIssue(
      schema.safeParse({
        ...extra,
        offered: [{ tokenId: 5 }, { tokenId: 5 }],
        options: [wants],
      }),
      "offered: Each objekt can only be offered once",
    );
  },
);

/**
 * Terms the listing schema refuses, with the issue each produces.
 */
const refused = [
  [
    "no offered objekts (SCH-02)",
    { offered: [], wants },
    "offered: Offer at least one objekt",
  ],
  [
    "no wants (SCH-03)",
    { offered, wants: [] },
    "options.0: Ask for at least one objekt or a payment",
  ],
  [
    "the same exact slug in two casings (SCH-05)",
    { offered, wants: [exact(KIMLIP), exact(` ${KIMLIP.toUpperCase()} `)] },
    "options.0: Ask for each objekt in one row and raise its count instead",
  ],
  [
    "ranges equal once deduped, lowercased and unordered (SCH-06)",
    {
      offered,
      wants: [
        range({ artist: ["ARTMS"], season: ["Atom02", "Binary01"] }),
        range({
          artist: ["artms", "Artms"],
          season: ["Binary01", "Atom02", "Atom02"],
        }),
      ],
    },
    "options.0: Each range can only be asked for once",
  ],
  [
    "an exact count of 0 (SCH-07)",
    { offered, wants: [exact(KIMLIP, 0)] },
    "options.0.0.count: A row needs at least one objekt",
  ],
  [
    "an exact count past the row cap (SCH-07)",
    { offered, wants: [exact(KIMLIP, MAX_PER_ROW + 1)] },
    `options.0.0.count: A row can ask for at most ${MAX_PER_ROW} objekts`,
  ],
  [
    "one objekt past the offer cap (SCH-08)",
    { offered: tokens(MAX_OFFERED + 1), wants },
    `offered: A listing can offer at most ${MAX_OFFERED} objekts`,
  ],
  [
    "one row past the row cap (SCH-09)",
    { offered, wants: slugs(MAX_WANT_ROWS + 1) },
    `options.0: An option can have at most ${MAX_WANT_ROWS} rows`,
  ],
  [
    "one objekt past the total cap (SCH-10)",
    {
      offered,
      wants: [
        exact(KIMLIP, MAX_PER_ROW),
        exact("atom02-heejin-201z", MAX_TOTAL_WANTED - MAX_PER_ROW + 1),
      ],
    },
    `options.0: An option can ask for at most ${MAX_TOTAL_WANTED} objekts in total`,
  ],
  [
    "a 501-character note (SCH-15)",
    { offered, wants, note: "n".repeat(501) },
    "note: A note can be at most 500 characters",
  ],
  [
    "a payment row carrying its own currency (SCH-16)",
    {
      offered,
      wants: [{ kind: "payment", amount: "10.00", currency: "USD" }],
      payment: usd,
    },
    "options.0.0: *",
  ],
  [
    "a payment of 0",
    { offered, wants: [pay("0.00")], payment: usd },
    "options.0.0.amount: An amount must be more than 0",
  ],
  [
    "a negative payment",
    { offered, wants: [pay("-3.00")], payment: usd },
    "options.0.0.amount: *",
  ],
  [
    "a payment with three decimals",
    { offered, wants: [pay("3.001")], payment: usd },
    "options.0.0.amount: *",
  ],
  [
    "a payment past MAX_PAYMENT_AMOUNT, which a claim's units could push past numeric(14,2)",
    { offered, wants: [pay("100000000.00")], payment: usd },
    "options.0.0.amount: An amount can be at most 99999999.99",
  ],
  [
    "a payment in exponent notation",
    { offered, wants: [pay("1e3")], payment: usd },
    "options.0.0.amount: *",
  ],
  [
    "a payment with no methods",
    { offered, wants: [pay("3")], payment: { currency: "USD", methods: [] } },
    "payment.methods: Pick at least one payment method",
  ],
  [
    "a payment method outside the list",
    {
      offered,
      wants: [pay("3")],
      payment: { currency: "USD", methods: ["crypto"] },
    },
    "payment.methods.0: *",
  ],
  [
    "a payment method picked twice",
    {
      offered,
      wants: [pay("3")],
      payment: { currency: "USD", methods: ["wise", "wise"] },
    },
    "payment.methods: Each payment method can only be picked once",
  ],
  [
    "a lowercase currency",
    {
      offered,
      wants: [pay("3")],
      payment: { currency: "usd", methods: ["wise"] },
    },
    "payment.currency: Pick a currency",
  ],
  [
    "a payment without its currency and methods",
    { offered, wants: [pay("3")] },
    "payment: Pick a currency and the payment methods you accept",
  ],
  [
    "payment methods without a payment",
    { offered, wants, payment: usd },
    "payment: Only a listing with a payment takes payment methods",
  ],
  [
    "two payment rows",
    { offered, wants: [pay("3"), pay("4")], payment: usd },
    "options.0: An option can ask for one payment",
  ],
  [
    "a payment on both sides",
    { offered, wants: [pay("3")], offeredPayment: "2", payment: usd },
    "offeredPayment: A payment can only be on one side",
  ],
  [
    "an asking price on a listing that only takes offers",
    { offered, wants: [pay("3")], payment: { ...usd, mode: "offer_only" } },
    "options.0: A listing that only takes offers has no asking price",
  ],
  [
    "no asking price at a fixed price",
    { offered, wants: [askNothing], payment: usd },
    "options.0: Enter an amount",
  ],
  [
    "no asking price on a listing open to offers",
    {
      offered,
      wants: [askNothing],
      payment: { ...usd, mode: "price_or_offer" },
    },
    "options.0: Enter an amount",
  ],
  [
    "the poster's payment open to offers",
    {
      offered,
      wants,
      offeredPayment: "2",
      payment: { ...usd, mode: "price_or_offer" },
    },
    "payment.mode: A payment you add on top has a fixed price",
  ],
  [
    "an offer mode outside the list",
    { offered, wants: [pay("3")], payment: { ...usd, mode: "auction" } },
    "payment.mode: *",
  ],
  [
    "a whitespace slug (SCH-17)",
    { offered, wants: [exact("   ")] },
    "options.0.0.slug: *",
  ],
  [
    "token id 2^31 (SCH-17)",
    { offered: [{ tokenId: 2 ** 31 }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "a range row with no ranges",
    { offered, wants: [ranges([])] },
    "options.0.0.ranges: A range row needs at least one range",
  ],
  [
    "a range row past the range cap",
    {
      offered,
      wants: [
        ranges(
          Array.from({ length: MAX_RANGE_CLAUSES + 1 }, (_, i) => ({
            season: [`S${i}`],
          })),
        ),
      ],
    },
    `options.0.0.ranges: A range row can hold at most ${MAX_RANGE_CLAUSES} ranges`,
  ],
  [
    "the same range twice in one row, once deduped and unordered",
    {
      offered,
      wants: [
        ranges([
          { artist: ["ARTMS"], season: ["Atom02", "Binary01"] },
          { season: ["Binary01", "Atom02"], artist: ["artms"] },
        ]),
      ],
    },
    "options.0.0.ranges: Each range can only be in a row once",
  ],
  [
    "two rows with the same ranges in another order",
    {
      offered,
      wants: [
        ranges([{ season: ["Atom02"] }, { class: ["First"] }]),
        ranges([{ class: ["First"] }, { season: ["Atom02"] }]),
      ],
    },
    "options.0: Each range can only be asked for once",
  ],
  [
    "a NUL byte in an exact slug (SCH-24)",
    { offered, wants: [exact(`${KIMLIP}\u0000`)] },
    "options.0.0.slug: Text can't contain a NUL byte",
  ],
  [
    "a unit size of 0",
    { offered, unitSize: 0, wants },
    "unitSize: Each trade needs at least one of the offered objekts",
  ],
  [
    "a unit bigger than the pool",
    { offered: tokens(3), unitSize: 4, wants },
    "unitSize: A trade can't take more objekts than the listing offers",
  ],
  [
    "a choice row of one collection",
    { offered, wants: [choice([KIMLIP])] },
    'options.0.0.slugs: An "any of" row needs at least two collections',
  ],
  [
    "a choice row past the option cap",
    {
      offered,
      wants: [
        choice(
          Array.from(
            { length: MAX_CHOICE_OPTIONS + 1 },
            (_, i) => `atom02-heejin-${100 + i}z`,
          ),
        ),
      ],
    },
    `options.0.0.slugs: An "any of" row can name at most ${MAX_CHOICE_OPTIONS} collections`,
  ],
  [
    "a choice row naming a collection twice in two casings",
    { offered, wants: [choice([KIMLIP, HEEJIN, ` ${KIMLIP.toUpperCase()}`])] },
    'options.0.0.slugs: Each collection can only be in an "any of" row once',
  ],
  [
    "two choice rows with the same collections in another order",
    {
      offered,
      wants: [choice([KIMLIP, HEEJIN]), choice([HEEJIN, KIMLIP], 2)],
    },
    "options.0: Each set of collections can only be asked for once",
  ],
] as const;

/**
 * Terms the listing schema accepts, and what they parse to. An output
 * without a unit size has the default: every offered objekt in one unit.
 */
const accepted: [
  name: string,
  input: {
    offered: { tokenId: number }[];
    unitSize?: number;
    wants: (
      | ReturnType<typeof exact>
      | ReturnType<typeof range>
      | ReturnType<typeof choice>
      | ReturnType<typeof pay>
      | typeof askNothing
    )[];
    offeredPayment?: string;
    payment?: {
      currency: string;
      methods: PaymentMethod[];
      mode?: ListingOfferMode;
    };
    note?: string | null;
  },
  output: Omit<ListingInput, "units" | "payment" | "options"> & {
    unitSize?: number;
  } & Pick<ListingOptionTerms, "wants"> &
    Partial<Pick<ListingOptionTerms, "payment">>,
][] = [
  [
    "the minimal listing (SCH-01)",
    { offered, wants },
    { offered, wants, note: null },
  ],
  [
    "row counts of 1 and the row cap (SCH-07)",
    {
      offered,
      wants: [exact(KIMLIP, 1), range({ season: ["Atom02"] }, MAX_PER_ROW)],
    },
    {
      offered,
      wants: [exact(KIMLIP, 1), stored({ season: ["Atom02"] }, MAX_PER_ROW)],
      note: null,
    },
  ],
  [
    "the offer cap (SCH-08)",
    { offered: tokens(MAX_OFFERED), wants },
    { offered: tokens(MAX_OFFERED), wants, note: null },
  ],
  [
    "the row cap (SCH-09)",
    { offered, wants: slugs(MAX_WANT_ROWS) },
    { offered, wants: slugs(MAX_WANT_ROWS), note: null },
  ],
  [
    "the total cap (SCH-10)",
    {
      offered,
      wants: [
        exact(KIMLIP, MAX_PER_ROW),
        exact("atom02-heejin-201z", MAX_TOTAL_WANTED - MAX_PER_ROW),
      ],
    },
    {
      offered,
      wants: [
        exact(KIMLIP, MAX_PER_ROW),
        exact("atom02-heejin-201z", MAX_TOTAL_WANTED - MAX_PER_ROW),
      ],
      note: null,
    },
  ],
  [
    "a trimmed, lowercased exact slug",
    { offered, wants: [exact("  ATOM02-KimLip-201Z ")] },
    { offered, wants: [exact(KIMLIP)], note: null },
  ],
  [
    "a full column of seasons in one range (SCH-13)",
    {
      offered,
      wants: [
        range({
          season: Array.from({ length: MAX_RANGE_VALUES }, (_, i) => `S${i}`),
        }),
      ],
    },
    {
      offered,
      wants: [
        stored({
          season: Array.from({ length: MAX_RANGE_VALUES }, (_, i) => `S${i}`),
        }),
      ],
      note: null,
    },
  ],
  [
    "ranges that differ in one column",
    {
      offered,
      wants: [
        range({ season: ["Atom02"] }),
        range({ season: ["Atom02"], class: ["First"] }),
      ],
    },
    {
      offered,
      wants: [
        stored({ season: ["Atom02"] }),
        stored({ season: ["Atom02"], class: ["First"] }),
      ],
      note: null,
    },
  ],
  [
    "rows whose sets of ranges overlap",
    {
      offered,
      wants: [
        ranges([{ season: ["Atom02"] }, { class: ["First"] }]),
        ranges([{ season: ["Atom02"] }]),
      ],
    },
    {
      offered,
      wants: [
        {
          kind: "range",
          ranges: [
            { ...emptyFilter, season: ["Atom02"] },
            { ...emptyFilter, class: ["First"] },
          ],
          count: 1,
        },
        stored({ season: ["Atom02"] }),
      ],
      note: null,
    },
  ],
  [
    "a whitespace note (SCH-15)",
    { offered, wants, note: "   " },
    { offered, wants, note: null },
  ],
  [
    "a 500-character note with padding (SCH-15)",
    { offered, wants, note: ` ${"n".repeat(500)} ` },
    { offered, wants, note: "n".repeat(500) },
  ],
  [
    "a unit of one from a pool of three",
    { offered: tokens(3), unitSize: 1, wants },
    { offered: tokens(3), unitSize: 1, wants, note: null },
  ],
  [
    "a unit of the whole pool",
    { offered: tokens(3), unitSize: 3, wants },
    { offered: tokens(3), unitSize: 3, wants, note: null },
  ],
  [
    "the option cap in one choice row",
    {
      offered,
      wants: [
        choice(
          Array.from(
            { length: MAX_CHOICE_OPTIONS },
            (_, i) => `atom02-heejin-${100 + i}z`,
          ),
        ),
      ],
    },
    {
      offered,
      wants: [
        choice(
          Array.from(
            { length: MAX_CHOICE_OPTIONS },
            (_, i) => `atom02-heejin-${100 + i}z`,
          ),
        ),
      ],
      note: null,
    },
  ],
  [
    "choice rows that overlap, beside an exact row of a shared collection",
    {
      offered,
      wants: [
        exact(KIMLIP),
        choice([KIMLIP, HEEJIN]),
        choice([KIMLIP, HEEJIN, HASEUL]),
      ],
    },
    {
      offered,
      wants: [
        exact(KIMLIP),
        choice([KIMLIP, HEEJIN]),
        choice([KIMLIP, HEEJIN, HASEUL]),
      ],
      note: null,
    },
  ],
  [
    "a sale: a payment row alone (SCH-16)",
    { offered: tokens(3), unitSize: 1, wants: [pay(" 3 ")], payment: usd },
    {
      offered: tokens(3),
      unitSize: 1,
      wants: [],
      payment: { side: "to", mode: "price_only", amount: 300, ...usd },
      note: null,
    },
  ],
  [
    "a sale open to offers",
    {
      offered: tokens(3),
      unitSize: 1,
      wants: [pay("3")],
      payment: { ...usd, mode: "price_or_offer" },
    },
    {
      offered: tokens(3),
      unitSize: 1,
      wants: [],
      payment: { side: "to", mode: "price_or_offer", amount: 300, ...usd },
      note: null,
    },
  ],
  [
    "a sale that only takes offers, with no asking price",
    {
      offered: tokens(3),
      unitSize: 1,
      wants: [askNothing],
      payment: { ...usd, mode: "offer_only" },
    },
    {
      offered: tokens(3),
      unitSize: 1,
      wants: [],
      payment: { side: "to", mode: "offer_only", amount: null, ...usd },
      note: null,
    },
  ],
  [
    "objekt rows beside a payment that only takes offers",
    {
      offered,
      wants: [exact(KIMLIP), askNothing],
      payment: { ...usd, mode: "offer_only" },
    },
    {
      offered,
      wants: [exact(KIMLIP)],
      payment: { side: "to", mode: "offer_only", amount: null, ...usd },
      note: null,
    },
  ],
  [
    "a payment row beside objekt rows, at MAX_PAYMENT_AMOUNT",
    { offered, wants: [exact(KIMLIP), pay("99999999.99")], payment: usd },
    {
      offered,
      wants: [exact(KIMLIP)],
      payment: {
        side: "to",
        mode: "price_only",
        amount: MAX_PAYMENT_AMOUNT,
        ...usd,
      },
      note: null,
    },
  ],
  [
    "the poster's payment on top of their objekts, with Other",
    {
      offered,
      wants,
      offeredPayment: "2.5",
      payment: { currency: "KRW", methods: ["other"] },
    },
    {
      offered,
      wants,
      payment: {
        side: "from",
        mode: "price_only",
        amount: 250,
        currency: "KRW",
        methods: ["other"],
      },
      note: null,
    },
  ],
];

/**
 * A one-option listing's input, from the tables' single list of rows.
 */
function oneOption<TInput extends { wants: readonly unknown[] }>({
  wants: rows,
  ...rest
}: TInput) {
  return { ...rest, options: [rows] };
}

/**
 * What a one-option listing parses to: its one option, and the payment's
 * shared terms without the option's price.
 */
function parsedOne(
  {
    wants: rows,
    payment = null,
    unitSize,
    ...rest
  }: (typeof accepted)[number][2],
  offeredCount: number,
) {
  return {
    units: {
      kind: "pool",
      unitSize: unitSize ?? offeredCount,
    } satisfies ListingUnits,
    ...rest,
    options: [{ wants: rows, payment }],
    payment:
      payment === null
        ? null
        : {
            side: payment.side,
            currency: payment.currency,
            methods: payment.methods,
            mode: payment.mode,
          },
  };
}

describe("listingInputSchema", () => {
  test.each(refused)("refuses %s", (_, input, issue) => {
    expectIssue(listingInputSchema.safeParse(oneOption(input)), issue);
  });

  test.each(accepted)("accepts %s", (_, input, output) => {
    expect(listingInputSchema.safeParse(oneOption(input))).toEqual({
      success: true,
      data: parsedOne(output, input.offered.length),
    });
  });
});

describe("listingInputSchema options", () => {
  const special = range({ class: ["Special"] });

  test.each([
    ["no options", [], "options: Ask for at least one objekt or a payment"],
    [
      "one option past MAX_LISTING_OPTIONS",
      slugs(MAX_LISTING_OPTIONS + 1).map((want) => [want]),
      `options: A listing can have at most ${MAX_LISTING_OPTIONS} options`,
    ],
    [
      "an empty option beside a full one",
      [wants, []],
      "options.1: Ask for at least one objekt or a payment",
    ],
    [
      "two payment rows in one option",
      [wants, [pay("3"), pay("4")]],
      "options.1: An option can ask for one payment",
    ],
    [
      "the same option twice, its rows in another order",
      [
        [exact(KIMLIP), pay("3")],
        [pay("3.00"), exact(KIMLIP)],
      ],
      "options.1: Each option must ask for something different",
    ],
    [
      "an option without an asking price on a fixed-price listing",
      [[pay("3")], [exact(KIMLIP), askNothing]],
      "options.1: Enter an amount",
    ],
  ] satisfies [string, unknown[][], string][])(
    "refuses %s",
    (_, options, issue) => {
      expectIssue(
        listingInputSchema.safeParse({ offered, options, payment: usd }),
        issue,
      );
    },
  );

  test("refuses a claimer's payment in any option beside the poster's", () => {
    expectIssue(
      listingInputSchema.safeParse({
        offered,
        options: [wants, [pay("3")]],
        offeredPayment: "2",
        payment: usd,
      }),
      "offeredPayment: A payment can only be on one side",
    );
  });

  test("prices each option's payment on its own, under one set of terms", () => {
    expect(
      listingInputSchema.parse({
        offered: tokens(2),
        unitSize: 1,
        options: [[special], [pay("3")], [exact(KIMLIP), pay("1")]],
        payment: { ...usd, mode: "price_or_offer" },
      }),
    ).toEqual({
      offered: tokens(2),
      units: { kind: "pool", unitSize: 1 },
      note: null,
      payment: { side: "to", mode: "price_or_offer", ...usd },
      options: [
        { wants: [stored({ class: ["Special"] })], payment: null },
        {
          wants: [],
          payment: { side: "to", mode: "price_or_offer", amount: 300, ...usd },
        },
        {
          wants: [exact(KIMLIP)],
          payment: { side: "to", mode: "price_or_offer", amount: 100, ...usd },
        },
      ],
    });
  });

  test("gives every option of an offer-only listing no asking price", () => {
    expect(
      listingInputSchema
        .parse({
          offered,
          options: [[askNothing], [exact(KIMLIP), askNothing]],
          payment: { ...usd, mode: "offer_only" },
        })
        .options.map((option) => option.payment?.amount),
    ).toEqual([null, null]);
  });

  test("prices every option with the poster's payment on top", () => {
    const parsed = listingInputSchema.parse({
      offered,
      options: [wants, [special]],
      offeredPayment: "2",
      payment: usd,
    });
    expect(parsed.payment?.side).toBe("from");
    expect(parsed.options.map((option) => option.payment)).toEqual([
      { side: "from", mode: "price_only", amount: 200, ...usd },
      { side: "from", mode: "price_only", amount: 200, ...usd },
    ]);
  });

  test("holds each option to the row and total caps on its own", () => {
    const half = Array.from(
      { length: MAX_TOTAL_WANTED / MAX_PER_ROW },
      (_, i) => exact(`atom02-heejin-${100 + i}z`, MAX_PER_ROW),
    );
    expect(
      listingInputSchema.safeParse({
        offered,
        options: [slugs(MAX_WANT_ROWS), half.slice(0, 1)],
      }).success,
    ).toBe(true);
  });
});

describe("buy listings", () => {
  const anyOf = choice(["atom02-kimlip-107z", "atom02-kimlip-108z"]);
  // $3 each for any of two collections, up to three
  const buy = {
    offered: [],
    maxUnits: 3,
    options: [[anyOf]],
    offeredPayment: "3",
    payment: usd,
  };

  test("parses into the poster's payment for up to its most units", () => {
    expect(listingInputSchema.parse(buy)).toEqual({
      offered: [],
      units: { kind: "buy", maxUnits: 3 },
      note: null,
      payment: { side: "from", mode: "price_only", ...usd },
      options: [
        {
          wants: [anyOf],
          payment: { side: "from", mode: "price_only", amount: 300, ...usd },
        },
      ],
    });
  });

  test("takes several options, each asking for objekts", () => {
    expect(
      listingInputSchema.safeParse({
        ...buy,
        options: [[anyOf], [exact(KIMLIP, 2)]],
      }).success,
    ).toBe(true);
  });

  test.each([
    [
      "no most units",
      { maxUnits: undefined },
      "offered: Offer at least one objekt",
    ],
    ["most units of 0", { maxUnits: 0 }, "maxUnits: Buy at least one"],
    ["negative most units", { maxUnits: -1 }, "maxUnits: Buy at least one"],
    ["fractional most units", { maxUnits: 1.5 }, "maxUnits: *"],
    ["most units as text", { maxUnits: "3" }, "maxUnits: *"],
    [
      "most units past MAX_BUY_UNITS",
      { maxUnits: MAX_BUY_UNITS + 1 },
      `maxUnits: A listing can buy at most ${MAX_BUY_UNITS}`,
    ],
    [
      "a pool beside most units",
      { offered },
      "maxUnits: A listing that buys offers no objekts",
    ],
    [
      "a unit size beside most units",
      { unitSize: 1 },
      "maxUnits: A listing that buys offers no objekts",
    ],
    [
      "no payment",
      { offeredPayment: undefined, payment: undefined },
      "offeredPayment: Add the payment you send for each unit",
    ],
    [
      "the claimer's payment in place of the poster's",
      { offeredPayment: undefined, options: [[anyOf, pay("3")]] },
      "offeredPayment: Add the payment you send for each unit",
    ],
    [
      "a payment on both sides",
      { options: [[anyOf, pay("3")]] },
      "offeredPayment: A payment can only be on one side",
    ],
    [
      "an option of nothing but a payment",
      { options: [[anyOf], [pay("3")]] },
      "offeredPayment: A payment can only be on one side",
    ],
    [
      "a price open to offers",
      { payment: { ...usd, mode: "price_or_offer" } },
      "payment.mode: A payment you add on top has a fixed price",
    ],
    [
      "no asking price",
      { offeredPayment: undefined, payment: { ...usd, mode: "offer_only" } },
      "payment: Only a listing with a payment takes payment methods",
    ],
  ])("refuses %s", (_, override, issue) => {
    expectIssue(listingInputSchema.safeParse({ ...buy, ...override }), issue);
  });

  test("refuses an option with no wants", () => {
    expectIssue(
      listingInputSchema.safeParse({ ...buy, options: [[]] }),
      "options.0: Ask for at least one objekt or a payment",
    );
  });

  test("bounds every unit's payment together to numeric(14,2)", () => {
    expect(MAX_PAYMENT_AMOUNT * MAX_BUY_UNITS).toBeLessThanOrEqual(
      MAX_NUMERIC_AMOUNT,
    );
    expect(
      listingInputSchema.safeParse({
        ...buy,
        maxUnits: MAX_BUY_UNITS,
        offeredPayment: toNumericText(MAX_PAYMENT_AMOUNT),
      }).success,
    ).toBe(true);
  });
});

// minor units as an amount is typed, "99999999.99"
function toNumericText(amount: number) {
  return `${Math.trunc(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

describe("listingTypesOf", () => {
  test.each([
    ["one objekt option", null, [1], ["trade"]],
    ["one payment-only option", "to", [0], ["sell"]],
    ["objekts or a payment alone", "to", [1, 0], ["trade", "sell"]],
    [
      "a payment alone or objekts, in that order",
      "to",
      [0, 2],
      ["trade", "sell"],
    ],
    ["two payment-only options", "to", [0, 0], ["sell"]],
    ["the poster's payment on top of either option", "from", [1, 2], ["trade"]],
  ] satisfies [string, TradeSide | null, number[], ListingType[]][])(
    "%s",
    (_, paymentSide, objektWants, expected) => {
      expect(
        listingTypesOf({
          paymentSide,
          units: "pool",
          options: objektWants.map((count) => ({ objektWants: count })),
        }),
      ).toEqual(expected);
    },
  );

  test("a buy listing is a buy whichever option is given", () => {
    expect(
      listingTypesOf({
        units: "buy",
        paymentSide: "from",
        options: [{ objektWants: 1 }, { objektWants: 2 }],
      }),
    ).toEqual(["buy"]);
  });
});

describe("listingType", () => {
  test.each([
    ["no payment", "pool", null, 1, "trade"],
    ["a payment row alone", "pool", "to", 0, "sell"],
    ["a payment row beside objekt rows", "pool", "to", 1, "trade"],
    ["the poster's payment on top of objekts", "pool", "from", 1, "trade"],
    ["a buy listing's payment for objekts", "buy", "from", 1, "buy"],
  ] satisfies [
    string,
    ListingUnits["kind"],
    TradeSide | null,
    number,
    ListingType,
  ][])("%s is a %s", (_, units, paymentSide, objektWants, expected) => {
    expect(listingType({ units, paymentSide, objektWants })).toBe(expected);
  });

  test("a pool listing paying on top whose picks are all on their way stays a trade", () => {
    // its one pick was sent in a live trade, so the feed reads no pool objekts
    expect(
      listingTypesOf({
        units: "pool",
        paymentSide: "from",
        options: [{ objektWants: 1 }],
      }),
    ).toEqual(["trade"]);
  });
});

describe("listingIdSchema (SCH-23)", () => {
  test("lowercases an uppercase uuid, so both forms name one listing", () => {
    expect(listingIdSchema.parse(LISTING_ID.toUpperCase())).toBe(LISTING_ID);
  });
});

describe("claimListingInputSchema", () => {
  const seen = new Date("2026-10-11T12:00:00.123Z");
  const claim = {
    listingId: LISTING_ID,
    seen,
    option: 0,
    units: 1,
    picked: [100],
    rows: [[1], [2, 3]],
  };

  test("accepts a sale's claim, which gives no objekts", () => {
    expect(
      claimListingInputSchema.safeParse({ ...claim, rows: [] }).success,
    ).toBe(true);
  });

  test("takes an offered amount per unit in minor units", () => {
    expect(
      claimListingInputSchema.safeParse({ ...claim, rows: [], amount: "2.5" }),
    ).toMatchObject({ success: true, data: { amount: 250 } });
  });

  test.each([
    ["an offered amount of 0", "0"],
    ["a negative offered amount", "-2.50"],
    ["an offered amount with three decimals", "2.501"],
    ["an offered amount past MAX_PAYMENT_AMOUNT", "100000000.00"],
    ["an offered amount in exponent notation", "1e3"],
  ])("refuses %s", (_, amount) => {
    expectIssue(
      claimListingInputSchema.safeParse({ ...claim, rows: [], amount }),
      "amount: *",
    );
  });

  test("bounds a payment's total to numeric(14,2)", () => {
    expect(MAX_PAYMENT_AMOUNT * MAX_TOTAL_WANTED).toBeLessThanOrEqual(
      MAX_NUMERIC_AMOUNT,
    );
  });

  test("accepts a buy listing's claim, which picks nothing from a pool", () => {
    expect(
      claimListingInputSchema.safeParse({ ...claim, picked: [] }).success,
    ).toBe(true);
  });

  test("accepts the row and total caps", () => {
    const full = Array.from({ length: MAX_PER_ROW }, (_, i) => i + 1);
    const rest = Array.from(
      { length: MAX_TOTAL_WANTED - MAX_PER_ROW },
      (_, i) => MAX_PER_ROW + i + 1,
    );
    expect(
      claimListingInputSchema.safeParse({ ...claim, rows: [full, rest] })
        .success,
    ).toBe(true);
    expect(
      claimListingInputSchema.safeParse({
        ...claim,
        rows: Array.from({ length: MAX_WANT_ROWS }, (_, i) => [i + 1]),
      }).success,
    ).toBe(true);
  });

  test.each([
    [
      "one token past a row's cap (SCH-21)",
      { rows: [Array.from({ length: MAX_PER_ROW + 1 }, (_, i) => i + 1)] },
      "rows.0: *",
    ],
    [
      "one token past the total cap (SCH-21)",
      {
        rows: [
          Array.from({ length: MAX_PER_ROW }, (_, i) => i + 1),
          Array.from(
            { length: MAX_TOTAL_WANTED - MAX_PER_ROW + 1 },
            (_, i) => MAX_PER_ROW + i + 1,
          ),
        ],
      },
      `rows: A claim can give at most ${MAX_TOTAL_WANTED} objekts`,
    ],
    ["no units", { units: 0 }, "units: *"],
    ["a negative option", { option: -1 }, "option: *"],
    [
      "an option past MAX_LISTING_OPTIONS",
      { option: MAX_LISTING_OPTIONS },
      "option: *",
    ],
    ["a fractional option", { option: 0.5 }, "option: *"],
    ["an option as text", { option: "1" }, "option: *"],
    ["no option", { option: undefined }, "option: *"],
    /**
     * The unit cap is what keeps a payment's total inside numeric(14,2):
     * MAX_PAYMENT_AMOUNT × MAX_TOTAL_WANTED fits, so one more unit is
     * refused.
     */
    [
      "one unit past MAX_TOTAL_WANTED",
      { units: MAX_TOTAL_WANTED + 1 },
      "units: *",
    ],
    [
      "an objekt picked twice",
      { picked: [100, 101, 100] },
      "picked: Each objekt can only be picked once",
    ],
  ])("refuses %s", (_, override, issue) => {
    expectIssue(
      claimListingInputSchema.safeParse({ ...claim, ...override }),
      issue,
    );
  });
});

describe("offeredTokensInputSchema", () => {
  test("takes one to MAX_OFFERED token ids", () => {
    const ids = Array.from({ length: MAX_OFFERED }, (_, i) => i + 1);
    expect(offeredTokensInputSchema.parse({ tokenIds: ids })).toEqual({
      tokenIds: ids,
    });
    expect(offeredTokensInputSchema.safeParse({ tokenIds: [] }).success).toBe(
      false,
    );
    expect(
      offeredTokensInputSchema.safeParse({ tokenIds: [...ids, ids.length + 1] })
        .success,
    ).toBe(false);
  });
});

/**
 * Offers and counters take the same two sides; an offer names its recipient
 * and a counter the trade it answers.
 */
const offerSchemas = [
  ["offerInputSchema", offerInputSchema, { toUserId: "user-b" }],
  ["counterOfferInputSchema", counterOfferInputSchema, { tradeId: LISTING_ID }],
] as const;

// each schema wraps its own sides in the offer rules
test.each(offerSchemas)(
  "%s refuses a token on both sides (UNIT-03, UNIT-04)",
  (_, schema, target) => {
    expectIssue<unknown>(
      schema.safeParse({ ...target, give: [1, 5], get: [2, 5] }),
      "get: Each objekt can only be in an offer once",
    );
  },
);

describe("offerInputSchema", () => {
  const target = { toUserId: "user-b" };
  const ids = (count: number, from = 1) =>
    Array.from({ length: count }, (_, i) => from + i);

  test.each([
    ["one a side (UNIT-02)", [1], [2]],
    ["MAX_OFFERED a side (UNIT-02)", ids(MAX_OFFERED), ids(MAX_OFFERED, 21)],
  ])("accepts %s (UNIT-02)", (_, give, get) => {
    expect(offerInputSchema.safeParse({ ...target, give, get })).toEqual({
      success: true,
      data: { ...target, give, get },
    });
  });

  test.each([
    ["an empty give", { give: [] }, "give: *"],
    [
      "one past MAX_OFFERED given",
      { give: ids(MAX_OFFERED + 1, 10) },
      "give: *",
    ],
    [
      "a token given twice",
      { give: [1, 1] },
      "give: Each objekt can only be in an offer once",
    ],
  ])("refuses %s (UNIT-03, UNIT-04)", (_, override, issue) => {
    expectIssue<unknown>(
      offerInputSchema.safeParse({ ...target, get: [2], ...override }),
      issue,
    );
  });
});
