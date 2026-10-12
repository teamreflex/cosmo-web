import { listingInputSchema } from "@apollo/trades/listing";
import { describe, expect, test } from "bun:test";
import {
  askingTitle,
  offeredMembers,
  offeredNames,
  rangeArtist,
  rangeCaption,
  rangeLabel,
  wantKindsSummary,
  wantedObjektCount,
  wantsCaption,
  wantsSummary,
} from "../src/lib/client/trade-listings";
import {
  type ListingFormValues,
  applyChipUpdate,
  composerBlock,
  emptyListingForm,
  formValuesToInput,
  listingToFormValues,
  rangeIsNarrowed,
  rangeToChipFilters,
} from "../src/lib/universal/trade-listing-form";
import type { TradeListing } from "../src/lib/universal/trade-listings";

const attributes = (slug: string, member: string, artist = "artms") => ({
  slug,
  artist,
  member,
  season: "Atom02",
  class: "Special",
  onOffline: "online",
});

/**
 * A stored listing as the detail payload carries it: one offered objekt, a
 * tripleS range, an exact row and a payment row only SQL can insert.
 */
const listing = {
  id: "0b7d6f1e-6a43-4c55-9d3e-2f1b4c8a9e10",
  note: "serials under 1000",
  items: [
    {
      tokenId: 4021,
      serial: 217,
      attributes: attributes("atom02-heejin-201z", "HeeJin"),
      collection: null,
    },
  ],
  wants: [
    {
      kind: "range",
      count: 5,
      filter: {
        artist: ["triples"],
        member: [],
        season: ["Atom01", "Binary01"],
        class: ["First"],
        on_offline: [],
      },
    },
    {
      kind: "exact",
      count: 1,
      objekt: attributes("atom02-kimlip-201z", "KimLip"),
      collection: null,
    },
    { kind: "payment", amount: "25.00", currency: "NZD" },
  ],
} satisfies Pick<TradeListing, "id" | "items" | "wants" | "note">;

test("a listing's wanted objekts leave its payment row out", () => {
  expect(wantedObjektCount(listing.wants)).toBe(6);
  expect(wantedObjektCount(listing.wants.slice(2))).toBe(0);
  expect(wantedObjektCount([])).toBe(0);
});

describe("composer prefill (CMP-04)", () => {
  const values = listingToFormValues(listing);

  test("the stored terms become the form's values", () => {
    expect(values).toEqual({
      offered: [{ tokenId: 4021 }],
      wants: [
        {
          kind: "range",
          count: 5,
          filter: {
            artist: ["triples"],
            member: [],
            season: ["Atom01", "Binary01"],
            class: ["First"],
            on_offline: [],
          },
        },
        { kind: "exact", slug: "atom02-kimlip-201z", count: 1 },
      ],
      note: "serials under 1000",
    });
  });

  test("the range's chips show the artist as tripleS", () => {
    const [range] = values.wants;
    if (range?.kind !== "range") throw new Error("expected a range row");
    expect(rangeToChipFilters(range.filter)).toEqual({
      artist: "tripleS",
      member: [],
      season: ["Atom01", "Binary01"],
      class: ["First"],
      on_offline: [],
    });
  });

  test("submitting unchanged sends exactly the stored terms", () => {
    const submission = formValuesToInput(listingInputSchema.parse(values), {
      kind: "edit",
      listing: { ...listing, ...fillers },
    });
    expect(submission).toEqual({
      kind: "edit",
      data: {
        listingId: listing.id,
        offered: [{ tokenId: 4021 }],
        wants: [
          {
            kind: "range",
            count: 5,
            filter: {
              artist: ["triples"],
              member: [],
              season: ["Atom01", "Binary01"],
              class: ["First"],
              on_offline: [],
            },
          },
          { kind: "exact", slug: "atom02-kimlip-201z", count: 1 },
        ],
        note: "serials under 1000",
      },
    });
  });

  test("picking tripleS on a chip stores triples and clears its columns", () => {
    const changed = applyChipUpdate(
      { artist: ["artms"], member: ["HeeJin"], season: ["Atom02"] },
      { artist: "tripleS", member: undefined },
    );
    expect(changed).toEqual({
      artist: ["triples"],
      member: [],
      season: [],
      class: [],
    });
    expect(
      listingInputSchema.parse({
        offered: [{ tokenId: 1 }],
        wants: [{ kind: "range", count: 1, filter: changed }],
      }).wants,
    ).toEqual([
      {
        kind: "range",
        count: 1,
        filter: {
          artist: ["triples"],
          member: [],
          season: [],
          class: [],
          on_offline: [],
        },
      },
    ]);
  });

  test("a chip change touches only the columns it names", () => {
    expect(
      applyChipUpdate(
        { artist: ["artms"], season: ["Atom02"] },
        { on_offline: ["offline"] },
      ),
    ).toEqual({
      artist: ["artms"],
      season: ["Atom02"],
      on_offline: ["offline"],
    });
    expect(applyChipUpdate({ season: ["Atom02"] }, { season: null })).toEqual({
      season: [],
    });
  });

  test("an empty or unnarrowed range isn't postable", () => {
    expect(rangeIsNarrowed({})).toBe(false);
    expect(rangeIsNarrowed({ artist: [], member: [] })).toBe(false);
    expect(rangeIsNarrowed({ class: ["First"] })).toBe(true);
  });

  test("a blank note posts as no note, and create sends no id", () => {
    const submission = formValuesToInput(
      listingInputSchema.parse({
        ...emptyListingForm,
        offered: [{ tokenId: 9 }],
        wants: [{ kind: "exact", slug: " Atom02-KimLip-201Z ", count: 2 }],
        note: "   ",
      }),
      { kind: "create" },
    );
    expect(submission).toEqual({
      kind: "create",
      data: {
        offered: [{ tokenId: 9 }],
        wants: [{ kind: "exact", slug: "atom02-kimlip-201z", count: 2 }],
        note: null,
      },
    });
  });
});

