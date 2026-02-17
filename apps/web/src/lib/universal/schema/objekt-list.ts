import * as z from "zod";

export const defaultCurrencies = ["USD", "KRW", "EUR", "GBP", "JPY"] as const;

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

export const createObjektListSchema = z.object({
  name: nameSchema,
  currency: currencySchema.nullish(),
});

export const updateObjektListSchema = z.object({
  id: z.string().uuid(),
  name: nameSchema,
  currency: currencySchema.nullish(),
});

export const deleteObjektListSchema = z.object({
  id: z.string().uuid(),
});

export const addObjektToListSchema = z.object({
  objektListId: z.string().uuid(),
  collectionSlug: z.string(),
});

export const addObjektToSaleListSchema = z.object({
  objektListId: z.string().uuid(),
  collectionSlug: z.string(),
  quantity: z.number().int().min(1).max(99),
  price: z.number().min(0).nullish(),
});

export const updateObjektListEntrySchema = z.object({
  objektListId: z.string().uuid(),
  objektListEntryId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  price: z.number().min(0).nullish(),
});

export const removeObjektFromListSchema = z.object({
  objektListId: z.string().uuid(),
  objektListEntryId: z.string().uuid(),
});

export const generateDiscordListSchema = z.object({
  haveId: z.string().uuid(),
  wantId: z.string().uuid(),
});
