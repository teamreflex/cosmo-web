import type {
  ListingOfferMode,
  PaymentMethod,
} from "@apollo/database/web/types";
import type { ArtistValues } from "@apollo/trades/composer";
import {
  editListingInputSchema,
  listingInputSchema,
} from "@apollo/trades/listing";
import type { ListingPayment, PaymentTerms } from "@apollo/trades/payment";
import { MAX_RANGE_VALUES } from "@apollo/trades/range";
import { describe, expect, test } from "bun:test";
import {
  applyChipUpdate,
  composerBlock,
  emptyListingForm,
  followMaxUnits,
  followUnitSize,
  formValuesToInput,
  type ListingFormValues,
  listingToFormValues,
  paymentPricing,
  type RangeFormFilter,
  rangeToChipFilters,
  stepUnitSize,
} from "../src/lib/universal/trade-listing-form";
import type {
  ListingSize,
  TradeListing,
} from "../src/lib/universal/trade-listings";

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
  units: { kind: "pool", unitSize: 1 },
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
  options: [
    {
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
            {
              ...attributes("atom02-jinsoul-201z", "JinSoul"),
              collection: null,
            },
          ],
        },
      ],
      payment: null,
    },
  ],
} satisfies Pick<TradeListing, "id" | "items" | "options" | "note" | "units">;

