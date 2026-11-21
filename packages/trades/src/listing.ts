import { listingOfferModes, type TradeSide } from "@apollo/database/web/types";
import { isDistinct } from "@apollo/util";
import * as z from "zod";
import {
  MAX_BUY_UNITS,
  MAX_CHOICE_OPTIONS,
  MAX_LISTING_OPTIONS,
  MAX_NOTE_LENGTH,
  MAX_OFFERED,
  MAX_PER_ROW,
  MAX_TOTAL_WANTED,
  MAX_WANT_ROWS,
} from "./caps";
import { totalWanted } from "./composer";
import { listingParts, type ListingUnits } from "./lifecycle";
import {
  amountSchema,
  currencySchema,
  type ListingPayment,
  paymentMethodsSchema,
  type PaymentPrice,
  type PaymentTerms,
} from "./payment";
import { pgText, type RangeFilter, rangeKey, rangesSchema } from "./range";

/**
 * The listing types the feed can show: a sale, where the claimer sends
 * nothing but a payment, a buy, where the poster sends nothing but one, and
 * a trade, where both sides send objekts, a payment beside them or not.
 */
export const listingTypes = ["trade", "sell", "buy"] as const;
export type ListingType = (typeof listingTypes)[number];

/**
 * The type (ListingType) of one of a listing's options, from each side's
 * part in its trade (listingParts()): a buy when the poster only pays, a
 * sale when the claimer only pays, else a trade. A buy listing is a buy
 * whichever option is given; how many pool objekts are left never decides
 * it, since a pool listing whose picks are all on their way still offers
 * them.
 */
function listingType(listing: Parameters<typeof listingParts>[0]): ListingType {
  const parts = listingParts(listing);
  if (parts.from === "pay") return "buy";
  return parts.to === "pay" ? "sell" : "trade";
}

/**
 * Every type a listing's options make it, in listingTypes order: a listing
 * whose claimer picks between objekts and a payment alone is both a trade
 * and a sale.
 */
export function listingTypesOf(listing: {
  units: ListingUnits["kind"];
  paymentSide: TradeSide | null;
  options: readonly { objektWants: number }[];
}): ListingType[] {
  const types = new Set(
    listing.options.map(({ objektWants }) =>
      listingType({ ...listing, objektWants }),
    ),
  );
  return listingTypes.filter((type) => types.has(type));
}

/**
 * Listing ids are lowercased, so an uppercase id names the same listing
 * everywhere it's compared, not only in Postgres.
 */
export const listingIdSchema = z.uuid().toLowerCase();

// names one listing: the detail, viewer and withdraw server fns take it
export const listingIdInputSchema = z.strictObject({
  listingId: listingIdSchema,
});

// token ids are stored as Postgres integers
const tokenIdSchema = z.int().positive().max(2_147_483_647);

const countSchema = z
  .int()
  .min(1, "A row needs at least one objekt")
  .max(MAX_PER_ROW, `A row can ask for at most ${MAX_PER_ROW} objekts`);

export const slugSchema = pgText().trim().toLowerCase().min(1).max(255);

const wantSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("exact"),
    slug: slugSchema,
    count: countSchema,
  }),
  z.strictObject({
    kind: z.literal("range"),
    ranges: rangesSchema,
    count: countSchema,
  }),
  z.strictObject({
    kind: z.literal("choice"),
    slugs: z
      .array(slugSchema)
      .min(2, 'An "any of" row needs at least two collections')
      .max(
        MAX_CHOICE_OPTIONS,
        `An "any of" row can name at most ${MAX_CHOICE_OPTIONS} collections`,
      )
      .refine(isDistinct, {
        message: 'Each collection can only be in an "any of" row once',
      }),
    count: countSchema,
  }),
  // what the claimer pays for each unit, left out when it only takes offers
  z.strictObject({
    kind: z.literal("payment"),
    amount: amountSchema.optional(),
  }),
]);

/**
 * One option the claimer can give: want rows that are all required
 * together, at most one of them a payment, with no row repeated (the
 * composer merges repeats into one row's count) and a bounded total.
 */
