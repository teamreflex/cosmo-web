"use server";

import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import { authenticatedAction } from "@/lib/server/typed-action";
import { metadataObjectSchema, MetadataRow } from "@/lib/universal/metadata";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Bulk inserts objekt metadata.
 */
export const saveMetadata = async (rows: MetadataRow[]) =>
  authenticatedAction({
    form: { rows },
    schema: z.object({
      rows: metadataObjectSchema.array(),
    }),
    onValidate: async ({ data: { rows }, user }) => {
      await db
        .insert(objektMetadata)
        .values(
          rows.map((r) => ({
            collectionId: r.collectionId,
            description: r.description,
            contributor: user.address,
          }))
        )
        .onConflictDoUpdate({
          target: objektMetadata.collectionId,
          set: {
            description: sql.raw(`excluded.${objektMetadata.description.name}`),
            contributor: user.address,
          },
        });

      // revalidate the metadata path for each row
      for (const row of rows) {
        revalidatePath(`/api/objekts/metadata/${row.collectionId}`);
      }
    },
  });
