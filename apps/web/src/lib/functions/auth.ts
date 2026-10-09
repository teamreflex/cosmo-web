import { auth } from "@/lib/server/auth.server";
import {
  getCosmoAddress,
  linkAccount,
} from "@/lib/server/cosmo-accounts.server";
import { db } from "@/lib/server/db";
import { getCosmoKey } from "@/lib/server/encryption.server";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { importObjektLists } from "@/lib/server/objekts/lists.server";
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
import { isBanActive } from "@apollo/auth/guard";
import { runCosmo } from "@apollo/cosmo/runtime";
import { fetchUserProfile } from "@apollo/cosmo/server/user";
import { user } from "@apollo/database/auth";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Updates the user's settings.
 */
export const $updateSettings = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(settingsSchema)
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
        columns: { userId: true },
        with: { user: { columns: { deletedAt: true } } },
      }),
    ]);

    if (link.kind === "linked") {
      throw new ExpectedError("cosmo_already_linked");
    }

    // a deleted owner is public on the profile, but a ban is only revealed after the bio check
    if (
      owner !== undefined &&
      owner.userId !== null &&
      owner.userId !== userId
    ) {
      throw new ExpectedError(
        owner.user?.deletedAt
          ? "cosmo_account_deleted"
          : "account_linked_elsewhere",
      );
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

    await db.transaction(async (tx) => {
      // lock the caller's live row, so an account deletion can't run alongside the link
      const [caller] = await tx
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.id, userId), isNull(user.deletedAt)))
        .for("share");
      if (!caller) {
        throw new ExpectedError("not_signed_in");
      }

      // the caller has proven control of the account, so they may learn of a ban
      const owner = await tx.query.cosmoAccounts.findFirst({
        where: { address: profile.address },
        columns: { userId: true },
        with: {
          user: {
            columns: { banned: true, banExpires: true, deletedAt: true },
          },
        },
      });
      if (
        owner !== undefined &&
        owner.userId !== null &&
        owner.userId !== userId
      ) {
        if (owner.user?.deletedAt) {
          throw new ExpectedError("cosmo_account_deleted");
        }
        throw new ExpectedError(
          owner.user && isBanActive(owner.user)
            ? "cosmo_account_banned"
            : "account_linked_elsewhere",
        );
      }

      const account = await linkAccount(tx, {
        address: profile.address,
        username: profile.nickname,
        cosmoId: profile.id,
        userId,
        polygonAddress: null,
      });

      // import any existing objekt lists
      await importObjektLists(tx, userId, account.address);
    });

    await clearVerification(userId);
  });
