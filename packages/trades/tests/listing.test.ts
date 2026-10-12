import { describe, expect, expectTypeOf, test } from "bun:test";
import type * as z from "zod";
import type { TradeWant } from "../src/allocate";
import {
  MAX_OFFERED,
  MAX_PER_ROW,
  MAX_TOTAL_WANTED,
  MAX_WANT_ROWS,
} from "../src/caps";
import {
  type ClaimListingInput,
  type EditListingInput,
  type ListingInput,
  claimListingInputSchema,
  editListingInputSchema,
  listingIdInputSchema,
  listingIdSchema,
  listingInputSchema,
  listingTypes,
  offeredTokensInputSchema,
} from "../src/listing";
import type { RangeFilter } from "../src/range";

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
const tokens = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ tokenId: i + 1 }));
const slugs = (count: number) =>
  Array.from({ length: count }, (_, i) => exact(`atom02-heejin-${100 + i}z`));

const offered = [{ tokenId: 1 }];
const wants = [exact(KIMLIP)];
const emptyFilter: RangeFilter = {
  artist: [],
  member: [],
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
    "equal ranges (SCH-06)",
    {
      offered,
      wants: [
        range({ season: ["Atom02"], class: ["First"] }),
        range({ season: ["Atom02"], class: ["First"] }, 3),
      ],
    },
    "wants: Each range can only be asked for once",
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
    "an exact count of -1 (SCH-07)",
    { offered, wants: [exact(KIMLIP, -1)] },
    "wants.0.count: A row needs at least one objekt",
  ],
  [
    "an exact count of 1.5 (SCH-07)",
    { offered, wants: [exact(KIMLIP, 1.5)] },
    "wants.0.count: *",
  ],
  [
    "an exact count past the row cap (SCH-07)",
    { offered, wants: [exact(KIMLIP, MAX_PER_ROW + 1)] },
    `wants.0.count: A row can ask for at most ${MAX_PER_ROW} objekts`,
  ],
  [
    "a range count of 0 (SCH-07)",
    { offered, wants: [range({ season: ["Atom02"] }, 0)] },
    "wants.0.count: A row needs at least one objekt",
  ],
  [
    "a range count of -1 (SCH-07)",
    { offered, wants: [range({ season: ["Atom02"] }, -1)] },
    "wants.0.count: A row needs at least one objekt",
  ],
  [
    "a range count of 1.5 (SCH-07)",
    { offered, wants: [range({ season: ["Atom02"] }, 1.5)] },
    "wants.0.count: *",
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
    "13 seasons in one range (SCH-13)",
    {
      offered,
      wants: [
        range({ season: Array.from({ length: 13 }, (_, i) => `Season${i}`) }),
      ],
    },
    "wants.0.filter.season: *",
  ],
  [
    "an empty member (SCH-13)",
    { offered, wants: [range({ member: [""] })] },
    "wants.0.filter.member.0: *",
  ],
  [
    "a 33-character member (SCH-13)",
    { offered, wants: [range({ member: ["m".repeat(33)] })] },
    "wants.0.filter.member.0: *",
  ],
  [
    "a 9-character class (SCH-13)",
    { offered, wants: [range({ class: ["c".repeat(9)] })] },
    "wants.0.filter.class.0: *",
  ],
  [
    "an unknown on_offline (SCH-13)",
    { offered, wants: [range({ on_offline: ["both"] })] },
    "wants.0.filter.on_offline.0: *",
  ],
  [
    "an unknown artist (SCH-14)",
    { offered, wants: [range({ artist: ["unknown"] })] },
    "wants.0.filter.artist.0: *",
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
    "a 256-character slug (SCH-17)",
    { offered, wants: [exact("s".repeat(256))] },
    "wants.0.slug: *",
  ],
  [
    "token id 0 (SCH-17)",
    { offered: [{ tokenId: 0 }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "token id -1 (SCH-17)",
    { offered: [{ tokenId: -1 }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "token id 1.2 (SCH-17)",
    { offered: [{ tokenId: 1.2 }], wants },
    "offered.0.tokenId: *",
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
    "a spoofed fromAddress (SCH-18)",
    { offered, wants, fromAddress: "0xabc" },
    ": *",
  ],
  ["a spoofed status (SCH-18)", { offered, wants, status: "claimed" }, ": *"],
  [
    "a spoofed createdAt (SCH-18)",
    { offered, wants, createdAt: new Date(0) },
    ": *",
  ],
  [
    "a spoofed updatedAt (SCH-20)",
    { offered, wants, updatedAt: new Date(0) },
    ": *",
  ],
  [
    "an extra key on an offered objekt (SCH-18)",
    { offered: [{ tokenId: 1, live: false }], wants },
    "offered.0: *",
  ],
  [
    "an extra key on a want (SCH-18)",
    { offered, wants: [{ ...exact(KIMLIP), listingId: LISTING_ID }] },
    "wants.0: *",
  ],
  [
    "count as a BigInt (SCH-22)",
    { offered, wants: [{ kind: "exact", slug: KIMLIP, count: 5n }] },
    "wants.0.count: *",
  ],
  [
    "count as Infinity (SCH-22)",
    { offered, wants: [exact(KIMLIP, Infinity)] },
    "wants.0.count: *",
  ],
  [
    "count as -Infinity (SCH-22)",
    { offered, wants: [exact(KIMLIP, -Infinity)] },
    "wants.0.count: *",
  ],
  [
    "count as -0 (SCH-22)",
    { offered, wants: [exact(KIMLIP, -0)] },
    "wants.0.count: A row needs at least one objekt",
  ],
  [
    "count as a string (SCH-22)",
    { offered, wants: [{ kind: "exact", slug: KIMLIP, count: "5" }] },
    "wants.0.count: *",
  ],
  [
    "count as true (SCH-22)",
    { offered, wants: [{ kind: "exact", slug: KIMLIP, count: true }] },
    "wants.0.count: *",
  ],
  [
    "token id as a BigInt (SCH-22)",
    { offered: [{ tokenId: 5n }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "token id as Infinity (SCH-22)",
    { offered: [{ tokenId: Infinity }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "token id as -Infinity (SCH-22)",
    { offered: [{ tokenId: -Infinity }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "token id as -0 (SCH-22)",
    { offered: [{ tokenId: -0 }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "token id as a string (SCH-22)",
    { offered: [{ tokenId: "5" }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "token id as true (SCH-22)",
    { offered: [{ tokenId: true }], wants },
    "offered.0.tokenId: *",
  ],
  [
    "a NUL byte in a range member (SCH-24)",
    { offered, wants: [range({ member: ["\u0000"] })] },
    "wants.0.filter.member.0: Text can't contain a NUL byte",
  ],
  [
    "a NUL byte in a range season (SCH-24)",
    { offered, wants: [range({ season: ["Atom02\u0000"] })] },
    "wants.0.filter.season.0: Text can't contain a NUL byte",
  ],
  [
    "a NUL byte in a range class (SCH-24)",
    { offered, wants: [range({ class: ["\u0000First"] })] },
    "wants.0.filter.class.0: Text can't contain a NUL byte",
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
  ["wants as a Set (SCH-22)", { offered, wants: new Set(wants) }, "wants: *"],
  [
    "offered as a Map (SCH-22)",
    { offered: new Map([[0, { tokenId: 1 }]]), wants },
    "offered: *",
  ],
] as const;

/**
 * Terms every schema accepts, and what they parse to.
 */
const accepted: [
  name: string,
  input: {
    offered: { tokenId: number }[];
    wants: (ReturnType<typeof exact> | ReturnType<typeof range>)[];
    note?: string | null;
  },
  output: ListingInput,
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
    "an exact count at the row cap (SCH-07)",
    { offered, wants: [exact(KIMLIP, MAX_PER_ROW)] },
    { offered, wants: [exact(KIMLIP, MAX_PER_ROW)], note: null },
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
    "12 seasons in one range (SCH-13)",
    {
      offered,
      wants: [range({ season: Array.from({ length: 12 }, (_, i) => `S${i}`) })],
    },
    {
      offered,
      wants: [
        stored({
          season: Array.from({ length: 12 }, (_, i) => `S${i}`),
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
    "a null note (SCH-15)",
    { offered, wants, note: null },
    { offered, wants, note: null },
  ],
  [
    "a whitespace note (SCH-15)",
    { offered, wants, note: "   " },
    { offered, wants, note: null },
  ],
  [
    "a newline and tab note (SCH-15)",
    { offered, wants, note: "\n\t" },
    { offered, wants, note: null },
  ],
  [
    "a padded note (SCH-15)",
    { offered, wants, note: "  x  " },
    { offered, wants, note: "x" },
  ],
  [
    "a 500-character note (SCH-15)",
    { offered, wants, note: "n".repeat(500) },
    { offered, wants, note: "n".repeat(500) },
  ],
  [
    "a 500-character note with padding (SCH-15)",
    { offered, wants, note: ` ${"n".repeat(500)} ` },
    { offered, wants, note: "n".repeat(500) },
  ],
];

describe.each(termSchemas)("%s", (_, schema, extra) => {
  test.each(refused)("refuses %s", (_, input, issue) => {
    expectIssue(schema.safeParse({ ...extra, ...input }), issue);
  });

  test.each(accepted)("accepts %s", (_, input, output) => {
    expect(schema.safeParse({ ...extra, ...input })).toEqual({
      success: true,
      data: { ...extra, ...output },
    });
  });

  test.each([
    ["artist", { artist: ["artms"] }],
    ["member", { member: ["HeeJin"] }],
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

  test("leaves an omitted note as null (SCH-01, SCH-15)", () => {
    const result = schema.safeParse({ ...extra, offered, wants });
    expect(result.success && result.data.note).toBeNull();
  });
});

describe("editListingInputSchema (SCH-20)", () => {
  test.each([
    ["a missing listing id", {}],
    ["a non-uuid listing id", { listingId: "not-a-uuid" }],
    ["a numeric listing id (SCH-22)", { listingId: 123 }],
    ["an array listing id (SCH-22)", { listingId: [LISTING_ID] }],
    ["a null listing id (SCH-22)", { listingId: null }],
  ])("refuses %s", (_, id) => {
    expectIssue(
      editListingInputSchema.safeParse({ ...id, offered, wants }),
      "listingId: *",
    );
  });

  test("lowercases the listing id", () => {
    const result = editListingInputSchema.safeParse({
      listingId: LISTING_ID.toUpperCase(),
      offered,
      wants,
    });
    expect(result.success && result.data.listingId).toBe(LISTING_ID);
  });
});

describe("output types carry no server fields (SCH-18, SCH-20)", () => {
  test("listing and edit inputs", () => {
    expectTypeOf<keyof ListingInput>().toEqualTypeOf<
      "offered" | "wants" | "note"
    >();
    expectTypeOf<keyof EditListingInput>().toEqualTypeOf<
      "listingId" | "offered" | "wants" | "note"
    >();
    expectTypeOf<keyof ClaimListingInput>().toEqualTypeOf<
      "listingId" | "seen" | "rows"
    >();
    expectTypeOf<
      keyof ListingInput["offered"][number]
    >().toEqualTypeOf<"tokenId">();
    // posted wants are what allocate and validateAssignment take
    expectTypeOf<ListingInput["wants"]>().toExtend<readonly TradeWant[]>();
  });
});

describe("claimListingInputSchema", () => {
  const seen = new Date("2026-10-11T12:00:00.123Z");
  const claim = { listingId: LISTING_ID, seen, rows: [[1], [2, 3]] };

  test("accepts a uuid, a Date and lists of token ids (SCH-19)", () => {
    expect(claimListingInputSchema.safeParse(claim)).toEqual({
      success: true,
      data: claim,
    });
  });

  test("lowercases the listing id", () => {
    const result = claimListingInputSchema.safeParse({
      ...claim,
      listingId: LISTING_ID.toUpperCase(),
    });
    expect(result.success && result.data.listingId).toBe(LISTING_ID);
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

  test("passes a far-future seen through to the guard (SCH-21)", () => {
    const future = new Date("2036-10-11T12:00:00Z");
    const result = claimListingInputSchema.safeParse({
      ...claim,
      seen: future,
    });
    expect(result.success && result.data.seen).toEqual(future);
  });

  test.each([
    [
      "a non-uuid listing id (SCH-19)",
      { listingId: "listing-1" },
      "listingId: *",
    ],
    ["a numeric listing id (SCH-22)", { listingId: 123 }, "listingId: *"],
    [
      "an array listing id (SCH-22)",
      { listingId: [LISTING_ID] },
      "listingId: *",
    ],
    ["a null listing id (SCH-22)", { listingId: null }, "listingId: *"],
    ["seen as a string (SCH-19)", { seen: seen.toISOString() }, "seen: *"],
    ["seen as an Invalid Date (SCH-21)", { seen: new Date("nope") }, "seen: *"],
    ["seen as an epoch number (SCH-21)", { seen: seen.getTime() }, "seen: *"],
    ["rows that aren't an array (SCH-19)", { rows: "1,2" }, "rows: *"],
    ["a fractional token id (SCH-19)", { rows: [[1.5]] }, "rows.0.0: *"],
    ["token id 0 (SCH-21)", { rows: [[0]] }, "rows.0.0: *"],
    ["token id -1 (SCH-21)", { rows: [[-1]] }, "rows.0.0: *"],
    ["token id 2^31 (SCH-21)", { rows: [[2 ** 31]] }, "rows.0.0: *"],
    ["token id as a string (SCH-21)", { rows: [["123"]] }, "rows.0.0: *"],
    ["token id NaN (SCH-21)", { rows: [[NaN]] }, "rows.0.0: *"],
    ["token id as a BigInt (SCH-22)", { rows: [[5n]] }, "rows.0.0: *"],
    ["token id Infinity (SCH-22)", { rows: [[Infinity]] }, "rows.0.0: *"],
    ["token id -Infinity (SCH-22)", { rows: [[-Infinity]] }, "rows.0.0: *"],
    ["token id -0 (SCH-22)", { rows: [[-0]] }, "rows.0.0: *"],
    ["token id true (SCH-22)", { rows: [[true]] }, "rows.0.0: *"],
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
    ["rows as a Set (SCH-22)", { rows: new Set([[1]]) }, "rows: *"],
    ["an extra key", { fromAddress: "0xabc" }, ": *"],
  ])("refuses %s", (_, override, issue) => {
    expectIssue(
      claimListingInputSchema.safeParse({ ...claim, ...override }),
      issue,
    );
  });
});

describe("listingIdSchema (SCH-23)", () => {
  test.each([
    ["a non-uuid", "not-a-uuid"],
    ["a number", 123],
    ["null", null],
    ["an array of a uuid", [LISTING_ID]],
    ["an object", {}],
    ["a uuid with trailing text", `${LISTING_ID}x`],
  ])("refuses %s", (_, id) => {
    expect(listingIdSchema.safeParse(id).success).toBe(false);
  });

  test("lowercases an uppercase uuid, so both forms name one listing", () => {
    expect(listingIdSchema.parse(LISTING_ID.toUpperCase())).toBe(LISTING_ID);
  });

  test("accepts the nil uuid, which no listing has", () => {
    expect(listingIdSchema.parse("00000000-0000-0000-0000-000000000000")).toBe(
      "00000000-0000-0000-0000-000000000000",
    );
  });
});

describe("listingIdInputSchema (SCH-23)", () => {
  test.each([
    ["a non-uuid", "not-a-uuid"],
    ["a number", 123],
    ["null", null],
    ["an array of a uuid", [LISTING_ID]],
    ["an object", {}],
    ["an empty string", ""],
    ["a uuid with trailing formatting", `${LISTING_ID}**`],
  ])("refuses %s as the listing id", (_, listingId) => {
    expect(listingIdInputSchema.safeParse({ listingId }).success).toBe(false);
  });

  test.each([
    ["no listing id", {}],
    ["the id under another key", { id: LISTING_ID }],
    ["a bare uuid", LISTING_ID],
    ["null", null],
    ["an array of a uuid", [LISTING_ID]],
  ])("refuses %s", (_, input) => {
    expect(listingIdInputSchema.safeParse(input).success).toBe(false);
  });

  test("refuses keys beyond the listing id", () => {
    expect(
      listingIdInputSchema.safeParse({ listingId: LISTING_ID, status: "open" })
        .success,
    ).toBe(false);
  });

  test("lowercases an uppercase uuid, so both forms name one listing", () => {
    expect(
      listingIdInputSchema.parse({ listingId: LISTING_ID.toUpperCase() }),
    ).toEqual({ listingId: LISTING_ID });
  });

  test("accepts the nil uuid, which no listing has", () => {
    const nil = "00000000-0000-0000-0000-000000000000";
    expect(listingIdInputSchema.parse({ listingId: nil })).toEqual({
      listingId: nil,
    });
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

  test("refuses ids Postgres can't store and extra keys", () => {
    for (const tokenId of [0, -1, 1.5, 2_147_483_648]) {
      expect(
        offeredTokensInputSchema.safeParse({ tokenIds: [tokenId] }).success,
        String(tokenId),
      ).toBe(false);
    }
    expect(
      offeredTokensInputSchema.safeParse({ tokenIds: [1], address: "0x" })
        .success,
    ).toBe(false);
  });
});

test("listing types offer only trades in phase 8", () => {
  expect(listingTypes).toEqual(["trade"]);
});
