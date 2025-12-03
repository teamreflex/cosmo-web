import * as z from "zod";

const nameSchema = z
  .string()
  .min(3, "Name must be at least 3 characters long")
  .max(24, "Name cannot be longer than 24 characters")
  .refine(
    (value) => /^[a-zA-Z0-9 ]+$/.test(value),
    "Name should only use alphanumeric characters",
  );

export const createObjektListSchema = z.object({
  name: nameSchema,
});

export const updateObjektListSchema = z.object({
  id: z.string().uuid(),
  name: nameSchema,
});

export const deleteObjektListSchema = z.object({
  id: z.string().uuid(),
});

export const addObjektToListSchema = z.object({
  objektListId: z.string().uuid(),
  collectionSlug: z.string(),
});

export const removeObjektFromListSchema = z.object({
  objektListId: z.string().uuid(),
  objektListEntryId: z.string().uuid(),
});

export const generateDiscordListSchema = z.object({
  haveId: z.string().uuid(),
  wantId: z.string().uuid(),
});
