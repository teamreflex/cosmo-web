import { MAX_CHOICE_OPTIONS } from "@apollo/trades/caps";
import { listingInputSchema } from "@apollo/trades/listing";
import { MAX_RANGE_VALUES } from "@apollo/trades/range";
import { describe, expect, test } from "bun:test";
import {
  composerBlock,
  emptyListingForm,
  followUnitSize,
  formUnitSize,
  formValuesToInput,
  type ListingFormValues,
  listingToFormValues,
  stepUnitSize,
} from "../src/lib/universal/trade-listing-form";
import type { TradeListing } from "../src/lib/universal/trade-listings";

// each artist's members, keyed as ranges store artists
const rosters = new Map([
  ["artms", ["HeeJin", "HaSeul", "KimLip", "JinSoul", "Choerry"]],
  ["triples", ["SeoYeon", "HyeRin", "JiWoo"]],
]);

const attributes = (slug: string, member: string, artist = "artms") => ({
  slug,
  artist,
  member,
  season: "Atom02",
  class: "Special",
  onOffline: "online",
});

/**
 * A stored listing as the detail payload carries it: a ratio of one objekt
 * at a time, with one offered objekt and one that left the pool, a tripleS
 * range, an exact row, an "any of" row and a payment row only SQL can
 * insert.
 */
const listing = {
  id: "0b7d6f1e-6a43-4c55-9d3e-2f1b4c8a9e10",
  note: "serials under 1000",
  unitSize: 1,
  items: [
    {
      tokenId: 4021,
      serial: 217,
      attributes: attributes("atom02-heejin-201z", "HeeJin"),
      collection: null,
      availability: { kind: "free" },
    },
    {
      tokenId: 3990,
      serial: 41,
      attributes: attributes("atom02-heejin-202z", "HeeJin"),
      collection: null,
      availability: { kind: "traded", at: new Date(0) },
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
    {
      kind: "choice",
      count: 2,
      options: [
        { ...attributes("atom02-haseul-201z", "HaSeul"), collection: null },
        { ...attributes("atom02-jinsoul-201z", "JinSoul"), collection: null },
      ],
    },
    { kind: "payment", amount: "25.00", currency: "NZD" },
  ],
} satisfies Pick<TradeListing, "id" | "items" | "wants" | "note" | "unitSize">;

describe("composer prefill (CMP-04)", () => {
  const values = listingToFormValues(listing);

  test("the stored terms become the form's values", () => {
    expect(values).toEqual({
      offered: [{ tokenId: 4021 }],
      unitSize: 1,
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
        {
          kind: "choice",
          slugs: ["atom02-haseul-201z", "atom02-jinsoul-201z"],
          count: 2,
        },
      ],
      note: "serials under 1000",
    });
  });

  test("submitting unchanged sends exactly the stored terms", () => {
    const submission = formValuesToInput(
      listingInputSchema.parse(values),
      { kind: "edit", listing: { ...listing, ...fillers } },
      rosters,
    );
    expect(submission).toEqual({
      kind: "edit",
      data: {
        listingId: listing.id,
        offered: [{ tokenId: 4021 }],
        unitSize: 1,
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
          {
            kind: "choice",
            slugs: ["atom02-haseul-201z", "atom02-jinsoul-201z"],
            count: 2,
          },
        ],
        note: "serials under 1000",
      },
    });
  });

  test("editing a ratio listing keeps its unit size as the pool grows", () => {
    const edited = listingInputSchema.parse({
      ...values,
      offered: [...values.offered, { tokenId: 5000 }, { tokenId: 5001 }],
    });
    expect(edited.unitSize).toBe(1);
  });

  test("editing a bundle carries no unit size, so it stays a bundle as the pool changes", () => {
    const bundle = {
      ...listing,
      unitSize: 2,
      items: listing.items.map((item) => ({
        ...item,
        availability: { kind: "free" as const },
      })),
    };
    const form = listingToFormValues(bundle);
    expect(form.unitSize).toBeUndefined();
    expect(followUnitSize(form.unitSize, 3)).toBeUndefined();
    expect(
      listingInputSchema.parse({
        ...form,
        offered: [...form.offered, { tokenId: 5000 }],
      }).unitSize,
    ).toBe(3);
  });

  test("a ratio listing whose pool shrank to its unit size keeps its ratio as an edit restocks it", () => {
    const form = listingToFormValues(listing);
    expect(form.offered).toHaveLength(1);
    expect(form.unitSize).toBe(1);
    const restocked = [...form.offered, { tokenId: 5000 }, { tokenId: 5001 }];
    const unitSize = followUnitSize(form.unitSize, restocked.length);
    expect(unitSize).toBe(1);
    expect(
      listingInputSchema.parse({ ...form, offered: restocked, unitSize })
        .unitSize,
    ).toBe(1);
  });

  test("a pool that fell below the ratio prefills the ratio unchanged and holds Save back", () => {
    // the trade that took 3990 sent it, so it left the pool, and is still live
    const short = {
      ...listing,
      unitSize: 2,
      items: [
        ...listing.items,
        {
          tokenId: 4022,
          serial: 9,
          attributes: attributes("atom02-heejin-203z", "HeeJin"),
          collection: null,
          availability: { kind: "traded" as const, at: new Date(0) },
        },
      ],
    };
    const form = listingToFormValues(short);
    expect(form.offered).toEqual([{ tokenId: 4021 }]);
    expect(form.unitSize).toBe(2);
    expect(block(form)).toBe("ratio");
    expect(listingInputSchema.safeParse(form).success).toBe(false);
    expect(
      block({ ...form, offered: [...form.offered, { tokenId: 5000 }] }),
    ).toBeNull();
  });

  test("an empty pool prefills nothing offered and keeps the ratio for the restock", () => {
    const empty = {
      ...listing,
      items: listing.items.map((item) => ({
        ...item,
        availability: { kind: "traded" as const, at: new Date(0) },
      })),
    };
    const form = listingToFormValues(empty);
    expect(form.offered).toEqual([]);
    expect(form.unitSize).toBe(1);
    expect(block(form)).toBe("offered");
    expect(followUnitSize(form.unitSize, 2)).toBe(1);
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
      rosters,
    );
    expect(submission).toEqual({
      kind: "create",
      data: {
        offered: [{ tokenId: 9 }],
        unitSize: 1,
        wants: [{ kind: "exact", slug: "atom02-kimlip-201z", count: 2 }],
        note: null,
      },
    });
  });
});