const optionSchema = z
  .array(wantSchema)
  .min(1, "Ask for at least one objekt or a payment")
  .max(MAX_WANT_ROWS, `An option can have at most ${MAX_WANT_ROWS} rows`)
  .refine(
    (wants) =>
      isDistinct(
        wants.flatMap((want) => (want.kind === "exact" ? [want.slug] : [])),
      ),
    { message: "Ask for each objekt in one row and raise its count instead" },
  )
  .refine(
    (wants) =>
      rangesDistinct(
        wants.flatMap((want) => (want.kind === "range" ? [want.ranges] : [])),
      ),
    { message: "Each range can only be asked for once" },
  )
  .refine(
    (wants) =>
      choicesDistinct(
        wants.flatMap((want) => (want.kind === "choice" ? [want.slugs] : [])),
      ),
    { message: "Each set of collections can only be asked for once" },
  )
  .refine((wants) => totalWanted(wants) <= MAX_TOTAL_WANTED, {
    message: `An option can ask for at most ${MAX_TOTAL_WANTED} objekts in total`,
  })
  .refine(
    (wants) => wants.filter((want) => want.kind === "payment").length <= 1,
    { message: "An option can ask for one payment" },
  );

// one want row of an option, as the schema parses it
export type OptionWant = z.output<typeof wantSchema>;

const sorted = (values: readonly string[]) =>
  values.toSorted((a, b) => (a < b ? -1 : Number(a > b)));

/**
 * What an option asks for as one string, the same for the same rows in any
 * order, so two options asking for the same thing compare equal.
 */
export function optionKey(wants: readonly OptionWant[]) {
  return JSON.stringify(
    sorted(
      wants.map((want) => {
        switch (want.kind) {
          case "exact":
            return `exact ${want.count} ${want.slug}`;
          case "choice":
            return `choice ${want.count} ${sorted(want.slugs).join(" ")}`;
          case "range":
            return `range ${want.count} ${JSON.stringify(sorted(want.ranges.map(rangeKey)))}`;
          case "payment":
            return `payment ${want.amount ?? ""}`;
        }
      }),
    ),
  );
}

const listingFields = {
  // empty on a buy listing, which offers only its payment
  offered: z
    .array(z.strictObject({ tokenId: tokenIdSchema }))
    .max(MAX_OFFERED, `A listing can offer at most ${MAX_OFFERED} objekts`),
  // the offered objekts one unit takes; every one of them when left out
  unitSize: z
    .int()
    .min(1, "Each trade needs at least one of the offered objekts")
    .max(MAX_OFFERED)
    .optional(),
  // the most units a buy listing pays for, in place of offered objekts
  maxUnits: z
    .int()
    .min(1, "Buy at least one")
    .max(MAX_BUY_UNITS, `A listing can buy at most ${MAX_BUY_UNITS}`)
    .optional(),
  // what the claimer can give, of which they pick one
  options: z
    .array(optionSchema)
    .min(1, "Ask for at least one objekt or a payment")
    .max(
      MAX_LISTING_OPTIONS,
      `A listing can have at most ${MAX_LISTING_OPTIONS} options`,
    )
    .superRefine((options, ctx) => {
      const keys = options.map(optionKey);
      keys.forEach((key, index) => {
        if (keys.indexOf(key) < index) {
          ctx.addIssue({
            code: "custom",
            message: "Each option must ask for something different",
            path: [index],
          });
        }
      });
    }),
  // what the poster pays on top of their objekts for each unit, whichever option is given
  offeredPayment: amountSchema.optional(),
  // the currency, methods and offer mode of the listing's payment, on either side
  payment: z
    .strictObject({
      currency: currencySchema,
      methods: paymentMethodsSchema,
      mode: z.enum(listingOfferModes).default("price_only"),
    })
    .optional(),
  note: pgText()
    .trim()
    .max(MAX_NOTE_LENGTH, `A note can be at most ${MAX_NOTE_LENGTH} characters`)
    .nullish()
    .transform((note) => note || null),
};

/**
 * Whether no two range rows hold the same ranges, comparing each row's set
 * of ranges in any order. Rows whose ranges merely overlap are distinct.
 */
export function rangesDistinct(rows: readonly (readonly RangeFilter[])[]) {
  return isDistinct(
    rows.map((ranges) => JSON.stringify(sorted(ranges.map(rangeKey)))),
  );
}

/**
 * Whether no two "any of" rows name the same collections, in any order.
 */
export function choicesDistinct(slugSets: readonly (readonly string[])[]) {
  return isDistinct(slugSets.map((slugs) => sorted(slugs).join(" ")));
}

type ListingTerms = {
  offered: readonly { tokenId: number }[];
  unitSize?: number | undefined;
  maxUnits?: number | undefined;
  options: readonly ListingOptionTerms[];
  payment: PaymentTerms | null;
};

type PaymentFields = {
  options: readonly (readonly OptionWant[])[];
  offeredPayment?: number | undefined;
  payment?:
    | {
        currency: string;
        methods: ListingPayment["methods"];
        mode: PaymentPrice["mode"];
      }
    | undefined;
};

/**
 * One option of a parsed listing: the objekt rows it asks for, and the
 * listing's payment as this option prices it, null when the option asks
 * for none. The poster's payment on top prices every option alike.
 */
