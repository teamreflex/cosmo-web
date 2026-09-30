import {
  binderLayouts,
  MAX_BINDER_PAGES,
  binderGrid,
  fullHexColour,
} from "@/lib/universal/binders";
import * as z from "zod";
import { listNameSchema } from "./objekt-list";

// the #rgb shorthand is stored as #rrggbb
const colourSchema = z
  .string()
  .overwrite((value) => fullHexColour(value) ?? value)
  .regex(/^#[0-9a-f]{6}$/, "Colour must be a hex colour like #1a2b3c");

const tokenIdSchema = z.number().int().nonnegative();

const MAX_POCKETS_PER_PAGE = Math.max(
  ...binderLayouts.map((layout) => binderGrid(layout).pocketsPerPage),
);

/**
 * Loose pocket bounds; the exact slot bound depends on the binder's layout and
 * is checked on the server.
 */
const pocketSchema = z.object({
  page: z
    .number()
    .int()
    .min(0)
    .max(MAX_BINDER_PAGES - 1),
  slot: z
    .number()
    .int()
    .min(0)
    .max(MAX_POCKETS_PER_PAGE - 1),
});

export const createBinderSchema = z.object({
  name: listNameSchema,
  layout: z.enum(binderLayouts),
  colour: colourSchema,
});

export type CreateBinder = z.infer<typeof createBinderSchema>;

/**
 * Every field but the id is optional, so each editor control can send only
 * what it changes. A null cover falls back to the page 1 collage.
 */
export const updateBinderSchema = z.object({
  binderId: z.uuid(),
  name: listNameSchema.optional(),
  colour: colourSchema.optional(),
  layout: z.enum(binderLayouts).optional(),
  coverTokenId: tokenIdSchema.nullable().optional(),
});

export type UpdateBinder = z.infer<typeof updateBinderSchema>;

export const binderIdSchema = z.object({
  binderId: z.uuid(),
});

export type BinderId = z.infer<typeof binderIdSchema>;

export const placeObjektSchema = pocketSchema.extend({
  binderId: z.uuid(),
  tokenId: tokenIdSchema,
});

export type PlaceObjekt = z.infer<typeof placeObjektSchema>;

export const clearPocketSchema = pocketSchema.extend({
  binderId: z.uuid(),
});

export type ClearPocket = z.infer<typeof clearPocketSchema>;

export const swapPocketsSchema = z.object({
  binderId: z.uuid(),
  from: pocketSchema,
  to: pocketSchema,
});

export type SwapPockets = z.infer<typeof swapPocketsSchema>;

export const addToBinderSchema = z.object({
  binderId: z.uuid(),
  tokenId: tokenIdSchema,
});

export type AddToBinder = z.infer<typeof addToBinderSchema>;

export const binderMenuSchema = z.object({
  tokenId: tokenIdSchema,
});

export type BinderMenu = z.infer<typeof binderMenuSchema>;
