import { collectionData } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "./db";
import { adminMiddleware } from "./middlewares";

const updateCollectionMetadataSchema = z.object({
  slug: z.string().min(1),
  description: z.string().max(255).nullable(),
});

export const $updateCollectionMetadata = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateCollectionMetadataSchema)
  .handler(async ({ data, context }) => {
    await db
      .insert(collectionData)
      .values({
        collectionId: data.slug,
        description: data.description,
        contributor: context.cosmo.address,
      })
      .onConflictDoUpdate({
        target: collectionData.collectionId,
        set: { description: data.description },
      });
  });
