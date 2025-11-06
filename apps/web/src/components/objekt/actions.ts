import { eq } from "drizzle-orm";
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import {
  adminMiddleware,
  authenticatedMiddleware,
} from "@/lib/server/middlewares";
import { metadataObjectSchema } from "@/lib/universal/schema/admin";

/**
 * Update an objekt's metadata.
 */
export const $updateObjektMetadata = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(metadataObjectSchema)
  .handler(async ({ data, context }) => {
    const [result] = await db
      .insert(objektMetadata)
      .values({
        ...data,
        contributor: context.cosmo.address,
      })
      .onConflictDoUpdate({
        set: {
          description: data.description,
          contributor: context.cosmo.address,
        },
        target: objektMetadata.collectionId,
        where: eq(objektMetadata.collectionId, data.collectionId),
      })
      .returning();

    return result;
  });

/**
 * Rescan an objekt's metadata.
 */
export const $rescanObjektMetadata = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ tokenId: z.string() }))
  .handler(() => {
    try {
      // TODO: re-implement this
      // await ofetch<{ message: string }>(
      //   `${env.INDEXER_PROXY_URL}/rescan-metadata/${data.tokenId}`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "proxy-key": env.INDEXER_PROXY_KEY,
      //     },
      //   },
      // );

      return true;
    } catch (e) {
      console.error("Failed to rescan metadata:", e);
      throw new Error("Failed to rescan metadata");
    }
  });
