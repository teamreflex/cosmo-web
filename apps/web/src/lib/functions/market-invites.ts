import { db } from "@/lib/server/db";
import {
  countInvitesLeft,
  releaseInvite,
  reserveInvite,
} from "@/lib/server/market-invites.server";
import { cosmoMiddleware, staffMiddleware } from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { marketInviteInputSchema } from "@/lib/universal/schema/market-invites";
import { marketAccess } from "@apollo/auth";
import { isBanActive } from "@apollo/auth/guard";
import { user } from "@apollo/database/auth";
import { cosmoAccounts } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

/**
 * How many more users the viewer can invite into the market.
 */
export const $fetchMarketInvitesLeft = createServerFn({ method: "GET" })
  .middleware([staffMiddleware(marketAccess)])
  .handler(async ({ context }) => {
    return await countInvitesLeft(context.session.user.id);
  });

/**
 * Makes the user who linked a COSMO account a tester, spending one of the
 * inviter's invites. Every reason the user can't be invited refuses with the
 * same code, so the dialog never reveals a role or a ban.
 */
export const $inviteToMarket = createServerFn({ method: "POST" })
  .middleware([staffMiddleware(marketAccess), cosmoMiddleware])
  .validator(marketInviteInputSchema)
  .handler(async ({ data, context }) => {
    const inviterId = context.session.user.id;
    await consumeRateLimit({
      key: `market-invite:${inviterId}`,
      limit: 10,
      window: "10 minutes",
    });
    // first, so an inviter with none left can't probe which addresses are linked
    if ((await countInvitesLeft(inviterId)) === 0) {
      throw new ExpectedError("market_invites_exhausted");
    }

    await db.transaction(async (tx) => {
      const [invitee] = await tx
        .select({
          id: user.id,
          role: user.role,
          banned: user.banned,
          banExpires: user.banExpires,
        })
        .from(user)
        .innerJoin(cosmoAccounts, eq(cosmoAccounts.userId, user.id))
        .where(eq(cosmoAccounts.address, data.address))
        .for("no key update", { of: user });
      if (
        invitee === undefined ||
        invitee.role !== "user" ||
        isBanActive(invitee)
      ) {
        throw new ExpectedError("market_invite_unavailable");
      }

      /**
       * Reserved under the invitee's lock, so a parallel invite of the same
       * user waits and then finds a tester. Someone already in the set was
       * demoted by staff since, and that decision stands.
       */
      const reservation = await reserveInvite(inviterId, invitee.id);
      if (reservation === "exhausted") {
        throw new ExpectedError("market_invites_exhausted");
      }
      if (reservation === "already-invited") {
        throw new ExpectedError("market_invite_unavailable");
      }

      try {
        await tx
          .update(user)
          .set({ role: "tester", updatedAt: new Date() })
          .where(eq(user.id, invitee.id));
      } catch (error) {
        await releaseInvite(inviterId, invitee.id);
        throw error;
      }
    });
  });
