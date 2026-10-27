import { describe, expect, test } from "bun:test";
import type * as z from "zod";
import {
  MAX_CHOICE_OPTIONS,
  MAX_OFFERED,
  MAX_PER_ROW,
  MAX_TOTAL_WANTED,
  MAX_WANT_ROWS,
} from "../src/caps";
import {
  claimListingInputSchema,
  counterOfferInputSchema,
  editListingInputSchema,
  listingIdSchema,
  type ListingInput,
  listingInputSchema,
  offeredTokensInputSchema,
  offerInputSchema,
} from "../src/listing";
import { MAX_RANGE_VALUES, type RangeFilter } from "../src/range";

const LISTING_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const KIMLIP = "atom02-kimlip-201z";

const exact = (slug: string, count = 1) => ({
  kind: "exact" as const,
  slug,
  count,
});
const range = (filter: Record<string, string[]>, count = 1) => ({
  kind: "range" as const,
  filter,
  count,
});
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
  filter: { ...emptyFilter, ...filter },
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

/**
 * Terms every schema refuses, with the issue each produces (SCH-02..SCH-18,
 * SCH-22).
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
    "wants: Ask for at least one objekt",
  ],
  [
    "a token offered twice (SCH-04)",
    { offered: [{ tokenId: 5 }, { tokenId: 5 }], wants },
    "offered: Each objekt can only be offered once",
  ],
  [
    "the same exact slug twice (SCH-05)",
    { offered, wants: [exact(KIMLIP), exact(KIMLIP, 2)] },
    "wants: Ask for each objekt in one row and raise its count instead",
  ],
  [
    "the same exact slug in two casings (SCH-05)",
    { offered, wants: [exact(KIMLIP), exact(` ${KIMLIP.toUpperCase()} `)] },
    "wants: Ask for each objekt in one row and raise its count instead",
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
    "wants: Each range can only be asked for once",
  ],
  [
    "an exact count of 0 (SCH-07)",
    { offered, wants: [exact(KIMLIP, 0)] },
    "wants.0.count: A row needs at least one objekt",
  ],
  [
    "an exact count past the row cap (SCH-07)",
    { offered, wants: [exact(KIMLIP, MAX_PER_ROW + 1)] },
    `wants.0.count: A row can ask for at most ${MAX_PER_ROW} objekts`,
  ],
  [
    "a range count past the row cap (SCH-07)",
    { offered, wants: [range({ season: ["Atom02"] }, MAX_PER_ROW + 1)] },
    `wants.0.count: A row can ask for at most ${MAX_PER_ROW} objekts`,
  ],
  [
    "one objekt past the offer cap (SCH-08)",
    { offered: tokens(MAX_OFFERED + 1), wants },
    `offered: A listing can offer at most ${MAX_OFFERED} objekts`,
  ],
  [
    "one row past the row cap (SCH-09)",
    { offered, wants: slugs(MAX_WANT_ROWS + 1) },
    `wants: A listing can have at most ${MAX_WANT_ROWS} rows`,
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
    `wants: A listing can ask for at most ${MAX_TOTAL_WANTED} objekts in total`,
  ],
  [
    "a range with no columns (SCH-11)",
    { offered, wants: [range({})] },
    "wants.0.filter: A range needs at least one value",
  ],
  [
    "a range with only empty columns (SCH-11)",
    { offered, wants: [range(emptyFilter)] },
    "wants.0.filter: A range needs at least one value",
  ],
  [
    "a season past the column cap in one range (SCH-13)",
    {
      offered,
      wants: [
        range({
          season: Array.from(
            { length: MAX_RANGE_VALUES + 1 },
            (_, i) => `Season${i}`,
          ),
        }),
      ],
    },
    "wants.0.filter.season: *",
  ],
  [
    "a 501-character note (SCH-15)",
    { offered, wants, note: "n".repeat(501) },
    "note: A note can be at most 500 characters",
  ],
  [
    "a payment want (SCH-16)",
    { offered, wants: [{ kind: "payment", amount: "10.00", currency: "USD" }] },
    "wants.0.kind: *",
  ],
  [
    "an empty slug (SCH-17)",
    { offered, wants: [exact("")] },
    "wants.0.slug: *",
  ],
  [
    "a whitespace slug (SCH-17)",
    { offered, wants: [exact("   ")] },
    "wants.0.slug: *",
  ],
  [
    "token id 2^31 (SCH-17)",
    { offered: [{ tokenId: 2 ** 31 }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "a spoofed fromUserId (SCH-18)",
    { offered, wants, fromUserId: "someone" },
    ": *",
  ],
  [
    "a NUL byte in a range member (SCH-24)",
    { offered, wants: [range({ member: ["\u0000"] })] },
    "wants.0.filter.member.0: Text can't contain a NUL byte",
  ],
  [
    "a NUL byte in an exact slug (SCH-24)",
    { offered, wants: [exact(`${KIMLIP}\u0000`)] },
    "wants.0.slug: Text can't contain a NUL byte",
  ],
  [
    "a NUL byte in the note (SCH-24)",
    { offered, wants, note: "hi\u0000there" },
    "note: Text can't contain a NUL byte",
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
    "a fractional unit size",
    { offered: tokens(3), unitSize: 1.5, wants },
    "unitSize: *",
  ],
  [
    "a choice row of one collection",
    { offered, wants: [choice([KIMLIP])] },
    'wants.0.slugs: An "any of" row needs at least two collections',
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
    `wants.0.slugs: An "any of" row can name at most ${MAX_CHOICE_OPTIONS} collections`,
  ],
  [
    "a choice row naming a collection twice in two casings",
    { offered, wants: [choice([KIMLIP, HEEJIN, ` ${KIMLIP.toUpperCase()}`])] },
    'wants.0.slugs: Each collection can only be in an "any of" row once',
  ],
  [
    "two choice rows with the same collections in another order",
    {
      offered,
      wants: [choice([KIMLIP, HEEJIN]), choice([HEEJIN, KIMLIP], 2)],
    },
    "wants: Each set of collections can only be asked for once",
  ],
  [
    "a choice count past the row cap",
    { offered, wants: [choice([KIMLIP, HEEJIN], MAX_PER_ROW + 1)] },
    `wants.0.count: A row can ask for at most ${MAX_PER_ROW} objekts`,
  ],
  [
    "a choice row's count taking the total past its cap",
    {
      offered,
      wants: [
        exact(KIMLIP, MAX_PER_ROW),
        choice([HEEJIN, HASEUL], MAX_TOTAL_WANTED - MAX_PER_ROW + 1),
      ],
    },
    `wants: A listing can ask for at most ${MAX_TOTAL_WANTED} objekts in total`,
  ],
] as const;

/**
 * Terms every schema accepts, and what they parse to. An output without a
 * unit size has the default: every offered objekt in one unit.
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
    )[];
    note?: string | null;
  },
  output: Omit<ListingInput, "unitSize"> & { unitSize?: number },
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
    "an empty note (SCH-15)",
    { offered, wants, note: "" },
    { offered, wants, note: null },
  ],
  [
    "a whitespace note (SCH-15)",
    { offered, wants, note: "   " },
    { offered, wants, note: null },
  ],
  [
    "a padded note (SCH-15)",
    { offered, wants, note: "  x  " },
    { offered, wants, note: "x" },
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
    "a trimmed, lowercased choice row",
    { offered, wants: [choice([` ${KIMLIP.toUpperCase()}`, HEEJIN], 2)] },
    { offered, wants: [choice([KIMLIP, HEEJIN], 2)], note: null },
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
];

describe.each(termSchemas)("%s", (_, schema, extra) => {
  test.each(refused)("refuses %s", (_, input, issue) => {
    expectIssue(schema.safeParse({ ...extra, ...input }), issue);
  });

  test.each(accepted)("accepts %s", (_, input, output) => {
    expect(schema.safeParse({ ...extra, ...input })).toEqual({
      success: true,
      data: { ...extra, unitSize: input.offered.length, ...output },
    });
  });

  test.each([
    ["artist", { artist: ["artms"] }],
    ["member", { member: ["HeeJin"] }],
    ["collectionNo", { collectionNo: ["364Z"] }],
    ["season", { season: ["Atom02"] }],
    ["class", { class: ["First"] }],
    ["on_offline", { on_offline: ["online"] }],
  ] satisfies [string, Partial<RangeFilter>][])(
    "accepts a range narrowed only by %s (SCH-12)",
    (_, filter) => {
      const result = schema.safeParse({
        ...extra,
        offered,
        wants: [range(filter)],
      });
      expect(result.success && result.data.wants).toEqual([
        stored({ ...filter }),
      ]);
    },
  );

  test.each([
    [["tripleS"], ["triples"]],
    [["TRIPLES"], ["triples"]],
    [["ARTMS", "artms"], ["artms"]],
  ])("normalises the range artist %j (SCH-14)", (artist, lowercased) => {
    const result = schema.safeParse({
      ...extra,
      offered,
      wants: [range({ artist })],
    });
    expect(result.success && result.data.wants).toEqual([
      stored({ artist: lowercased }),
    ]);
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
    units: 1,
    picked: [100],
    rows: [[1], [2, 3]],
  };

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

  test("passes a far-future seen through to the guard (SCH-21)", () => {
    const future = new Date("2036-10-11T12:00:00Z");
    const result = claimListingInputSchema.safeParse({
      ...claim,
      seen: future,
    });
    expect(result.success && result.data.seen).toEqual(future);
  });

  test.each([
    ["no rows (SCH-21)", { rows: [] }, "rows: *"],
    ["an empty row (SCH-21)", { rows: [[]] }, "rows.0: *"],
    [
      "one row past the row cap (SCH-21)",
      { rows: Array.from({ length: MAX_WANT_ROWS + 1 }, (_, i) => [i + 1]) },
      "rows: *",
    ],
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
    ["fractional units", { units: 1.5 }, "units: *"],
    ["units past the offer cap", { units: MAX_OFFERED + 1 }, "units: *"],
    ["nothing picked", { picked: [] }, "picked: *"],
    [
      "picks past the offer cap",
      { picked: Array.from({ length: MAX_OFFERED + 1 }, (_, i) => 100 + i) },
      "picked: *",
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

describe.each(offerSchemas)("%s", (_, schema, target) => {
  const ids = (count: number, from = 1) =>
    Array.from({ length: count }, (_, i) => from + i);

  test.each([
    ["two a side", [1, 2], [3, 4]],
    ["one a side (UNIT-02)", [1], [2]],
    ["MAX_OFFERED a side (UNIT-02)", ids(MAX_OFFERED), ids(MAX_OFFERED, 21)],
  ])("accepts %s (UNIT-02)", (_, give, get) => {
    expect(schema.safeParse({ ...target, give, get })).toEqual({
      success: true,
      data: { ...target, give, get },
    });
  });

  test.each([
    ["an empty give", { give: [] }, "give: *"],
    ["an empty get", { get: [] }, "get: *"],
    ["no give", { give: undefined }, "give: *"],
    [
      "one past MAX_OFFERED given",
      { give: ids(MAX_OFFERED + 1, 10) },
      "give: *",
    ],
    ["one past MAX_OFFERED asked", { get: ids(MAX_OFFERED + 1, 10) }, "get: *"],
    [
      "a token given twice",
      { give: [1, 1] },
      "give: Each objekt can only be in an offer once",
    ],
    [
      "a token asked twice",
      { get: [2, 2] },
      "get: Each objekt can only be in an offer once",
    ],
    [
      "a token on both sides",
      { give: [1, 5], get: [2, 5] },
      "get: Each objekt can only be in an offer once",
    ],
  ])("refuses %s (UNIT-03, UNIT-04)", (_, override, issue) => {
    expectIssue<unknown>(
      schema.safeParse({ ...target, give: [1], get: [2], ...override }),
      issue,
    );
  });
});