const fillers = {
  createdAt: new Date(0),
  updatedAt: new Date(0),
  poster: null,
  cosmoUsername: null,
  state: { status: "open" },
  blocked: false,
} satisfies Omit<TradeListing, "id" | "items" | "wants" | "note">;

describe("why Post is held back (CUI-05)", () => {
  const range = {
    kind: "range" as const,
    count: 5,
    filter: { artist: ["artms"], season: ["Atom02"] },
  };
  const exact = {
    kind: "exact" as const,
    slug: "atom02-heejin-201z",
    count: 1,
  };

  const block = (
    offered: number,
    wants: ListingFormValues["wants"],
    rangeMatches: (number | undefined)[],
    { refused = 0, note = "" } = {},
  ) => composerBlock({ offered, refused, wants, rangeMatches, note });

  test("each missing piece names its reason, in the order the form reads", () => {
    expect(block(0, [], [])).toBe("offered");
    expect(block(0, [range], [0])).toBe("offered");
    expect(block(1, [], [], { refused: 1 })).toBe("refused");
    expect(block(1, [], [])).toBe("wants");
    expect(block(1, [exact, { ...range, filter: {} }], [4])).toBe("range");
    expect(block(1, [range], [0], { note: "x".repeat(501) })).toBe(
      "range_empty",
    );
  });

  test("a range covering no collections holds Post back", () => {
    expect(block(1, [exact, range], [0])).toBe("range_empty");
    expect(block(1, [range, range], [12, 0])).toBe("range_empty");
  });

  test("an offered objekt the poster can't offer holds Post and Save back", () => {
    expect(block(2, [exact, range], [12], { refused: 1 })).toBe("refused");
  });

  test("a note over the limit holds Post back, once trimmed as it's saved", () => {
    expect(block(1, [exact], [], { note: "x".repeat(501) })).toBe("note");
    expect(block(1, [exact], [], { note: "x".repeat(500) })).toBeNull();
    expect(block(1, [exact], [], { note: ` ${"x".repeat(500)} ` })).toBeNull();
  });

  test("a counted or still-counting range lets Post through", () => {
    expect(block(1, [exact, range], [12])).toBeNull();
    expect(block(1, [exact, range], [undefined])).toBeNull();
    expect(block(1, [exact], [])).toBeNull();
  });
});

describe("range labels (FUI-14)", () => {
  test("a stored bidi control can't reorder the values beside it", () => {
    const label = rangeLabel({
      artist: [],
      member: ["<img src=x onerror=alert(1)>", "\u202Eevil", "a,b", "HeeJin"],
      season: ["Atom02"],
      class: [],
      on_offline: [],
    });
    expect(label).toBe(
      "Atom02\u00a0· <img src=x onerror=alert(1)> / \u2068\u202Eevil\u2069 / a,b / HeeJin",
    );
  });

  test("plain values read as they are", () => {
    expect(
      rangeLabel({
        artist: ["artms"],
        member: [],
        season: ["Atom02", "Binary01"],
        class: ["First"],
        on_offline: [],
      }),
    ).toBe("Atom02 / Binary01\u00a0· ARTMS\u00a0· First");
  });
});

describe("offered names (MarketA multi-objekt rows)", () => {
  const item = (season: string, member: string, number: string) => ({
    collection: null,
    attributes: {
      slug: `${season}-${member}-${number}`.toLowerCase(),
      artist: "artms",
      member,
      season,
      class: "First",
      onOffline: "online",
    },
  });

  test("objekts sharing a season and member name it once", () => {
    expect(
      offeredNames([
        item("Ever01", "HeeJin", "317Z"),
        item("Ever01", "HeeJin", "318Z"),
        item("Ever01", "KimLip", "316Z"),
        item("Ever01", "HeeJin", "319Z"),
      ]),
    ).toBe("Ever01 HeeJin 317Z, 318Z, 319Z, Ever01 KimLip 316Z");
  });

  test("copies of one collection read once", () => {
    expect(
      offeredNames([
        item("Atom01", "HeeJin", "101Z"),
        item("Atom01", "HeeJin", "101Z"),
        item("Atom01", "HeeJin", "102Z"),
      ]),
    ).toBe("Atom01 HeeJin 101Z, 102Z");
  });

  test("different members keep their full names", () => {
    expect(
      offeredNames([
        item("Divine01", "Choerry", "202Z"),
        item("Atom01", "JinSoul", "317Z"),
      ]),
    ).toBe("Divine01 Choerry 202Z, Atom01 JinSoul 317Z");
  });
});

