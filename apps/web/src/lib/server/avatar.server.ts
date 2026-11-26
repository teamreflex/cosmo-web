import { db } from "@/lib/server/db";
import { r2 } from "@/lib/server/r2.server";
import { user } from "@apollo/database/web/schema";
import {
  type AvatarCrop,
  objektFrontImageRef,
  objektImageKey,
  userAvatarKey,
} from "@apollo/image";
import { renderUserAvatar } from "@apollo/image/avatar";
import { runImage } from "@apollo/image/runtime";
import { fetchObjektImageSource } from "@apollo/image/server";
import { eq } from "drizzle-orm";

type FrontImage = {
  slug: string;
  frontImage: string;
  frontImageVersion: string | null;
};

/**
 * A collection's full-size front image, from the R2 mirror when it holds one
 * and from COSMO otherwise.
 */
async function readFrontImage(
  collection: FrontImage,
  signal: AbortSignal | null,
) {
  const ref = objektFrontImageRef(collection);
  if (ref !== null) {
    const mirrored = r2.file(objektImageKey(ref, "original"));
    if (await mirrored.exists()) {
      return await mirrored.bytes();
    }
  }
  return await runImage(fetchObjektImageSource(collection.frontImage), signal);
}

/**
 * Crop a collection's front image into a new profile picture, write it to R2
 * under a random key and return that key.
 */
export async function createAvatar(
  collection: FrontImage,
  crop: AvatarCrop,
  signal: AbortSignal | null,
) {
  const source = await readFrontImage(collection, signal);
  const picture = await runImage(
    renderUserAvatar(source, crop, collection.frontImage),
    signal,
  );

  const key = userAvatarKey(crypto.randomUUID());
  await r2.write(key, picture, { type: "image/webp" });
  return key;
}

/**
 * Point a user at a new profile picture, or at none, then delete the picture
 * it replaces. The old key is read under the user's lock, so two saves at once
 * each delete what they replaced and none is left behind in R2.
 */
export async function replaceAvatar(userId: string, avatar: string | null) {
  const previous = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ avatar: user.avatar })
      .from(user)
      .where(eq(user.id, userId))
      .for("no key update");

    await tx
      .update(user)
      .set({ avatar, updatedAt: new Date() })
      .where(eq(user.id, userId));
    return current?.avatar ?? null;
  });

  if (previous !== null) {
    await deleteAvatar(previous);
  }
}

/**
 * Delete a profile picture from R2.
 */
export async function deleteAvatar(avatar: string) {
  await r2.delete(avatar);
}
