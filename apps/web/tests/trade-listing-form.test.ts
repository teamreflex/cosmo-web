import type {
  ListingOfferMode,
  PaymentMethod,
} from "@apollo/database/web/types";
import type { ArtistValues } from "@apollo/trades/composer";
import {
  editListingInputSchema,
  listingInputSchema,
} from "@apollo/trades/listing";
import { MAX_RANGE_VALUES } from "@apollo/trades/range";
import { describe, expect, test } from "bun:test";
import {
  applyChipUpdate,
  claimerPaymentTerms,
  composerBlock,
  emptyListingForm,
  followUnitSize,
  formValuesToInput,
  type ListingFormValues,
  listingToFormValues,
  type RangeFormFilter,
  rangeToChipFilters,
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
 * range, an exact row and an "any of" row.
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
      ranges: [
        {
          artist: ["triples"],
          member: [],
          collectionNo: ["101Z"],
          season: ["Atom01", "Binary01"],
          class: ["First"],
          on_offline: [],
        },
      ],
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
  ],
  payment: null,
} satisfies Pick<
  TradeListing,
  "id" | "items" | "wants" | "payment" | "note" | "unitSize"
>;

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
          ranges: [
            {
              artist: ["triples"],
              member: [],
              collectionNo: ["101Z"],
              season: ["Atom01", "Binary01"],
              class: ["First"],
              on_offline: [],
            },
          ],
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
            ranges: [
              {
                artist: ["triples"],
                member: [],
                collectionNo: ["101Z"],
                season: ["Atom01", "Binary01"],
                class: ["First"],
                on_offline: [],
              },
            ],
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

  test("editing a bundle carries no unit size", () => {
    const bundle = {
      ...listing,
      unitSize: 2,
      items: listing.items.map((item) => ({
        ...item,
        availability: { kind: "free" as const },
      })),
    };
    expect(listingToFormValues(bundle).unitSize).toBeUndefined();
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
    expect(
      block({ ...form, offered: [...form.offered, { tokenId: 5000 }] }),
    ).toBeNull();
  });
});

describe("the ratio's unit size", () => {
  test("a ratio is held to a smaller pool and never grows back", () => {
    const clamped = followUnitSize(5, 3);
    expect(clamped).toBe(3);
    expect(followUnitSize(clamped, 6)).toBe(3);
  });

  test("a pool down to the ratio's size keeps it a ratio", () => {
    expect(followUnitSize(2, 2)).toBe(2);
  });

  test("emptying the pool keeps a ratio of at least one", () => {
    expect(followUnitSize(2, 0)).toBe(1);
  });

  test("stepping up to the whole pool makes a bundle again", () => {
    expect(stepUnitSize(2, 3)).toBe(2);
    expect(stepUnitSize(3, 3)).toBeUndefined();
    // an edit can prefill a ratio over the pool, which steps up past it
    expect(stepUnitSize(4, 2)).toBeUndefined();
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
  const choice = (slugs: string[]) => ({
    kind: "choice" as const,
    slugs,
    count: 1,
  });
  const slugs = (count: number) =>
    Array.from({ length: count }, (_, i) => `atom02-kimlip-${200 + i}z`);

  test("a row naming fewer than two collections holds Post back", () => {
    expect(blockWants([choice(slugs(1))])).toBe("choice");
    expect(blockWants([choice(slugs(2))])).toBeNull();
  });
});

describe("range rows on submit", () => {
  const artms = ["HeeJin", "HaSeul", "KimLip", "JinSoul", "Choerry"];
  const submit = (member: string[]) =>
    formValuesToInput(
      listingInputSchema.parse({
        offered: [{ tokenId: 9 }],
        wants: [{ kind: "range", count: 1, ranges: [{ member }] }],
        note: "",
      }),
      { kind: "create" },
      rosters,
    ).data.wants[0];

  test("a whole group posts as its artist", () => {
    expect(submit(artms)).toMatchObject({
      ranges: [{ artist: ["artms"], member: [] }],
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
        wants: [{ kind: "range", count: 1, ranges: [{ member }] }],
        offeredPayment: undefined,
        payment: undefined,
        unitSize: undefined,
        rangeMatches: [],
        rosters,
        note: "",
      }),
    ).toBe("range_too_many");
  });
});

describe("range rows with several artists", () => {
  // each artist's values, as the range row's chips read them
  const values: ArtistValues = new Map([
    [
      "artms",
      {
        member: rosters.get("artms") ?? [],
        season: ["Atom01", "Binary01"],
        class: ["First", "Special"],
      },
    ],
    [
      "triples",
      {
        member: rosters.get("triples") ?? [],
        season: ["Atom01", "Binary01", "Cream01"],
        class: ["First", "Double", "Special"],
      },
    ],
  ]);
  const filter = {
    artist: ["triples", "artms"],
    member: [],
    collectionNo: [],
    season: ["Cream01"],
    class: ["First"],
    on_offline: [],
  };

  test("the chips read every artist, in the pickers' ids", () => {
    expect(rangeToChipFilters(filter)).toEqual({
      artists: ["tripleS", "artms"],
      member: [],
      collectionNo: [],
      season: ["Cream01"],
      class: ["First"],
      on_offline: [],
    });
  });

  test("the chips' own filters apply back unchanged", () => {
    expect(applyChipUpdate(filter, rangeToChipFilters(filter), values)).toEqual(
      filter,
    );
  });

  test("a season picked under an artist that isn't picked adds that artist", () => {
    expect(
      applyChipUpdate(
        { class: ["First"] },
        { season: ["Atom01"], artists: ["tripleS"] },
        values,
      ),
    ).toEqual({ artist: ["triples"], season: ["Atom01"], class: ["First"] });
  });

  test("an artist none of the row's members belong to holds Post back", () => {
    const blockRange = (range: RangeFormFilter) =>
      block({
        offered: offered(1),
        wants: [{ kind: "range", count: 1, ranges: [range] }],
      });
    expect(
      blockRange({ artist: ["triples", "artms"], member: ["JinSoul"] }),
    ).toBe("range_artist_unused");
    expect(
      blockRange({
        artist: ["triples", "artms"],
        member: ["JinSoul", "JiWoo"],
      }),
    ).toBeNull();
  });
});

const offered = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ tokenId: i + 1 }));