describe("the phone feed's trade slip (FeedPhoneA)", () => {
  const item = (season: string, member: string) => ({
    attributes: {
      slug: `${season}-${member}-101z`.toLowerCase(),
      artist: "artms",
      member,
      season,
      class: "First",
      onOffline: "online",
    },
  });
  const filter = {
    artist: [],
    member: [],
    season: [],
    class: [],
    on_offline: [],
  };

  test("offered objekts read as each season's members", () => {
    expect(
      offeredMembers([
        item("Atom02", "JinSoul"),
        item("Atom02", "KimLip"),
        item("Atom02", "JinSoul"),
        item("Atom02", "Choerry"),
      ]),
    ).toBe("Atom02 · JinSoul, KimLip, Choerry");
    expect(
      offeredMembers([
        item("Atom02", "JinSoul"),
        item("Binary01", "HeeJin"),
        item("Atom02", "KimLip"),
      ]),
    ).toBe("Atom02 · JinSoul, KimLip, Binary01 · HeeJin");
  });

  test("a range's caption puts the group and seasons first", () => {
    expect(
      rangeCaption({
        ...filter,
        artist: ["artms"],
        season: ["Atom02"],
        class: ["First"],
      }),
    ).toEqual({
      title: "ARTMS\u00a0· Atom02",
      detail: "Any member\u00a0· First",
      tags: "First",
    });
    expect(
      rangeCaption({
        ...filter,
        artist: ["artms"],
        season: ["Atom02", "Binary01"],
        member: ["JinSoul", "Choerry"],
        class: ["Double"],
        on_offline: ["online"],
      }),
    ).toEqual({
      title: "ARTMS\u00a0· Atom02 / Binary01",
      detail: "JinSoul / Choerry\u00a0· Double\u00a0· Digital",
      tags: "Double\u00a0· Digital",
    });
  });

  test("a range open to any group and season says so", () => {
    expect(rangeCaption({ ...filter, member: ["HeeJin"] })).toEqual({
      title: "Any artist",
      detail: "HeeJin",
      tags: "",
    });
  });

  test("a stored bidi control in a caption sits in its own isolate", () => {
    expect(
      rangeCaption({ ...filter, season: ["\u202Eevil", "Atom02"] }).title,
    ).toBe("\u2068\u202Eevil\u2069 / Atom02");
  });

  test("several want rows drop the count of a row asking for one", () => {
    expect(wantsCaption(listing.wants)).toBe(
      "5× Atom01 / Binary01\u00a0· tripleS\u00a0· First, Atom02 KimLip 201Z, 25.00 NZD",
    );
  });
});

describe("the feed's Asking column (AskingSide)", () => {
  test("several rows read as how many objekts they ask for", () => {
    expect(askingTitle(listing.wants)).toBe("6 objekts");
    expect(askingTitle(listing.wants.slice(0, 1))).toBe("5 objekts");
  });

  test("one exact row or payment alone reads as its name", () => {
    expect(askingTitle(listing.wants.slice(1, 2))).toBe("Atom02 KimLip 201Z");
    expect(askingTitle(listing.wants.slice(2))).toBe("25.00 NZD");
  });

  test("the summary lists every row with its count, in posted order", () => {
    expect(wantsSummary(listing.wants)).toBe(
      "5× Atom01 / Binary01\u00a0· tripleS\u00a0· First, 1× Atom02 KimLip 201Z, 25.00 NZD",
    );
  });

  test("a range's group is its one artist, whatever its case", () => {
    const filter = {
      artist: [],
      member: [],
      season: [],
      class: [],
      on_offline: [],
    };
    expect(rangeArtist({ ...filter, artist: ["triples"] })).toBe("tripleS");
    expect(rangeArtist({ ...filter, artist: ["ARTMS"] })).toBe("artms");
    expect(rangeArtist(filter)).toBeNull();
    expect(rangeArtist({ ...filter, artist: ["artms", "idntt"] })).toBeNull();
    expect(rangeArtist({ ...filter, artist: ["unknown"] })).toBeNull();
  });
});

describe("the Looking for heading's summary (ListingLayoutA)", () => {
  test("counts each kind of row the listing asks for", () => {
    expect(wantKindsSummary(listing.wants)).toBe(
      "1 range · 1 exact · 1 payment",
    );
    expect(wantKindsSummary(listing.wants.slice(0, 2))).toBe(
      "1 range · 1 exact",
    );
    const range = listing.wants.slice(0, 1);
    expect(wantKindsSummary([...range, ...range])).toBe("2 ranges");
  });
});
