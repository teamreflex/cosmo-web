import * as z from "zod";

export const defaultCurrencies = [
  "USD",
  "KRW",
  "EUR",
  "GBP",
  "JPY",
  "RMB",
  "NTD",
  "HKD",
  "SGD",
] as const;

export const listTypes = ["regular", "have", "want", "sale"] as const;
export type ListType = (typeof listTypes)[number];

const nameSchema = z
  .string()
  .min(3, "Name must be at least 3 characters long")
  .max(24, "Name cannot be longer than 24 characters")
  .refine(
    (value) => /^[a-zA-Z0-9 ]+$/.test(value),
    "Name should only use alphanumeric characters",
  );

const currencySchema = z
  .string()
  .length(3, "Currency must be 3 characters")
  .transform((v) => v.toUpperCase());

const descriptionSchema = z
  .string()
  .max(500, "Description cannot be longer than 500 characters");

const baseCreate = z.object({
  name: nameSchema,
  description: descriptionSchema.nullish(),
});

export const createRegularListSchema = baseCreate.extend({
  type: z.literal("regular"),
});

export const createHaveListSchema = baseCreate.extend({
  type: z.literal("have"),
  discoverable: z.boolean(),
  pairListId: z.uuid().nullable(),
});

export const createWantListSchema = baseCreate.extend({
  type: z.literal("want"),
  discoverable: z.boolean(),
  pairListId: z.uuid().nullable(),
});

export const createSaleListSchema = baseCreate.extend({
  type: z.literal("sale"),
  currency: currencySchema,
});

export const createObjektListSchema = z.discriminatedUnion("type", [
  createRegularListSchema,
  createHaveListSchema,
  createWantListSchema,
  createSaleListSchema,
]);

const baseUpdate = z.object({
  id: z.uuid(),
  name: nameSchema,
  description: descriptionSchema.nullish(),
});

export const updateRegularListSchema = baseUpdate.extend({
  type: z.literal("regular"),
});

export const updateHaveListSchema = baseUpdate.extend({
  type: z.literal("have"),
  discoverable: z.boolean(),
  pairListId: z.uuid().nullable(),
});

export const updateWantListSchema = baseUpdate.extend({
  type: z.literal("want"),
  discoverable: z.boolean(),
  pairListId: z.uuid().nullable(),
});

export const updateSaleListSchema = baseUpdate.extend({
  type: z.literal("sale"),
  currency: currencySchema,
});

export const updateObjektListSchema = z.discriminatedUnion("type", [
  updateRegularListSchema,
  updateHaveListSchema,
  updateWantListSchema,
  updateSaleListSchema,
]);

export const deleteObjektListSchema = z.object({
  id: z.uuid(),
});

export const MAX_OBJEKT_SELECTIONS = 500;

export const addObjektsToListSchema = z.object({
  objektListId: z.uuid(),
  slugs: z.array(z.string()).min(1).max(MAX_OBJEKT_SELECTIONS),
});

export const addObjektsToHaveListSchema = z.object({
  objektListId: z.uuid(),
  objekts: z
    .array(
      z.object({
        slug: z.string(),
        collectionId: z.uuid(),
        collectionName: z.string(),
        tokenId: z.string(),
      }),
    )
    .min(1)
    .max(MAX_OBJEKT_SELECTIONS),
});

export const addObjektsToWantListSchema = z.object({
  objektListId: z.uuid(),
  objekts: z
    .array(
      z.object({
        slug: z.string(),
        collectionName: z.string(),
        // want-list entries stack, so one add can represent multiple copies
        quantity: z.number().int().min(1).max(100).default(1),
      }),
    )
    .min(1)
    .max(MAX_OBJEKT_SELECTIONS),
});

const SALE_PRICE_ERROR = "Price must be greater than 0";
export const salePriceSchema = z.number().positive(SALE_PRICE_ERROR).nullable();

export const addObjektsToSaleListSchema = z.object({
  objektListId: z.uuid(),
  entries: z
    .array(
      z.object({
        slug: z.string(),
        collectionId: z.uuid(),
        collectionName: z.string(),
        tokenId: z.string(),
        price: salePriceSchema,
      }),
    )
    .min(1)
    .max(MAX_OBJEKT_SELECTIONS),
});

const updateEntryBase = z.object({
  objektListId: z.uuid(),
  objektListEntryId: z.uuid(),
  price: salePriceSchema,
});

export const updateTokenEntrySchema = updateEntryBase.extend({
  kind: z.literal("token"),
});

export const updateCollectionEntrySchema = updateEntryBase.extend({
  kind: z.literal("collection"),
  quantity: z.number().int().min(1).max(99),
});

export const updateObjektListEntrySchema = z.discriminatedUnion("kind", [
  updateTokenEntrySchema,
  updateCollectionEntrySchema,
]);

export const removeObjektFromListSchema = z.object({
  objektListId: z.uuid(),
  objektListEntryId: z.uuid(),
});

export const saleListFormSchema = z.object({
  rows: z.array(
    z
      .object({
        selected: z.boolean(),
        price: z.number().nullable(),
      })
      .refine(
        (row) => !row.selected || salePriceSchema.safeParse(row.price).success,
        { message: SALE_PRICE_ERROR, path: ["price"] },
      ),
  ),
});
export type SaleListFormValues = z.infer<typeof saleListFormSchema>;

export const findTradePartnersSchema = z.object({
  listId: z.uuid(),
});

export const generateDiscordListSchema = z.object({
  haveId: z.uuid(),
  wantId: z.uuid(),
});
