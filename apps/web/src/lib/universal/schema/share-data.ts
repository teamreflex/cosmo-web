import { z } from "zod";

export const collectionMediaSchema = z.object({
  slug: z.string(),
  artistName: z.string(),
  frontMedia: z.url().nullable(),
  bandImageUrl: z.url().nullable(),
});

export type CollectionMedia = z.infer<typeof collectionMediaSchema>;

export const submitShareDataSchema = z.object({
  collections: z.array(collectionMediaSchema),
});

export type SubmitShareData = z.infer<typeof submitShareDataSchema>;
