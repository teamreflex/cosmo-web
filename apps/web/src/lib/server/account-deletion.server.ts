import {
  deletionProofRefusal,
  deletionStep,
  toDeletionCheck,
} from "@/lib/universal/account-deletion";
import type {
  DeleteAccountResult,
  DeletionBlocked,
  DeletionBlocker,
} from "@/lib/universal/account-deletion";
import type { CosmoLink } from "@/lib/universal/cosmo-accounts";
import { ExpectedError } from "@/lib/universal/errors/expected";
import type { DeletionProof } from "@/lib/universal/schema/account";
import { isBanActive } from "@apollo/auth/guard";
import * as authSchema from "@apollo/database/auth";
import {
  cosmoAccounts,
  lists,
  lockedObjekts,
  pins,
} from "@apollo/database/web/schema";
import { and, eq, gt, like } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { clearBinderPinCache } from "./binders.server";
import { recordCosmoLinkChanges } from "./cosmo-accounts.server";
import { db, type DbOrTx, type WebTx } from "./db";
import { clearVerification } from "./verification-codes.server";

type BlockerCheck = (
  executor: DbOrTx,
  userId: string,
) => Promise<DeletionBlocker | null>;

/**
 * Each check returns a blocker or null, and deletion is refused while any
 * returns one.
 */
const blockerChecks: readonly BlockerCheck[] = [];

/**
 * Whether the user may delete their account right now. The checks run one
 * after another, so they can share the caller's transaction.
 */
export async function canDeleteAccount(executor: DbOrTx, userId: string) {
  const results: (DeletionBlocker | null)[] = [];
  for (const check of blockerChecks) {
    results.push(await check(executor, userId));
  }
  return toDeletionCheck(results);
}

const DELETION_TOKEN_TTL = 24 * 60 * 60 * 1000;

function deletionTokenIdentifier(token: string) {
  return `delete-account-${token}`;
}

/**
 * Store a single-use token that proves the emailed link reached the account's
 * owner, valid for 24 hours. It replaces the user's earlier tokens, so only
 * the newest email's link can delete the account. The user row is locked
 * first, so two requests at once can't both keep their token.
 */
export async function createDeletionToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.transaction(async (tx) => {
    const [caller] = await tx
      .select({ id: authSchema.user.id })
      .from(authSchema.user)
      .where(eq(authSchema.user.id, userId))
      .for("update");
    if (!caller) {
      throw new ExpectedError("not_signed_in");
    }

    await tx
      .delete(authSchema.verification)
      .where(
        and(
          like(
            authSchema.verification.identifier,
            deletionTokenIdentifier("%"),
          ),
          eq(authSchema.verification.value, userId),
        ),
      );
    await tx.insert(authSchema.verification).values({
      id: crypto.randomUUID(),
      identifier: deletionTokenIdentifier(token),
      value: userId,
      expiresAt: new Date(now.getTime() + DELETION_TOKEN_TTL),
      createdAt: now,
      updatedAt: now,
    });
  });
  return token;
}

type DeletionOutcome = DeletionBlocked | { status: "deleted"; link: CosmoLink };

/**
 * Delete the account once the proof checks out. The user row is locked first,
 * so a ban, a blocker or a new email can't appear between the checks and the
 * delete, and a blocked deletion leaves the token for a later attempt. An actively banned user can't delete their account, since
 * deleting unlinks their COSMO account for anyone to link again.
 */
export async function deleteAccount(
  { userId, sessionCreatedAt }: { userId: string; sessionCreatedAt: Date },
  proof: DeletionProof,
): Promise<DeleteAccountResult> {
  const result = await db.transaction(async (tx): Promise<DeletionOutcome> => {
    const [caller] = await tx
      .select({
        email: authSchema.user.email,
        banned: authSchema.user.banned,
        banExpires: authSchema.user.banExpires,
      })
      .from(authSchema.user)
      .where(eq(authSchema.user.id, userId))
      .for("update");
    if (!caller) {
      throw new ExpectedError("not_signed_in");
    }
    if (isBanActive(caller)) {
      throw new ExpectedError("account_deletion_banned");
    }

    const check = await canDeleteAccount(tx, userId);
    if (check.status === "blocked") {
      return check;
    }

    const refusal = deletionProofRefusal(
      proof,
      deletionStep(caller.email, sessionCreatedAt, new Date()),
    );
    if (refusal) {
      throw new ExpectedError(refusal);
    }
    if (proof.kind === "email") {
      // expires_at holds UTC without a zone, as drizzle writes a Date, so compare with a Date rather than now()
      const [consumed] = await tx
        .delete(authSchema.verification)
        .where(
          and(
            eq(
              authSchema.verification.identifier,
              deletionTokenIdentifier(proof.token),
            ),
            eq(authSchema.verification.value, userId),
            gt(authSchema.verification.expiresAt, new Date()),
          ),
        )
        .returning({ id: authSchema.verification.id });
      if (!consumed) {
        throw new ExpectedError("account_deletion_link_invalid");
      }
    }

    return { status: "deleted", link: await purgeAccount(tx, userId) };
  });

  if (result.status === "blocked") {
    return result;
  }

  if (result.link.kind === "linked") {
    await clearBinderPinCache(result.link);
  }
  await clearVerification(userId);
  return { status: "deleted" };
}

/**
 * Unlink the user's COSMO account, recording it in the link history, delete
 * what the user row's foreign keys don't reach, then delete the row and let
 * them cascade to sessions, credentials, API keys, lists, binders and the
 * notifications they received or caused. Reports they filed keep a null
 * reporter, and the audit tables keep their id. Returns the COSMO link the
 * user had, whose pin cache the caller clears after commit.
 */
async function purgeAccount(tx: WebTx, userId: string): Promise<CosmoLink> {
  const [unlinked] = await tx
    .update(cosmoAccounts)
    .set({ userId: null })
    .where(eq(cosmoAccounts.userId, userId))
    .returning({
      id: cosmoAccounts.id,
      address: cosmoAccounts.address,
      username: cosmoAccounts.username,
    });

  if (unlinked) {
    await recordCosmoLinkChanges(tx, [
      {
        cosmoAccountId: unlinked.id,
        userId,
        event: "unlinked",
        reason: "account-deleted",
      },
    ]);
    await tx.delete(pins).where(eq(pins.address, unlinked.address));
    await tx
      .delete(lockedObjekts)
      .where(eq(lockedObjekts.address, unlinked.address));
    await tx.delete(lists).where(eq(lists.userAddress, unlinked.address));
  }

  // reset-password and deletion tokens, whose value is the user id
  await tx
    .delete(authSchema.verification)
    .where(eq(authSchema.verification.value, userId));

  await tx.delete(authSchema.user).where(eq(authSchema.user.id, userId));

  return unlinked
    ? { kind: "linked", address: unlinked.address, username: unlinked.username }
    : { kind: "none" };
}
