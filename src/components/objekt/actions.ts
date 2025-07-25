"use server";

import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import { rescanMetadata } from "@/lib/server/objekts/metadata";
import {
  adminActionClient,
  authActionClient,
} from "@/lib/server/server-actions";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

/**
 * Update an objekt's metadata.
 */
export const updateObjektMetadata = adminActionClient
  .metadata({ actionName: "updateObjektMetadata" })
  .inputSchema(
    z.object({
      collectionId: z.string(),
      description: z.string().min(3).max(254),
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

/**
 * Rescan an objekt's metadata.
 */
export const rescanObjektMetadata = authActionClient
  .metadata({ actionName: "rescanObjektMetadata" })
  .inputSchema(
    z.object({
      tokenId: z.string(),
    })
  )
  .action(async ({ parsedInput: { tokenId } }) => {
    return await rescanMetadata(tokenId);
  });