describe("the ratio's unit size", () => {
  test("a new listing is a bundle, everything for everything", () => {
    expect(formUnitSize(emptyListingForm)).toBe(0);
    expect(formUnitSize({ offered: offered(3) })).toBe(3);
    expect(
      listingInputSchema.parse({
        offered: offered(4),
        wants: [{ kind: "exact", slug: "atom02-kimlip-201z", count: 2 }],
        note: "",
      }).unitSize,
    ).toBe(4);
  });

  test("a bundle stays a bundle as its pool grows or shrinks", () => {
    expect(followUnitSize(undefined, 1)).toBeUndefined();
    expect(followUnitSize(undefined, 9)).toBeUndefined();
    expect(followUnitSize(undefined, 0)).toBeUndefined();
  });

  test("a ratio keeps its size as the pool grows", () => {
    expect(followUnitSize(1, 9)).toBe(1);
    expect(followUnitSize(7, 20)).toBe(7);
  });

  test("a ratio is held to a smaller pool and never grows back", () => {
    const clamped = followUnitSize(5, 3);
    expect(clamped).toBe(3);
    expect(followUnitSize(clamped, 6)).toBe(3);
    expect(followUnitSize(2, 5)).toBe(2);
  });

  test("removing then re-adding an objekt at 1 of 2 keeps 1", () => {
    const removed = followUnitSize(1, 1);
    expect(removed).toBe(1);
    expect(followUnitSize(removed, 2)).toBe(1);
  });

  test("emptying the pool keeps a ratio of at least one", () => {
    expect(followUnitSize(2, 0)).toBe(1);
    expect(followUnitSize(followUnitSize(2, 0), 3)).toBe(1);
  });

  test("stepping up to the whole pool makes a bundle again", () => {
    expect(stepUnitSize(2, 3)).toBe(2);
    expect(stepUnitSize(3, 3)).toBeUndefined();
    // an edit's ratio over the pool steps down onto it
    expect(stepUnitSize(2, 2)).toBeUndefined();
  });

  test("adding and removing an objekt leaves a new form as it started", () => {
    const added = followUnitSize(emptyListingForm.unitSize, 1);
    // strictly, as the form compares its values with its defaults to tell it's dirty
    const restored: ListingFormValues = {
      ...emptyListingForm,
      unitSize: followUnitSize(added, 0),
    };
    expect(restored).toStrictEqual(emptyListingForm);
  });
});

