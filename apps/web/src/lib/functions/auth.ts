import { auth } from "@/lib/server/auth.server";
import {
  getCosmoAddress,
  linkOwnerColumns,
  linkVerifiedAccount,
} from "@/lib/server/cosmo-accounts.server";
import { db } from "@/lib/server/db";
import { getCosmoKey } from "@/lib/server/encryption.server";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { assertSupportedCurrency } from "@/lib/server/objekts/fx.server";
import { getProxiedToken } from "@/lib/server/proxied-token.server";
import { getRequestSignal } from "@/lib/server/request.server";
import {
  clearVerification,
  getVerification,
  storeVerification,
} from "@/lib/server/verification-codes.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { settingsSchema } from "@/lib/universal/schema/auth";
import {
  generateVerificationCodeSchema,
  verifyCosmoBioSchema,
} from "@/lib/universal/schema/cosmo";
import { cosmoLinkRefusal } from "@apollo/auth/guard";
import { runCosmo } from "@apollo/cosmo/runtime";
import { fetchUserProfile } from "@apollo/cosmo/server/user";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

/**
 * Updates the user's settings.
 */
export const $updateSettings = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(settingsSchema)
  .handler(async ({ data }) => {
    await assertSupportedCurrency(data.currency);
    await auth.api.updateUser({
      headers: getRequestHeaders(),
      body: {
        gridColumns: data.gridColumns,
        collectionMode: data.collectionMode,
        currency: data.currency,
      },
    });
  });

/**
 * Generate a verification code for linking a COSMO account via bio. Refuses
 * early when the caller or the picked address is already linked; the checks
 * after the bio in `$verifyCosmoBio` are the authoritative ones.
 */
export const $generateVerificationCode = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(generateVerificationCodeSchema)
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const [link, owner] = await Promise.all([
      getCosmoAddress(db, userId),
      db.query.cosmoAccounts.findFirst({
        where: { address: data.address },
        columns: {},
        with: { user: { columns: linkOwnerColumns } },
      }),
    ]);

    if (link.kind === "linked") {
      throw new ExpectedError("cosmo_already_linked");
    }

    const refusal = cosmoLinkRefusal({
      callerId: userId,
      owner: owner?.user ?? null,
      now: new Date(),
    });
    // a ban is only revealed after the bio check
    if (refusal !== null) {
      throw new ExpectedError("account_linked_elsewhere");
    }

    const code = await storeVerification(userId, {
      userId: data.userId,
      artistId: data.artistId,
    });

    return { code };
  });

/**
 * Verify a COSMO account by checking the user's bio contains the verification code.
 */
export const $verifyCosmoBio = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(verifyCosmoBioSchema)
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    if ((await getCosmoAddress(db, userId)).kind === "linked") {
      throw new ExpectedError("cosmo_already_linked");
    }

    // get the stored verification data
    const stored = await getVerification(userId);
    if (!stored) {
      throw new ExpectedError("EXPIRED");
    }

    // validate the code matches what was stored
    if (stored.code !== data.code) {
      throw new ExpectedError("INVALID");
    }

    // fetch the user's profile from cosmo
    const signal = getRequestSignal();
    const [{ accessToken }, key] = await Promise.all([
      getProxiedToken(signal),
      getCosmoKey(),
    ]);
    const profile = await runCosmo(
      fetchUserProfile(accessToken, key, stored.userId, stored.artistId),
      signal,
    );

    // check if the bio contains the verification code
    if (
      !profile.statusMessage?.toLowerCase().includes(data.code.toLowerCase())
    ) {
      throw new ExpectedError("NOT_FOUND");
    }

    await linkVerifiedAccount(userId, {
      address: profile.address,
      username: profile.nickname,
      cosmoId: profile.id,
    });

    await clearVerification(userId);
  });