describe("composer prefill (CMP-04)", () => {
  const values = listingToFormValues(listing);

  test("the stored terms become the form's values", () => {
    expect(values).toEqual({
      offered: [{ tokenId: 4021 }],
      unitSize: 1,
      options: [
        [
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
        options: [
          [
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
        ],
        note: "serials under 1000",
      },
    });
  });

  test("editing a bundle carries no unit size", () => {
    const bundle = {
      ...listing,
      units: { kind: "pool", unitSize: 2 } satisfies ListingSize,
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
      units: { kind: "pool", unitSize: 2 } satisfies ListingSize,
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
  const blockWants = (wants: ListingFormValues["options"][number]) =>
    block({ offered: offered(1), options: [wants] });
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
        options: [[{ kind: "range", count: 1, ranges: [{ member }] }]],
        note: "",
      }),
      { kind: "create" },
      rosters,
    ).data.options[0]?.[0];

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
        options: [[{ kind: "range", count: 1, ranges: [{ member }] }]],
        offeredPayment: undefined,
        payment: undefined,
        unitSize: undefined,
        maxUnits: undefined,
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
        options: [[{ kind: "range", count: 1, ranges: [range] }]],
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
  maxUnits,
  options,
  offeredPayment,
  payment,
}: Pick<
  ListingFormValues,
  "offered" | "unitSize" | "options" | "offeredPayment" | "payment"
> &
  Partial<Pick<ListingFormValues, "maxUnits">>) =>
  composerBlock({
    offered: offered.length,
    refused: 0,
    options,
    offeredPayment,
    payment,
    unitSize,
    maxUnits,
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
} satisfies Omit<TradeListing, "id" | "items" | "options" | "note" | "units">;

describe("payments in the composer", () => {
  const price = {
    side: "to",
    mode: "price_only",
    amount: 300,
    currency: "USD",
    methods: ["paypal_ff", "wise"],
  } satisfies ListingPayment;
  const terms = {
    side: "to",
    mode: "price_only",
    currency: "USD",
    methods: ["paypal_ff", "wise"],
  } satisfies PaymentTerms;
  const sale = {
    ...listing,
    options: [{ wants: [], payment: price }],
  } satisfies Pick<TradeListing, "id" | "items" | "options" | "note" | "units">;

  test("a sale prefills its payment as the last row and sends it back unchanged", () => {
    const values = listingToFormValues(sale);
    expect(values.options).toEqual([[{ kind: "payment", amount: "3.00" }]]);
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
      options: [[{ kind: "payment", amount: "3.00" }]],
      payment: { currency: "USD", methods: ["paypal_ff", "wise"] },
    });
    const parsed = editListingInputSchema.parse(submission.data);
    expect(parsed.payment).toEqual(terms);
    expect(parsed.options).toEqual(sale.options);
  });

  test("a sale that only takes offers keeps no asking price through an edit", () => {
    const offerOnly = {
      ...sale,
      options: [
        { wants: [], payment: { ...price, mode: "offer_only", amount: null } },
      ],
    } satisfies Pick<
      TradeListing,
      "id" | "items" | "options" | "note" | "units"
    >;
    const values = listingToFormValues(offerOnly);
    expect(values.options).toEqual([[{ kind: "payment" }]]);
    const submission = formValuesToInput(
      listingInputSchema.parse(values),
      { kind: "edit", listing: { ...offerOnly, ...fillers } },
      rosters,
    );
    expect(editListingInputSchema.parse(submission.data).options).toEqual(
      offerOnly.options,
    );
  });

  test.each([
    ["a fixed price keeps its amount", ["3"], false, ["3"], "price_only"],
    ["a fixed price keeps an empty amount", [""], false, [""], "price_only"],
    ["open to offers with a price", ["3"], true, ["3"], "price_or_offer"],
    ["open to offers with no price", [" "], true, [undefined], "offer_only"],
    [
      "open to offers with one option's price typed",
      ["3", ""],
      true,
      ["3", ""],
      "price_or_offer",
    ],
    [
      "open to offers with no option priced",
      ["", " "],
      true,
      [undefined, undefined],
      "offer_only",
    ],
  ] satisfies [
    string,
    string[],
    boolean,
    (string | undefined)[],
    ListingOfferMode,
  ][])("%s", (_, typed, open, amounts, mode) => {
    expect(paymentPricing(typed, open)).toEqual({ amounts, mode });
  });

  test("the poster's payment on top prefills as offeredPayment", () => {
    const onTop = { ...price, side: "from" } satisfies ListingPayment;
    const values = listingToFormValues({
      ...listing,
      options: [
        ...listing.options.map((option) => ({ ...option, payment: onTop })),
        ...listing.options.map((option) => ({
          wants: option.wants.slice(1),
          payment: onTop,
        })),
      ],
    });
    expect(values.offeredPayment).toEqual({ amount: "3.00" });
    expect(values.options.flat().some((want) => want.kind === "payment")).toBe(
      false,
    );
  });

  test("options prefill in order and send back unchanged", () => {
    const special = {
      kind: "range" as const,
      count: 1,
      ranges: [
        {
          artist: [],
          member: [],
          collectionNo: [],
          season: [],
          class: ["Special"],
          on_offline: [],
        },
      ],
    };
    const either = {
      ...listing,
      options: [
        { wants: [special], payment: null },
        { wants: [], payment: price },
      ],
    } satisfies Pick<
      TradeListing,
      "id" | "items" | "options" | "note" | "units"
    >;
    const values = listingToFormValues(either);
    expect(values.options).toEqual([
      [special],
      [{ kind: "payment", amount: "3.00" }],
    ]);
    const submission = formValuesToInput(
      listingInputSchema.parse(values),
      { kind: "edit", listing: { ...either, ...fillers } },
      rosters,
    );
    expect(editListingInputSchema.parse(submission.data).options).toEqual(
      either.options,
    );
  });

  test("an empty option or two alike hold Post back", () => {
    const payment = { currency: "USD", methods: ["wise"] } as const;
    const two = (options: ListingFormValues["options"]) =>
      block({
        offered: offered(1),
        unitSize: undefined,
        options,
        offeredPayment: undefined,
        payment: { ...payment, methods: [...payment.methods] },
      });
    const exact = { kind: "exact" as const, slug: "a", count: 1 };
    expect(two([[exact], []])).toBe("option_empty");
    expect(two([[]])).toBe("wants");
    expect(
      two([
        [exact, { kind: "payment", amount: "3" }],
        [{ kind: "payment", amount: "3.00" }, exact],
      ]),
    ).toBe("option_repeated");
    expect(two([[exact], [{ kind: "payment", amount: "3" }]])).toBeNull();
    expect(two([[exact], [{ kind: "payment", amount: "3.001" }]])).toBe(
      "payment_amount",
    );
    // slugs compare as the schema reads them, and an "any of" row in any order
    expect(two([[exact], [{ ...exact, slug: " A " }]])).toBe("option_repeated");
    const choice = { kind: "choice" as const, slugs: ["a", "b"], count: 1 };
    expect(two([[choice], [{ ...choice, slugs: ["b", "a"] }]])).toBe(
      "option_repeated",
    );
    expect(two([[choice], [{ ...choice, count: 2 }]])).toBeNull();
    // two rows with no asking price ask for the same offer
    expect(
      block({
        offered: offered(1),
        unitSize: undefined,
        options: [
          [{ kind: "payment", amount: undefined }],
          [{ kind: "payment", amount: undefined }],
        ],
        offeredPayment: undefined,
        payment: {
          ...payment,
          methods: [...payment.methods],
          mode: "offer_only",
        },
      }),
    ).toBe("option_repeated");
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
          options: [[{ kind: "payment", amount }]],
          offeredPayment: undefined,
          payment: { currency: "USD", methods },
        }),
      ).toBe(expected);
    },
  );
});