describe('"any of" rows', () => {
  const blockWants = (wants: ListingFormValues["wants"]) =>
    block({ offered: offered(1), wants });
  const choice = (slugs: string[], count = 1) => ({
    kind: "choice" as const,
    slugs,
    count,
  });
  const slugs = (count: number) =>
    Array.from({ length: count }, (_, i) => `atom02-kimlip-${200 + i}z`);

  test("a row naming fewer than two collections holds Post back", () => {
    expect(blockWants([choice([])])).toBe("choice");
    expect(blockWants([choice(slugs(1))])).toBe("choice");
    expect(blockWants([choice(slugs(2))])).toBeNull();
  });

  test("a row past the option cap holds Post back", () => {
    expect(blockWants([choice(slugs(MAX_CHOICE_OPTIONS))])).toBeNull();
    expect(blockWants([choice(slugs(MAX_CHOICE_OPTIONS + 1))])).toBe(
      "choice_too_many",
    );
  });

  test("a row naming one collection twice holds Post back, as the schema refuses it", () => {
    const [a = "", b = ""] = slugs(2);
    const wants = [choice([a, b, a])];
    expect(blockWants(wants)).toBe("choice_duplicate");
    expect(
      listingInputSchema.safeParse({ offered: offered(1), wants, note: "" })
        .success,
    ).toBe(false);
  });

  test("two rows naming the same collections in any order hold Post back", () => {
    const [a = "", b = "", c = ""] = slugs(3);
    expect(blockWants([choice([a, b]), choice([b, a], 2)])).toBe(
      "choice_repeated",
    );
    expect(blockWants([choice([a, b]), choice([a, b, c])])).toBeNull();
  });

  test("a row may name a collection an exact row asks for", () => {
    const [a = "", b = ""] = slugs(2);
    const wants = [
      { kind: "exact" as const, slug: a, count: 1 },
      choice([a, b]),
    ];
    expect(blockWants(wants)).toBeNull();
    expect(
      listingInputSchema.safeParse({ offered: offered(1), wants, note: "" })
        .success,
    ).toBe(true);
  });

  test("whatever Post lets through, the schema takes", () => {
    const wants = [choice(slugs(2), 3), choice(slugs(3))];
    expect(blockWants(wants)).toBeNull();
    expect(
      listingInputSchema.safeParse({ offered: offered(1), wants, note: "" })
        .success,
    ).toBe(true);
  });
});

describe("range rows on submit", () => {
  const artms = ["HeeJin", "HaSeul", "KimLip", "JinSoul", "Choerry"];
  const submit = (member: string[]) =>
    formValuesToInput(
      listingInputSchema.parse({
        offered: [{ tokenId: 9 }],
        wants: [{ kind: "range", count: 1, filter: { member } }],
        note: "",
      }),
      { kind: "create" },
      rosters,
    ).data.wants[0];

  test("a whole group posts as its artist", () => {
    expect(submit(artms)).toMatchObject({
      filter: { artist: ["artms"], member: [] },
    });
  });

  test("a whole group with another group's member posts every member", () => {
    expect(submit([...artms, "SeoYeon"])).toMatchObject({
      filter: { artist: [], member: [...artms, "SeoYeon"] },
    });
  });

  test("a column past the cap holds Post back before the schema refuses it", () => {
    const member = Array.from(
      { length: MAX_RANGE_VALUES + 1 },
      (_, i) => `m${i}`,
    );
    expect(
      composerBlock({
        offered: 1,
        refused: 0,
        wants: [{ kind: "range", count: 1, filter: { member } }],
        unitSize: undefined,
        rangeMatches: [],
        rangesRepeat: false,
        note: "",
      }),
    ).toBe("range_too_many");
  });
});

const offered = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ tokenId: i + 1 }));

// why Post is held back for these values, with nothing refused and no range counted
const block = ({
  offered,
  unitSize,
  wants,
}: Pick<ListingFormValues, "offered" | "unitSize" | "wants">) =>
  composerBlock({
    offered: offered.length,
    refused: 0,
    wants,
    unitSize,
    rangeMatches: [],
    rangesRepeat: false,
    note: "",
  });

const fillers = {
  createdAt: new Date(0),
  updatedAt: new Date(0),
  poster: null,
  cosmoUsername: null,
  rep: null,
  state: { status: "open" },
  stop: null,
} satisfies Omit<TradeListing, "id" | "items" | "wants" | "note" | "unitSize">;
