"use server";

import { getProfile } from "@/app/data-fetching";
import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import { authenticatedAction } from "@/lib/server/typed-action";
import { ActionError } from "@/lib/server/typed-action/errors";
import { metadataObjectSchema, MetadataRow } from "@/lib/universal/metadata";
import { sql } from "drizzle-orm";
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
      const profile = await getProfile(user.profileId);
      if (profile.isObjektEditor === false) {
        throw new ActionError({
          status: "error",
          error: "Unauthorized",
        });
      }

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
    },
  });
