import * as z from "zod";

export const defaultCurrencies = ["USD", "KRW", "EUR", "GBP", "JPY"] as const;

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

export const addObjektToListSchema = z.object({
  objektListId: z.uuid(),
  slug: z.string(),
});

export const addObjektToHaveListSchema = z.object({
  objektListId: z.uuid(),
  slug: z.string(),
  collectionName: z.string(),
  collectionId: z.uuid(),
  tokenIds: z.array(z.string()).min(1).max(50),
});

export const addObjektToWantListSchema = z.object({
  objektListId: z.uuid(),
  slug: z.string(),
  collectionName: z.string(),
});

export const addObjektToSaleListSchema = z.object({
  objektListId: z.uuid(),
  slug: z.string(),
  collectionName: z.string(),
  collectionId: z.uuid(),
  entries: z
    .array(
      z.object({
        tokenId: z.string(),
        price: z.number().positive().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

const updateEntryBase = z.object({
  objektListId: z.uuid(),
  objektListEntryId: z.uuid(),
  price: z.number().positive().nullable(),
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

export const findTradePartnersSchema = z.object({
  listId: z.uuid(),
});

export const generateDiscordListSchema = z.object({
  haveId: z.uuid(),
  wantId: z.uuid(),
});
