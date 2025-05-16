"use server";

import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import { adminActionClient } from "@/lib/server/server-actions";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { zfd } from "zod-form-data";

/**
 * Update an objekt's metadata.
 */
export const updateObjektMetadata = adminActionClient
  .metadata({ actionName: "updateObjektMetadata" })
  .schema(
    zfd.formData({
      collectionId: zfd.text(),
      description: zfd.text(z.string().min(3).max(254)),
    })
  )
  .action(async ({ parsedInput: { collectionId, description }, ctx }) => {
    const [result] = await db
      .insert(objektMetadata)
      .values({
        collectionId,
        description,
        contributor: ctx.cosmo.address,
      })
      .onConflictDoUpdate({
        set: {
          description,
          contributor: ctx.cosmo.address,
        },
        target: objektMetadata.collectionId,
        where: eq(objektMetadata.collectionId, collectionId),
      })
      .returning();

    revalidatePath(`/api/objekts/metadata/${collectionId}`);
    revalidateTag(collectionId);

    return result;
  });
