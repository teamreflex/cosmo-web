import { createAvatar, replaceAvatar } from "@/lib/server/avatar.server";
import { indexer } from "@/lib/server/db/indexer";
import {
  authenticatedMiddleware,
  cosmoMiddleware,
} from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { getRequestSignal } from "@/lib/server/request.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { setProfileImageSchema } from "@/lib/universal/schema/avatar";
import { isSourceFailure } from "@apollo/image/errors";
import { createServerFn } from "@tanstack/react-start";

/**
 * Set the caller's profile picture to a square cropped from the front image
 * of an objekt they own. The crop happens here, from our own copy of the
 * image, so a client can't supply the picture itself.
 */
export const $setProfileImage = createServerFn({ method: "POST" })
  .middleware([cosmoMiddleware])
  .validator(setProfileImageSchema)
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    await consumeRateLimit({
      key: `avatar:${userId}`,
      limit: 5,
      window: "10 minutes",
    });

    const objekt = await indexer.query.objekts.findFirst({
      where: {
        id: String(data.tokenId),
        owner: context.cosmo.address.toLowerCase(),
      },
      columns: { id: true },
      with: {
        collection: {
          columns: { slug: true, frontImage: true, frontImageVersion: true },
        },
      },
    });
    if (objekt === undefined) {
      throw new ExpectedError("objekt_not_owned");
    }

    try {
      var avatar = await createAvatar(
        objekt.collection,
        data.crop,
        getRequestSignal() ?? null,
      );
    } catch (e) {
      // R2 or network failures are genuine and should reach Sentry
      if (e instanceof Error && isSourceFailure(e)) {
        throw new ExpectedError("avatar_source_unavailable");
      }
      throw e;
    }

    await replaceAvatar(userId, avatar);
  });

/**
 * Remove the caller's profile picture, which puts the placeholder back.
 */
export const $removeProfileImage = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    await replaceAvatar(context.session.user.id, null);
  });
