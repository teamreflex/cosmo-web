import { listingInputSchema } from "@apollo/trades/listing";
import { MAX_RANGE_VALUES } from "@apollo/trades/range";
import { describe, expect, test } from "bun:test";
import {
  composerBlock,
  emptyListingForm,
  formValuesToInput,
  listingToFormValues,
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
 * A stored listing as the detail payload carries it: one offered objekt, a
 * tripleS range, an exact row, an "any of" row and a payment row only SQL
 * can insert.
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
    {
      kind: "choice",
      count: 2,
      options: [
        attributes("atom02-haseul-201z", "HaSeul"),
        attributes("atom02-jinsoul-201z", "JinSoul"),
      ],
    },
    { kind: "payment", amount: "25.00", currency: "NZD" },
  ],
} satisfies Pick<TradeListing, "id" | "items" | "wants" | "note">;

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
        rangeMatches: [],
        rangesRepeat: false,
        note: "",
      }),
    ).toBe("range_too_many");
  });
});

const fillers = {
  createdAt: new Date(0),
  updatedAt: new Date(0),
  poster: null,
  cosmoUsername: null,
  rep: null,
  state: { status: "open" },
  blocked: false,
} satisfies Omit<TradeListing, "id" | "items" | "wants" | "note">;
