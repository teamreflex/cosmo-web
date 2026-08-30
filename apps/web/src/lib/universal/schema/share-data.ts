import { validArtists } from "@apollo/cosmo/types/common";
import { z } from "zod";
import { verifyCosmoSchema } from "./cosmo";

/**
 * A collection that is missing media, bucketed by the kind of data the
 * share-data page can source for it.
 */
export type ScrapeCandidate = {
  collectionId: string;
  type: "motion" | "band" | "audio";
  /** indexer-cased artist, e.g. "triples" */
  artist: string;
  season: string;
};

export const scrapeSelectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("motion"), artistId: z.enum(validArtists) }),
  z.object({ type: z.literal("band"), artistId: z.enum(validArtists) }),
  z.object({
    type: z.literal("audio"),
    artistId: z.enum(validArtists),
    seasons: z.array(z.string()).min(1),
  }),
]);

export type ScrapeSelection = z.infer<typeof scrapeSelectionSchema>;

export const scrapeCollectionMediaSchema = verifyCosmoSchema.extend({
  selection: z.array(scrapeSelectionSchema).min(1),
});