export type ListingOptionTerms = {
  wants: Exclude<OptionWant, { kind: "payment" }>[];
  payment: ListingPayment | null;
};

/**
 * Splits a listing's payment out of its options' want rows. A listing has
 * at most one payment, on one side: payment rows the claimer sends, at
 * most one per option, so options may differ in whether they ask for one
 * and for how much, or `offeredPayment` the poster sends on top of their
 * objekts whichever option is given. A payment needs its currency and
 * methods, and only a payment takes them. Only the claimer's payment
 * takes offers, and each of its rows has an asking price unless it only
 * takes offers; the poster's is a fixed price.
 */
function withPaymentRules<TSchema extends z.ZodType<PaymentFields>>(
  schema: TSchema,
) {
  return schema
    .superRefine(({ options, offeredPayment, payment }, ctx) => {
      const rows = options.flatMap((wants, option) =>
        wants.flatMap((want) =>
          want.kind === "payment" ? [{ option, amount: want.amount }] : [],
        ),
      );
      if (rows.length > 0 && offeredPayment !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "A payment can only be on one side",
          path: ["offeredPayment"],
        });
      }
      if (
        (rows.length > 0 || offeredPayment !== undefined) !==
        (payment !== undefined)
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            payment === undefined
              ? "Pick a currency and the payment methods you accept"
              : "Only a listing with a payment takes payment methods",
          path: ["payment"],
        });
      }
      if (payment === undefined) return;
      if (rows.length === 0 && payment.mode !== "price_only") {
        ctx.addIssue({
          code: "custom",
          message: "A payment you add on top has a fixed price",
          path: ["payment", "mode"],
        });
      }
      for (const row of rows) {
        if ((row.amount === undefined) !== (payment.mode === "offer_only")) {
          ctx.addIssue({
            code: "custom",
            message:
              payment.mode === "offer_only"
                ? "A listing that only takes offers has no asking price"
                : "Enter an amount",
            path: ["options", row.option],
          });
        }
      }
    })
    .transform(({ options, offeredPayment, payment, ...rest }) => {
      const side = options.some((wants) =>
        wants.some((want) => want.kind === "payment"),
      )
        ? "to"
        : "from";
      const terms: PaymentTerms | null =
        payment === undefined ? null : { side, ...payment };
      const priced = (amount: number | undefined): ListingPayment | null => {
        if (terms === null) return null;
        if (terms.mode === "offer_only") {
          return { ...terms, mode: terms.mode, amount: null };
        }
        return amount === undefined
          ? null
          : { ...terms, mode: terms.mode, amount };
      };
      return {
        ...rest,
        payment: terms,
        options: options.map((wants): ListingOptionTerms => {
          const row = wants.find((want) => want.kind === "payment");
          return {
            wants: wants.flatMap((want) =>
              want.kind === "payment" ? [] : [want],
            ),
            payment:
              side === "from"
                ? priced(offeredPayment)
                : row === undefined
                  ? null
                  : priced(row.amount),
          };
        }),
      };
    });
}

/**
 * The rules a listing's offered side follows whether it's posted or
 * edited, parsed into its units (ListingUnits). A pool listing offers
 * objekts, none twice, with a unit no bigger than the pool, and offers
 * every objekt as one unit without a unit size. A buy listing offers no
 * objekts and pays for up to `maxUnits` units instead: its payment is the
 * poster's, and every option asks for objekts, since a payment for a
 * payment trades nothing. Each option's rows follow their own rules
 * (optionSchema).
 */
function withListingRules<TSchema extends z.ZodType<ListingTerms>>(
  schema: TSchema,
) {
  return schema
    .superRefine(({ offered, unitSize, maxUnits, options, payment }, ctx) => {
      if (maxUnits === undefined) {
        if (offered.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "Offer at least one objekt",
            path: ["offered"],
          });
        }
        if (!isDistinct(offered.map(({ tokenId }) => tokenId))) {
          ctx.addIssue({
            code: "custom",
            message: "Each objekt can only be offered once",
            path: ["offered"],
          });
        }
        if (unitSize !== undefined && unitSize > offered.length) {
          ctx.addIssue({
            code: "custom",
            message: "A trade can't take more objekts than the listing offers",
            path: ["unitSize"],
          });
        }
        return;
      }
      if (offered.length > 0 || unitSize !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "A listing that buys offers no objekts",
          path: ["maxUnits"],
        });
      }
      if (payment?.side !== "from") {
        ctx.addIssue({
          code: "custom",
          message: "Add the payment you send for each unit",
          path: ["offeredPayment"],
        });
      }
      options.forEach((option, index) => {
        if (option.wants.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "Ask for at least one objekt",
            path: ["options", index],
          });
        }
      });
    })
    .transform(({ unitSize, maxUnits, ...terms }) => {
      const units: ListingUnits =
        maxUnits === undefined
          ? { kind: "pool", unitSize: unitSize ?? terms.offered.length }
          : { kind: "buy", maxUnits };
      return { ...terms, units };
    });
}

