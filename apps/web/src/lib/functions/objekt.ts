import { indexer } from "@/lib/server/db/indexer";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { fetchMetadataV1 } from "@apollo/cosmo/server/metadata";
import { collections, objekts } from "@apollo/database/indexer/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";

/**
 * Rescan an objekt's metadata.
 */
export const $rescanObjektMetadata = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ tokenId: z.string() }))
  .handler(async ({ data }) => {
    try {
      var metadata = await fetchMetadataV1(data.tokenId);
    } catch (e) {
      console.error("Failed to fetch metadata:", e);
      throw new Error("Failed to fetch metadata");
    }

    await indexer.transaction(async (tx) => {
      // update objekt to fix transferable and serial
      const [objekt] = await tx
        .update(objekts)
        .set({
          transferable: metadata.objekt.transferable,
          serial: metadata.objekt.objektNo,
        })
        .where(eq(objekts.id, data.tokenId))
        .returning();

      if (!objekt) {
        throw new Error("Objekt not found");
      }

      // update collection in case of any changes
      await tx
        .update(collections)
        .set({
          thumbnailImage: metadata.objekt.thumbnailImage,
          frontImage: metadata.objekt.frontImage,
          backImage: metadata.objekt.backImage,
          backgroundColor: metadata.objekt.backgroundColor,
          textColor: metadata.objekt.textColor,
          accentColor: metadata.objekt.accentColor,
        })
        .where(eq(collections.id, objekt.collectionId));
    });
  });
