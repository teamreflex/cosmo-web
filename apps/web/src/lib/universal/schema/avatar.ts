import { USER_AVATAR_MAX_ZOOM } from "@apollo/image";
import * as z from "zod";

/**
 * The cropper reports percentages as floats, so a crop at full zoom can land
 * a hair under the narrowest size it allows.
 */
const MIN_CROP_SIZE = 1 / USER_AVATAR_MAX_ZOOM - 0.001;

/**
 * An owned objekt and the square of its front image to use as the caller's
 * profile picture. The crop is in fractions of the image (`AvatarCrop`).
 */
export const setProfileImageSchema = z.object({
  // capped at the integer columns' limit, as trade inputs are
  tokenId: z.int().positive().max(2_147_483_647),
  crop: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    size: z.number().min(MIN_CROP_SIZE).max(1),
  }),
});
