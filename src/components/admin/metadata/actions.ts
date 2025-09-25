import { sql } from "drizzle-orm";
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import { metadataObjectSchema } from "@/lib/universal/schema/admin";
import { adminMiddleware } from "@/lib/server/middlewares";

/**
 * Bulk inserts objekt metadata.
 */
export const saveMetadata = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator((data) =>
    z
      .object({
        rows: metadataObjectSchema.array(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const result = await db
      .insert(objektMetadata)
      .values(
        data.rows.map((r) => ({
          collectionId: r.collectionId,
          description: r.description,
          contributor: context.cosmo.address,
        }))
      )
      .onConflictDoUpdate({
        target: objektMetadata.collectionId,
        set: {
          description: sql.raw(`excluded.${objektMetadata.description.name}`),
          contributor: context.cosmo.address,
        },
      });

    return result.rowCount;
  });
