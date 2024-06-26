"use server";

import { likePost, unlikePost } from "@/lib/server/cosmo/rekord";
import { authenticatedAction } from "@/lib/server/typed-action";
import { z } from "zod";

/**
 * Toggle the like status of the given rekord post.
 */
export const toggleLike = async (form: FormData) =>
  authenticatedAction({
    form,
    schema: z.object({
      postId: z.coerce.number().positive(),
      isLiked: z.coerce.boolean(),
    }),
    onValidate: async ({ data: { postId, isLiked }, user }) => {
      const func = isLiked ? unlikePost : likePost;

      const success = await func(user.accessToken, postId);
      return success || isLiked;
    },
  });