// why Post is held back for these values, with nothing refused and no range counted
const block = ({
  offered,
  unitSize,
  wants,
  offeredPayment,
  payment,
}: Pick<
  ListingFormValues,
  "offered" | "unitSize" | "wants" | "offeredPayment" | "payment"
>) =>
  composerBlock({
    offered: offered.length,
    refused: 0,
    wants,
    offeredPayment,
    payment,
    unitSize,
    rangeMatches: [],
    rosters,
    note: "",
  });

const fillers = {
  createdAt: new Date(0),
  updatedAt: new Date(0),
  bumpedAt: new Date(0),
  poster: null,
  cosmoUsername: null,
  rep: null,
  state: { status: "open" },
  stop: null,
} satisfies Omit<
  TradeListing,
  "id" | "items" | "wants" | "payment" | "note" | "unitSize"
>;

describe("payments in the composer", () => {
  const sale = {
    ...listing,
    wants: [],
    payment: {
      side: "to",
      mode: "price_only",
      amount: 300,
      currency: "USD",
      methods: ["paypal_ff", "wise"],
    },
  } satisfies Pick<
    TradeListing,
    "id" | "items" | "wants" | "payment" | "note" | "unitSize"
  >;

  test("a sale prefills its payment as the last row and sends it back unchanged", () => {
    const values = listingToFormValues(sale);
    expect(values.wants).toEqual([{ kind: "payment", amount: "3.00" }]);
    expect(values.payment).toEqual({
      currency: "USD",
      methods: ["paypal_ff", "wise"],
      mode: "price_only",
    });
    const submission = formValuesToInput(
      listingInputSchema.parse(values),
      { kind: "edit", listing: { ...sale, ...fillers } },
      rosters,
    );
    expect(submission.data).toMatchObject({
      wants: [{ kind: "payment", amount: "3.00" }],
      payment: { currency: "USD", methods: ["paypal_ff", "wise"] },
    });
    expect(editListingInputSchema.parse(submission.data).payment).toEqual(
      sale.payment,
    );
  });

  test("a sale that only takes offers keeps no asking price through an edit", () => {
    const offerOnly = {
      ...sale,
      payment: {
        ...sale.payment,
        mode: "offer_only",
        amount: null,
      },
    } satisfies Pick<
      TradeListing,
      "id" | "items" | "wants" | "payment" | "note" | "unitSize"
    >;
    const values = listingToFormValues(offerOnly);
    expect(values.wants).toEqual([{ kind: "payment" }]);
    const submission = formValuesToInput(
      listingInputSchema.parse(values),
      { kind: "edit", listing: { ...offerOnly, ...fillers } },
      rosters,
    );
    expect(editListingInputSchema.parse(submission.data).payment).toEqual(
      offerOnly.payment,
    );
  });

  test.each([
    ["a fixed price keeps its amount", "3", false, "3", "price_only"],
    ["a fixed price keeps an empty amount", "", false, "", "price_only"],
    ["open to offers with a price", "3", true, "3", "price_or_offer"],
    ["open to offers with no price", " ", true, undefined, "offer_only"],
  ] satisfies [
    string,
    string,
    boolean,
    string | undefined,
    ListingOfferMode,
  ][])("%s", (_, typed, open, amount, mode) => {
    expect(claimerPaymentTerms(typed, open)).toEqual({ amount, mode });
  });

  test("the poster's payment on top prefills as offeredPayment", () => {
    const values = listingToFormValues({
      ...listing,
      payment: { ...sale.payment, side: "from" },
    });
    expect(values.offeredPayment).toBe("3.00");
    expect(values.wants.some((want) => want.kind === "payment")).toBe(false);
  });

  test.each([
    ["an amount that doesn't read", "3.001", ["wise"], "payment_amount"],
    ["an empty amount", "", ["wise"], "payment_amount"],
    ["no methods", "3", [], "payment_methods"],
    ["a set payment", "3", ["wise"], null],
    ["no asking price, which only takes offers", undefined, ["wise"], null],
    ["no asking price and no methods", undefined, [], "payment_methods"],
  ] satisfies [string, string | undefined, PaymentMethod[], string | null][])(
    "%s holds Post back as it should",
    (_, amount, methods, expected) => {
      expect(
        block({
          offered: offered(1),
          unitSize: undefined,
          wants: [{ kind: "payment", amount }],
          offeredPayment: undefined,
          payment: { currency: "USD", methods },
        }),
      ).toBe(expected);
    },
  );
});
