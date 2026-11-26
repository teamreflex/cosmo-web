import { Effect } from "effect";
import sharp from "sharp";
import { ImageProcessError } from "./errors";
import { type AvatarCrop, avatarCropRect, USER_AVATAR_SIZE } from "./index";

const AVATAR_QUALITY = 85;

/**
 * Crop a square out of an image and encode it as a WebP profile picture.
 * sharp does it because Bun.Image has no crop. `sourceUrl` only names the
 * image in a failure.
 */
export const renderUserAvatar = Effect.fn("Image.renderAvatar")(function* (
  source: Uint8Array,
  crop: AvatarCrop,
  sourceUrl: string,
) {
  return yield* Effect.tryPromise({
    try: async () => {
      const image = sharp(source);
      return await image
        .extract(avatarCropRect(crop, await image.metadata()))
        .resize(USER_AVATAR_SIZE, USER_AVATAR_SIZE)
        .webp({ quality: AVATAR_QUALITY })
        .toBuffer();
    },
    catch: (cause) => new ImageProcessError({ url: sourceUrl, cause }),
  });
});
