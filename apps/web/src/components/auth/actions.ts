import { auth } from "@/lib/server/auth";
import { linkAccount } from "@/lib/server/cosmo-accounts";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { importObjektLists } from "@/lib/server/objekts/lists";
import { getProxiedToken } from "@/lib/server/proxied-token";
import {
  clearVerification,
  getVerification,
  storeVerification,
} from "@/lib/server/verification-codes";
import { settingsSchema } from "@/lib/universal/schema/auth";
import {
  generateVerificationCodeSchema,
  verifyCosmoBioSchema,
} from "@/lib/universal/schema/cosmo";
import { fetchUserProfile } from "@apollo/cosmo/server/user";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

/**
 * Updates the user's settings.
 */
export const $updateSettings = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(settingsSchema)
  .handler(async ({ data }) => {
    await auth.api.updateUser({
      headers: getRequestHeaders(),
      body: {
        gridColumns: data.gridColumns,
        collectionMode: data.collectionMode,
      },
    });
  });

/**
 * Generate a verification code for linking a COSMO account via bio.
 */
export const $generateVerificationCode = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(generateVerificationCodeSchema)
  .handler(async ({ data, context }) => {
    const code = await storeVerification(context.session.user.id, {
      userId: data.userId,
      address: data.address,
      nickname: data.nickname,
      artistId: data.artistId,
    });

    return { code };
  });

/**
 * Verify a COSMO account by checking the user's bio contains the verification code.
 */
export const $verifyCosmoBio = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(verifyCosmoBioSchema)
  .handler(async ({ data, context }) => {
    // get the stored verification data
    const stored = await getVerification(context.session.user.id);
    if (!stored) {
      throw new Error("EXPIRED");
    }

    // validate the code matches what was stored
    if (stored.code !== data.code) {
      throw new Error("INVALID");
    }

    // fetch the user's profile from cosmo
    const { accessToken } = await getProxiedToken();
    const profile = await fetchUserProfile(
      accessToken,
      data.userId,
      data.artistId,
    );

    // check if the bio contains the verification code
    if (
      !profile.statusMessage?.toLowerCase().includes(data.code.toLowerCase())
    ) {
      throw new Error("NOT_FOUND");
    }

    // link the account
    const account = await linkAccount({
      address: data.address,
      username: data.nickname,
      cosmoId: data.userId,
      userId: context.session.user.id,
      polygonAddress: null,
    });

    // clear the verification code
    await clearVerification(context.session.user.id);

    // import any existing objekt lists
    await importObjektLists(context.session.user.id, account.address);
  });
