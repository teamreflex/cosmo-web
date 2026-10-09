import { env } from "@/lib/env/server";
import type { AccountErrorCode } from "@/lib/universal/errors/accounts";
import { ExpectedError } from "@/lib/universal/errors/expected";
import type { TransferCosmoAccount } from "@/lib/universal/schema/cosmo-transfer";
import { cosmoTransferRefusal } from "@apollo/auth/guard";
import type { CosmoTransferRefusal } from "@apollo/auth/guard";
import * as authSchema from "@apollo/database/auth";
import { cosmoAccounts, pins } from "@apollo/database/web/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { clearBinderPinCache } from "./binders.server";
import {
  getCosmoAddress,
  recordCosmoLinkChanges,
} from "./cosmo-accounts.server";
import { db } from "./db";
import { recordStaffAudit } from "./staff-audit.server";
import { isPostgresError } from "./util.server";

const refusalErrors = {
  "protected-user": "cosmo_transfer_protected",
  deleted: "cosmo_transfer_deleted",
  banned: "cosmo_transfer_banned",
} satisfies Record<CosmoTransferRefusal, AccountErrorCode>;

/**
 * Move a COSMO link from one user to another, for someone who lost access to
 * the account it was linked to, and record both sides in the link history.
 * Both user rows are locked in id order before the cosmo_account row, the
 * lock order linking and deletion also follow. Only the link moves: lists,
 * binders, token pins and locks stay where they are, but binder pins on the
 * address go, because they point at binders the old owner keeps.
 */
export async function transferCosmoAccount(
  staffId: string,
  input: TransferCosmoAccount,
) {
  const moved = await db.transaction(async (tx) => {
    const users = await tx
      .select({
        id: authSchema.user.id,
        email: authSchema.user.email,
        emailVerified: authSchema.user.emailVerified,
        banned: authSchema.user.banned,
        banExpires: authSchema.user.banExpires,
        deletedAt: authSchema.user.deletedAt,
      })
      .from(authSchema.user)
      .where(inArray(authSchema.user.id, [input.fromUserId, input.toUserId]))
      .orderBy(authSchema.user.id)
      .for("update");

    const to = users.find((user) => user.id === input.toUserId);
    if (!to) {
      throw new ExpectedError("user_not_found");
    }
    // a link can name a user id that no longer exists
    const from = users.find((user) => user.id === input.fromUserId);
    if (!from) {
      throw new ExpectedError("cosmo_transfer_source_changed");
    }

    const [account] = await tx
      .select({
        id: cosmoAccounts.id,
        address: cosmoAccounts.address,
        username: cosmoAccounts.username,
        userId: cosmoAccounts.userId,
      })
      .from(cosmoAccounts)
      .where(eq(cosmoAccounts.address, input.address))
      .for("update");
    if (!account || account.userId !== input.fromUserId) {
      throw new ExpectedError("cosmo_transfer_source_changed");
    }

    const refusal = cosmoTransferRefusal({
      from,
      to,
      protectedDomains: env.PROTECTED_EMAIL_DOMAINS,
      now: new Date(),
    });
    if (refusal !== null) {
      throw new ExpectedError(refusalErrors[refusal]);
    }

    if ((await getCosmoAddress(tx, input.toUserId)).kind === "linked") {
      throw new ExpectedError("cosmo_transfer_target_linked");
    }

    try {
      await tx
        .update(cosmoAccounts)
        .set({ userId: input.toUserId })
        .where(eq(cosmoAccounts.address, account.address));
    } catch (error) {
      if (isPostgresError(error, "23505")) {
        throw new ExpectedError("cosmo_transfer_target_linked");
      }
      throw error;
    }

    await recordCosmoLinkChanges(tx, [
      {
        cosmoAccountId: account.id,
        userId: input.fromUserId,
        event: "unlinked",
        reason: "staff-move",
        staffId,
      },
      {
        cosmoAccountId: account.id,
        userId: input.toUserId,
        event: "linked",
        reason: "staff-move",
        staffId,
      },
    ]);

    await tx
      .delete(pins)
      .where(and(eq(pins.address, account.address), isNotNull(pins.binderId)));

    await recordStaffAudit(tx, {
      staffId,
      action: "cosmo-account:transfer",
      address: account.address,
      detail: {
        kind: "cosmo-transfer",
        username: account.username,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
      },
    });

    return { address: account.address, username: account.username };
  });

  await clearBinderPinCache(moved);
  return moved;
}
