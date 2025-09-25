import { eq } from "drizzle-orm";
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import { rescanMetadata } from "@/lib/server/objekts/metadata";
import {
  adminMiddleware,
  authenticatedMiddleware,
} from "@/lib/server/middlewares";
import { metadataObjectSchema } from "@/lib/universal/schema/admin";

/**
 * Update an objekt's metadata.
 */
export const updateObjektMetadata = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data) => metadataObjectSchema.parse(data))
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
export const rescanObjektMetadata = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator((data) => z.object({ tokenId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return await rescanMetadata(data.tokenId);
  });
