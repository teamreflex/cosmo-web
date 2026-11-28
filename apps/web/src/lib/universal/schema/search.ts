import * as z from "zod";

/**
 * A document of the Typesense `collections` collection: every field the web
 * app reads from a search hit. Typesense leaves out a field whose value is
 * null, so the nullable ones default to it. `createdAt` is epoch
 * milliseconds, where the indexer row holds a timestamp string.
 */
export const collectionDocumentSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  artist: z.string(),
  member: z.string(),
  members: z.array(z.string()),
  season: z.string(),
  class: z.string(),
  collectionNo: z.string(),
  collectionId: z.string(),
  frontImage: z.string(),
  backImage: z.string(),
  frontImageVersion: z.string().nullable().default(null),
  backImageVersion: z.string().nullable().default(null),
  backgroundColor: z.string(),
  textColor: z.string(),
  bandImageUrl: z.string().nullable().default(null),
  frontMedia: z.string().nullable().default(null),
  hasAudio: z.boolean(),
});

export type CollectionDocument = z.infer<typeof collectionDocumentSchema>;
