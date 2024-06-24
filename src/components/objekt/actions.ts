"use server";

import { fetchProfile } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { objektMetadata } from "@/lib/server/db/schema";
import { authenticatedAction } from "@/lib/server/typed-action";
import { AuthenticatedActionError } from "@/lib/server/typed-action/errors";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(3).max(254),
});

/**
 * Update an objekt's metadata.
 */
export const updateObjektMetadata = async (
  collectionSlug: string,
  form: FormData
) =>
  authenticatedAction({
    form,
    schema,
    onAuthenticate: async ({ user }) => {
      const profile = await fetchProfile({
        column: "id",
        identifier: user.profileId,
      });

      if (!profile || !profile.isObjektEditor) {
        throw new AuthenticatedActionError({
          status: "error",
          error: "You do not have permission to edit this collection",
        });
      }
    },
    onValidate: async ({ data: { description }, user }) => {
      const result = await db
        .insert(objektMetadata)
        .values({
          collectionId: collectionSlug,
          description,
          contributor: user.address,
        })
        .onConflictDoUpdate({
          set: {
            description,
            contributor: user.address,
          },
          target: objektMetadata.collectionId,
          where: eq(objektMetadata.collectionId, collectionSlug),
        })
        .returning();

      revalidatePath(`/api/objekts/metadata/${collectionSlug}`);

      return result[0];
    },
  });
