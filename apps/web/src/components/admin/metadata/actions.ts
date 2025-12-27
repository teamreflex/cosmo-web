import { sql } from "drizzle-orm";
import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { collectionData } from "@apollo/database/web/schema";
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
  .handler(async ({ data }) => {
    const result = await db
      .insert(collectionData)
      .values(
        data.rows.map((r) => ({
          collectionId: r.collectionId,
          description: r.description,
        })),
      )
      .onConflictDoUpdate({
        target: collectionData.collectionId,
        set: {
          description: sql.raw(`excluded.${collectionData.description.name}`),
        },
      })
      .returning();

    return result.length;
  });