describe("buy listings in the composer", () => {
  const paying = {
    side: "from",
    mode: "price_only",
    amount: 300,
    currency: "USD",
    methods: ["wise"],
  } satisfies ListingPayment;
  const kimlip = {
    kind: "exact" as const,
    count: 1,
    objekt: attributes("atom02-kimlip-201z", "KimLip"),
    collection: null,
  };
  // $3 for each KimLip 201Z, up to three
  const buy = {
    ...listing,
    items: [],
    units: { kind: "buy", maxUnits: 3, taken: 1 },
    options: [{ wants: [kimlip], payment: paying }],
  } satisfies Pick<TradeListing, "id" | "items" | "options" | "note" | "units">;

  test("a buy listing prefills its payment and most units and sends them back unchanged", () => {
    const values = listingToFormValues(buy);
    expect(values).toMatchObject({
      offered: [],
      unitSize: undefined,
      maxUnits: 3,
      offeredPayment: { amount: "3.00" },
      options: [[{ kind: "exact", slug: "atom02-kimlip-201z", count: 1 }]],
    });
    const submission = formValuesToInput(
      listingInputSchema.parse(values),
      { kind: "edit", listing: { ...buy, ...fillers } },
      rosters,
    );
    expect(submission.data).toMatchObject({
      offered: [],
      maxUnits: 3,
      offeredPayment: { amount: "3.00" },
    });
    expect(submission.data).not.toHaveProperty("unitSize");
    expect(editListingInputSchema.parse(submission.data).units).toEqual({
      kind: "buy",
      maxUnits: 3,
    });
  });

  test("a buy listing with no asking price keeps none through an edit", () => {
    const offers = {
      ...buy,
      options: [
        {
          wants: [kimlip],
          payment: { ...paying, mode: "offer_only", amount: null },
        },
      ],
    } satisfies Pick<
      TradeListing,
      "id" | "items" | "options" | "note" | "units"
    >;
    const values = listingToFormValues(offers);
    expect(values).toMatchObject({
      maxUnits: 3,
      offeredPayment: {},
      payment: { mode: "offer_only" },
    });
    const parsed = listingInputSchema.parse(values);
    expect(parsed.options[0]?.payment).toEqual({
      ...paying,
      mode: "offer_only",
      amount: null,
    });
    const submission = formValuesToInput(
      parsed,
      { kind: "edit", listing: { ...offers, ...fillers } },
      rosters,
    );
    expect(submission.data.offeredPayment).toEqual({});
  });

  test.each([
    [
      "a payment with no objekts buys from one",
      [],
      { amount: "3" },
      undefined,
      1,
    ],
    ["it keeps the units it had", [], { amount: "3" }, 4, 4],
    ["a payment with no asking price buys too", [], {}, undefined, 1],
    [
      "objekts beside the payment buy nothing",
      [{ tokenId: 1 }],
      { amount: "3" },
      4,
      undefined,
    ],
    ["no payment buys nothing", [], undefined, 4, undefined],
  ] satisfies [
    string,
    { tokenId: number }[],
    ListingFormValues["offeredPayment"],
    number | undefined,
    number | undefined,
  ][])("%s", (_, offeredTokens, offeredPayment, maxUnits, expected) => {
    expect(
      followMaxUnits(maxUnits, { offered: offeredTokens, offeredPayment }),
    ).toBe(expected);
  });

  test("a buy listing posts with no objekts offered", () => {
    expect(
      block({
        offered: [],
        unitSize: undefined,
        maxUnits: 3,
        options: [[{ kind: "exact", slug: "a", count: 1 }]],
        offeredPayment: { amount: "3" },
        payment: { currency: "USD", methods: ["wise"] },
      }),
    ).toBeNull();
    expect(
      block({
        offered: [],
        unitSize: undefined,
        maxUnits: 3,
        options: [[{ kind: "exact", slug: "a", count: 1 }]],
        offeredPayment: {},
        payment: { currency: "USD", methods: ["wise"], mode: "offer_only" },
      }),
    ).toBeNull();
    expect(
      block({
        offered: [],
        unitSize: undefined,
        options: [[{ kind: "exact", slug: "a", count: 1 }]],
        offeredPayment: undefined,
        payment: undefined,
      }),
    ).toBe("offered");
  });
});