/**
 * The composer's offered objekts, checked before Post or Save. An edit names
 * its listing, so objekts live in the listing's own trades pass, as Save
 * lets them.
 */
export const offeredTokensInputSchema = z.strictObject({
  tokenIds: z.array(tokenIdSchema).min(1).max(MAX_OFFERED),
  listingId: listingIdSchema.optional(),
});

/**
 * The composer's greyed-out tokens: an edit names its listing, so the
 * objekts live in its own trades stay pickable.
 */
export const tradeTokenStatesInputSchema = z.strictObject({
  listingId: listingIdSchema.optional(),
});

export const listingInputSchema = withListingRules(
  withPaymentRules(z.strictObject(listingFields)),
);
export type ListingInput = z.output<typeof listingInputSchema>;

export const editListingInputSchema = withListingRules(
  withPaymentRules(
    z.strictObject({ listingId: listingIdSchema, ...listingFields }),
  ),
);
export type EditListingInput = z.output<typeof editListingInputSchema>;

/**
 * Accept: the listing's option the claimer gives, how many units the claim
 * takes, the poster's objekts it picked from the pool (units times the
 * unit size, none on a buy listing), one token list per objekt want row of
 * that option as the picker showed them (each row's count times the units,
 * none for a payment alone), the payment per unit they offer instead of the
 * asking price when the option takes offers on it, and the listing's
 * `updated_at` as the claimer saw it. The row and total caps bound one
 * claim. A unit takes a pool objekt or gives an objekt, so the total cap
 * bounds the units too, and with them the payment it records
 * (MAX_PAYMENT_AMOUNT).
 */
export const claimListingInputSchema = z
  .strictObject({
    listingId: listingIdSchema,
    seen: z.date(),
    option: z
      .int()
      .min(0)
      .max(MAX_LISTING_OPTIONS - 1),
    units: z.int().min(1).max(MAX_TOTAL_WANTED),
    // the payment per unit the claimer offers, on a listing that takes offers on it
    amount: amountSchema.optional(),
    // none on a buy listing, which has no pool
    picked: z.array(tokenIdSchema).max(MAX_OFFERED),
    rows: z
      .array(z.array(tokenIdSchema).min(1).max(MAX_PER_ROW))
      .max(MAX_WANT_ROWS),
  })
  .refine(({ picked }) => isDistinct(picked), {
    message: "Each objekt can only be picked once",
    path: ["picked"],
  })
  .refine(({ rows }) => rows.flat().length <= MAX_TOTAL_WANTED, {
    message: `A claim can give at most ${MAX_TOTAL_WANTED} objekts`,
    path: ["rows"],
  });
export type ClaimListingInput = z.output<typeof claimListingInputSchema>;

/**
 * One side of a direct offer or counter: what the sender gives or gets. Both
 * sides need at least one objekt, since an offer from Trade Matches is a swap.
 */
const offerSideSchema = z
  .array(tokenIdSchema)
  .min(1, "Pick at least one objekt on each side")
  .max(MAX_OFFERED, `An offer can take at most ${MAX_OFFERED} objekts a side`);

const offerFields = { give: offerSideSchema, get: offerSideSchema };

/**
 * No token appears twice in an offer, within a side or across both. The
 * issue points at the side that repeats one: `give` when it repeats its own,
 * else `get`.
 */
function withOfferRules<
  TSchema extends z.ZodType<{
    give: readonly number[];
    get: readonly number[];
  }>,
>(schema: TSchema) {
  return schema.superRefine(({ give, get }, ctx) => {
    if (!isDistinct([...give, ...get])) {
      ctx.addIssue({
        code: "custom",
        message: "Each objekt can only be in an offer once",
        path: [isDistinct(give) ? "get" : "give"],
      });
    }
  });
}

// a direct offer from Trade Matches, sent to the partner's user id
export const offerInputSchema = withOfferRules(
  z.strictObject({ toUserId: z.string().min(1), ...offerFields }),
);
export type OfferInput = z.output<typeof offerInputSchema>;

// a counter to a pending offer, written from the counterer's side
export const counterOfferInputSchema = withOfferRules(
  z.strictObject({ tradeId: z.uuid().toLowerCase(), ...offerFields }),
);
export type CounterOfferInput = z.output<typeof counterOfferInputSchema>;
