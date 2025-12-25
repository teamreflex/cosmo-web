import { sql } from "drizzle-orm";
import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { objektMetadata } from "@apollo/database/web/schema";
import { db } from "@/lib/server/db";
import { metadataObjectSchema } from "@/lib/universal/schema/admin";
import { adminMiddleware } from "@/lib/server/middlewares";

/**
 * Bulk inserts objekt metadata.
 */
export const $saveMetadata = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      rows: metadataObjectSchema.array(),
    }),
  )
  .handler(async ({ data, context }) => {
    const result = await db
      .insert(objektMetadata)
      .values(
        data.rows.map((r) => ({
          collectionId: r.collectionId,
          description: r.description,
          contributor: context.cosmo.address,
        })),
      )
      .onConflictDoUpdate({
        target: objektMetadata.collectionId,
        set: {
          description: sql.raw(`excluded.${objektMetadata.description.name}`),
          contributor: context.cosmo.address,
        },
      })
      .returning();

    return result.length;
  });
