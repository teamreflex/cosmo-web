"use server";

import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import { adminActionClient } from "@/lib/server/server-actions";
import { metadataObjectSchema } from "@/lib/universal/schema/admin";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Bulk inserts objekt metadata.
 */
export const saveMetadata = adminActionClient
  .metadata({ actionName: "saveMetadata" })
  .inputSchema(
    z.object({
      rows: metadataObjectSchema.array(),
    })
  )
  .action(async ({ parsedInput: { rows }, ctx }) => {
    const result = await db
      .insert(objektMetadata)
      .values(
        rows.map((r) => ({
          collectionId: r.collectionId,
          description: r.description,
          contributor: ctx.cosmo.address,
        }))
      )
      .onConflictDoUpdate({
        target: objektMetadata.collectionId,
        set: {
          description: sql.raw(`excluded.${objektMetadata.description.name}`),
          contributor: ctx.cosmo.address,
        },
      });

    // revalidate the metadata path for each row
    for (const row of rows) {
      revalidatePath(`/api/objekts/metadata/${row.collectionId}`);
    }

    return result.rowCount;
  });
