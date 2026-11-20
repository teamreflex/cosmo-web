import { listingOfferModes, type TradeSide } from "@apollo/database/web/types";
import { isDistinct } from "@apollo/util";
import * as z from "zod";
import type { TradeWant } from "./allocate";
import {
  MAX_CHOICE_OPTIONS,
  MAX_NOTE_LENGTH,
  MAX_OFFERED,
  MAX_PER_ROW,
  MAX_TOTAL_WANTED,
  MAX_WANT_ROWS,
} from "./caps";
import { totalWanted } from "./composer";
import {
  amountSchema,
  currencySchema,
  type ListingPayment,
  paymentMethodsSchema,
  type PaymentPrice,
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
 * A listing's type (ListingType) from who sends its payment, how many
 * objekt rows it asks for and how many objekts it offers.
 */
export function listingType(listing: {
  paymentSide: TradeSide | null;
  objektWants: number;
  offered: number;
}): ListingType {
  if (listing.paymentSide === "to" && listing.objektWants === 0) return "sell";
  if (listing.paymentSide === "from" && listing.offered === 0) return "buy";
  return "trade";
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

const listingFields = {
  offered: z
    .array(z.strictObject({ tokenId: tokenIdSchema }))
    .min(1, "Offer at least one objekt")
    .max(MAX_OFFERED, `A listing can offer at most ${MAX_OFFERED} objekts`),
  // the offered objekts one unit takes; every one of them when left out
  unitSize: z
    .int()
    .min(1, "Each trade needs at least one of the offered objekts")
    .max(MAX_OFFERED)
    .optional(),
  wants: z
    .array(wantSchema)
    .min(1, "Ask for at least one objekt or a payment")
    .max(MAX_WANT_ROWS, `A listing can have at most ${MAX_WANT_ROWS} rows`),
  // what the poster pays on top of their objekts for each unit
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
    rows.map((ranges) =>
      JSON.stringify(
        ranges.map(rangeKey).toSorted((a, b) => (a < b ? -1 : Number(a > b))),
      ),
    ),
  );
}

/**
 * Whether no two "any of" rows name the same collections, in any order.
 */
export function choicesDistinct(slugSets: readonly (readonly string[])[]) {
  return isDistinct(
    slugSets.map((slugs) =>
      slugs.toSorted((a, b) => (a < b ? -1 : Number(a > b))).join(" "),
    ),
  );
}

type ListingTerms = {
  offered: readonly { tokenId: number }[];
  unitSize?: number | undefined;
  wants: readonly TradeWant[];
};

type PaymentFields = {
  wants: readonly z.output<typeof wantSchema>[];
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
 * Splits a listing's payment out of its want rows. A listing has at most
 * one payment, on one side: a payment row the claimer sends, or
 * `offeredPayment` the poster sends on top of their objekts. A payment
 * needs its currency and methods, and only a payment takes them. Only the
 * claimer's payment takes offers, and it has an asking price unless it
 * only takes offers; the poster's is a fixed price.
 */
function withPaymentRules<TSchema extends z.ZodType<PaymentFields>>(
  schema: TSchema,
) {
  return schema
    .superRefine(({ wants, offeredPayment, payment }, ctx) => {
      const rows = wants.filter((want) => want.kind === "payment").length;
      if (rows > 1) {
        ctx.addIssue({
          code: "custom",
          message: "A listing can ask for one payment",
          path: ["wants"],
        });
      }
      if (rows > 0 && offeredPayment !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "A payment can only be on one side",
          path: ["offeredPayment"],
        });
      }
      if (
        (rows > 0 || offeredPayment !== undefined) !==
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
      const row = wants.find((want) => want.kind === "payment");
      if (payment === undefined) return;
      if (row === undefined) {
        if (payment.mode !== "price_only") {
          ctx.addIssue({
            code: "custom",
            message: "A payment you add on top has a fixed price",
            path: ["payment", "mode"],
          });
        }
        return;
      }
      if ((row.amount === undefined) !== (payment.mode === "offer_only")) {
        ctx.addIssue({
          code: "custom",
          message:
            payment.mode === "offer_only"
              ? "A listing that only takes offers has no asking price"
              : "Enter an amount",
          path: ["wants"],
        });
      }
    })
    .transform(({ wants, offeredPayment, payment, ...rest }) => {
      const row = wants.find((want) => want.kind === "payment");
      const amount = row === undefined ? offeredPayment : row.amount;
      const price: PaymentPrice | null =
        payment?.mode === "offer_only"
          ? { mode: "offer_only", amount: null }
          : amount === undefined || payment === undefined
            ? null
            : { mode: payment.mode, amount };
      return {
        ...rest,
        wants: wants.flatMap((want) => (want.kind === "payment" ? [] : [want])),
        payment:
          price === null || payment === undefined
            ? null
            : ({
                side: row === undefined ? "from" : "to",
                currency: payment.currency,
                methods: payment.methods,
                ...price,
              } satisfies ListingPayment),
      };
    });
}

/**
 * The rules a listing's terms follow whether it's posted or edited: no
 * token offered twice, a unit no bigger than the pool, no row repeated (the
 * composer merges repeats into one row's count), and a bounded total for
 * one unit. A listing without a unit size offers every objekt as one unit.
 */
function withListingRules<TSchema extends z.ZodType<ListingTerms>>(
  schema: TSchema,
) {
  return schema
    .refine(
      ({ offered }) => isDistinct(offered.map(({ tokenId }) => tokenId)),
      { message: "Each objekt can only be offered once", path: ["offered"] },
    )
    .refine(
      ({ offered, unitSize }) =>
        unitSize === undefined || unitSize <= offered.length,
      {
        message: "A trade can't take more objekts than the listing offers",
        path: ["unitSize"],
      },
    )
    .refine(
      ({ wants }) =>
        isDistinct(
          wants.flatMap((want) => (want.kind === "exact" ? [want.slug] : [])),
        ),
      {
        message: "Ask for each objekt in one row and raise its count instead",
        path: ["wants"],
      },
    )
    .refine(
      ({ wants }) =>
        rangesDistinct(
          wants.flatMap((want) => (want.kind === "range" ? [want.ranges] : [])),
        ),
      {
        message: "Each range can only be asked for once",
        path: ["wants"],
      },
    )
    .refine(
      ({ wants }) =>
        choicesDistinct(
          wants.flatMap((want) => (want.kind === "choice" ? [want.slugs] : [])),
        ),
      {
        message: "Each set of collections can only be asked for once",
        path: ["wants"],
      },
    )
    .refine(({ wants }) => totalWanted(wants) <= MAX_TOTAL_WANTED, {
      message: `A listing can ask for at most ${MAX_TOTAL_WANTED} objekts in total`,
      path: ["wants"],
    })
    .transform((terms) => ({
      ...terms,
      unitSize: terms.unitSize ?? terms.offered.length,
    }));
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
 * Accept: how many units the claim takes, the poster's objekts it picked
 * from the pool (units times the unit size), one token list per objekt want
 * row as the picker showed them (each row's count times the units, none
 * for a sale), the payment per unit they offer instead of the asking price
 * when the listing takes offers on it, and the listing's `updated_at` as
 * the claimer saw it. The row and total caps bound one claim, and the unit
 * cap bounds the payment it records (MAX_PAYMENT_AMOUNT).
 */
export const claimListingInputSchema = z
  .strictObject({
    listingId: listingIdSchema,
    seen: z.date(),
    units: z.int().min(1).max(MAX_OFFERED),
    // the payment per unit the claimer offers, on a listing that takes offers on it
    amount: amountSchema.optional(),
    picked: z.array(tokenIdSchema).min(1).max(MAX_OFFERED),
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
