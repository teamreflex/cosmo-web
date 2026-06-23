import { indexer } from "@/lib/server/db/indexer";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { getRequestSignal } from "@/lib/server/request.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  fetchMetadataV1,
  fetchMetadataV3,
} from "@apollo/cosmo/server/metadata";
import { normalizeV3 } from "@apollo/cosmo/types/metadata";
import { collections, objekts } from "@apollo/database/indexer/schema";
import { slugifyObjekt } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";

/**
 * Rescan an objekt's metadata using the v1 endpoint.
 */
export const $rescanObjektMetadataV1 = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ tokenId: z.string() }))
  .handler(async ({ data }) => {
    try {
      var metadata = await fetchMetadataV1(data.tokenId, getRequestSignal());
    } catch (e) {
      console.error("Failed to fetch metadata:", e);
      throw new ExpectedError("metadata_fetch_failed");
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

/**
 * Rescan an objekt's metadata using the v3 endpoint.
 * Only updates the collection.
 */
export const $rescanObjektMetadataV3 = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ tokenId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const v3 = await fetchMetadataV3(data.tokenId, getRequestSignal());
      var metadata = normalizeV3(v3, data.tokenId);
    } catch (e) {
      console.error("Failed to fetch metadata:", e);
      throw new ExpectedError("metadata_fetch_failed");
    }

    const slug = slugifyObjekt(metadata.objekt.collectionId);
    await indexer
      .update(collections)
      .set({
        thumbnailImage: metadata.objekt.thumbnailImage,
        frontImage: metadata.objekt.frontImage,
        backgroundColor: metadata.objekt.backgroundColor,
        accentColor: metadata.objekt.backgroundColor,
      })
      .where(eq(collections.slug, slug));
  });
