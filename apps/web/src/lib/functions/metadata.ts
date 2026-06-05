import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { adminMiddleware } from "@/lib/server/middlewares";
import { getRequestSignal } from "@/lib/server/request.server";
import { fetchMetadataV1 } from "@apollo/cosmo/server/metadata";
import { collections, objekts } from "@apollo/database/indexer/schema";
import { collectionData } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateCollectionMetadataSchema = z.object({
  slug: z.string().min(1),
  description: z.string().max(255).nullable(),
});

export const $updateCollectionMetadata = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateCollectionMetadataSchema)
  .handler(async ({ data, context }) => {
    await db
      .insert(collectionData)
      .values({
        collectionId: data.slug,
        description: data.description,
        contributor: context.cosmo.address,
      })
      .onConflictDoUpdate({
        target: collectionData.collectionId,
        set: { description: data.description },
      });
  });

/**
 * Re-pull a collection's COSMO metadata from v1 and write it back to the indexer
 * `collections` row. Recovers COSMO's occasional collection edits that the
 * indexer's trade-skip no longer captures passively. Collection-only — objekt
 * serial/transferable repair belongs to the scheduled backfill.
 */
export const $refreshCollectionMetadata = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    // resolve a representative token for the collection
    const [row] = await indexer
      .select({ tokenId: objekts.id, collectionId: objekts.collectionId })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(eq(collections.slug, data.slug))
      .limit(1);

    if (!row) {
      throw new Error("Collection not found");
    }

    const metadata = await fetchMetadataV1(
      row.tokenId,
      getRequestSignal(),
    ).catch((error: unknown) => {
      console.error("Failed to fetch metadata:", error);
      throw new Error("Failed to fetch metadata");
    });

    const { objekt } = metadata;
    const artist = objekt.artists[0];
    if (!artist) {
      throw new Error("Invalid metadata: missing artist");
    }

    await indexer
      .update(collections)
      .set({
        season: objekt.season,
        member: objekt.member,
        artist: artist.toLowerCase(),
        collectionNo: objekt.collectionNo,
        class: objekt.class,
        comoAmount: objekt.comoAmount,
        onOffline: objekt.collectionNo.includes("Z") ? "online" : "offline",
        thumbnailImage: objekt.thumbnailImage,
        frontImage: objekt.frontImage,
        backImage: objekt.backImage,
        backgroundColor: objekt.backgroundColor,
        textColor: objekt.textColor,
        accentColor: objekt.accentColor,
      })
      .where(eq(collections.id, row.collectionId));
  });
