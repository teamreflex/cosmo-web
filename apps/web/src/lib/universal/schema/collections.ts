import { validOnlineTypes } from "@apollo/cosmo/types/common";
import * as z from "zod";

const colorSchema = z.string().max(8);

export const collectionLookupSchema = z.object({
  season: z.string().min(1),
  member: z.string().min(1),
  collectionNo: z.string().min(1),
});

export type CollectionLookupInput = z.infer<typeof collectionLookupSchema>;

export const updateCollectionSchema = z.object({
  id: z.uuid(),
  artist: z.string().min(1).max(32),
  member: z.string().min(1).max(32),
  season: z.string().min(1).max(32),
  class: z.string().min(1).max(8),
  collectionNo: z.string().min(1).max(8),
  textColor: colorSchema,
  backgroundColor: colorSchema,
  accentColor: colorSchema,
  onOffline: z.enum(validOnlineTypes),
  hasAudio: z.boolean(),
  frontMedia: z.string().max(255).nullable(),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
