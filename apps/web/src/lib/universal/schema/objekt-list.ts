import * as z from "zod";

export const defaultCurrencies = ["USD", "KRW", "EUR", "GBP", "JPY"] as const;

export const listTypes = ["regular", "have", "want"] as const;
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
  .length(3)
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
  currency: currencySchema.nullish(),
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

export const createObjektListSchema = z.discriminatedUnion("type", [
  createRegularListSchema,
  createHaveListSchema,
  createWantListSchema,
]);

const baseUpdate = z.object({
  id: z.uuid(),
  name: nameSchema,
  description: descriptionSchema.nullish(),
});

export const updateRegularListSchema = baseUpdate.extend({
  type: z.literal("regular"),
  currency: currencySchema.nullish(),
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

export const updateObjektListSchema = z.discriminatedUnion("type", [
  updateRegularListSchema,
  updateHaveListSchema,
  updateWantListSchema,
]);

export const deleteObjektListSchema = z.object({
  id: z.uuid(),
});

export const addObjektToListSchema = z.object({
  objektListId: z.uuid(),
  collectionSlug: z.string(),
});

export const addObjektToLiveListSchema = z.object({
  objektListId: z.uuid(),
  collectionSlug: z.string(),
  collectionId: z.string(),
});

export const addObjektToSaleListSchema = z.object({
  objektListId: z.uuid(),
  collectionSlug: z.string(),
  quantity: z.number().int().min(1).max(99),
  price: z.number().min(0).nullish(),
});

export const updateObjektListEntrySchema = z.object({
  objektListId: z.uuid(),
  objektListEntryId: z.uuid(),
  quantity: z.number().int().min(1).max(99),
  price: z.number().min(0).nullish(),
});

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
