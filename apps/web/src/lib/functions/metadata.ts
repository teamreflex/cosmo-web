import { db } from "@/lib/server/db";
import { cosmoMiddleware, staffMiddleware } from "@/lib/server/middlewares";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { collectionData } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const updateCollectionMetadataSchema = z.object({
  slug: z.string().min(1),
  description: z.string().max(255).nullable(),
});

export const $updateCollectionMetadata = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ site: ["manage"] }), cosmoMiddleware])
  .validator(updateCollectionMetadataSchema)
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      await tx
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

      await recordStaffAudit(tx, {
        staffId: context.session.user.id,
        action: "metadata:update",
        slug: data.slug,
      });
    });
  });
