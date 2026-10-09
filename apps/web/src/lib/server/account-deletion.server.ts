import {
  toDeletionCheck,
  tombstoneEmail,
} from "@/lib/universal/account-deletion";
import type {
  DeleteAccountResult,
  DeletionBlocked,
  DeletionBlocker,
} from "@/lib/universal/account-deletion";
import type { CosmoLink } from "@/lib/universal/cosmo-accounts";
import { ExpectedError } from "@/lib/universal/errors/expected";
import * as authSchema from "@apollo/database/auth";
import {
  binders,
  lists,
  lockedObjekts,
  notifications,
  objektLists,
  pins,
} from "@apollo/database/web/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { clearBinderPinCache } from "./binders.server";
import { getCosmoAddress } from "./cosmo-accounts.server";
import { db, type DbOrTx, type WebTx } from "./db";
import { deleteListMatchNotificationsFrom } from "./objekts/lists.server";
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
 * owner, valid for 24 hours.
 */
export async function createDeletionToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.insert(authSchema.verification).values({
    id: crypto.randomUUID(),
    identifier: deletionTokenIdentifier(token),
    value: userId,
    expiresAt: new Date(now.getTime() + DELETION_TOKEN_TTL),
    createdAt: now,
    updatedAt: now,
  });
  return token;
}

type DeletionOutcome = DeletionBlocked | { status: "deleted"; link: CosmoLink };

/**
 * Delete the account by anonymising it, once the emailed token checks out.
 * The user row is locked first, so a blocker can't appear between the check
 * and the scrub, and a blocked deletion leaves the token for a later attempt.
 */
export async function deleteAccount(
  userId: string,
  token: string,
): Promise<DeleteAccountResult> {
  const result = await db.transaction(async (tx): Promise<DeletionOutcome> => {
    const [caller] = await tx
      .select({ id: authSchema.user.id })
      .from(authSchema.user)
      .where(
        and(eq(authSchema.user.id, userId), isNull(authSchema.user.deletedAt)),
      )
      .for("update");
    if (!caller) {
      throw new ExpectedError("not_signed_in");
    }

    const check = await canDeleteAccount(tx, userId);
    if (check.status === "blocked") {
      return check;
    }

    // expires_at holds UTC without a zone, as drizzle writes a Date, so compare with a Date rather than now()
    const [consumed] = await tx
      .delete(authSchema.verification)
      .where(
        and(
          eq(
            authSchema.verification.identifier,
            deletionTokenIdentifier(token),
          ),
          eq(authSchema.verification.value, userId),
          gt(authSchema.verification.expiresAt, new Date()),
        ),
      )
      .returning({ id: authSchema.verification.id });
    if (!consumed) {
      throw new ExpectedError("account_deletion_link_invalid");
    }

    return { status: "deleted", link: await anonymiseAccount(tx, userId) };
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
 * Scrub the user row and delete everything the user made, keeping the id,
 * settings, ban fields, COSMO link, reports and staff audit rows. The row is
 * never removed, so none of the foreign keys' cascades run; this deletes
 * their data instead. Returns the COSMO link, whose pin cache the caller
 * clears after commit.
 */
export async function anonymiseAccount(
  tx: WebTx,
  userId: string,
): Promise<CosmoLink> {
  const link = await getCosmoAddress(tx, userId);

  await tx
    .delete(authSchema.session)
    .where(eq(authSchema.session.userId, userId));
  await tx
    .delete(authSchema.account)
    .where(eq(authSchema.account.userId, userId));
  await tx
    .delete(authSchema.apikey)
    .where(eq(authSchema.apikey.referenceId, userId));
  // a leftover reset-password token would otherwise re-create a credential
  await tx
    .delete(authSchema.verification)
    .where(eq(authSchema.verification.value, userId));

  await tx.delete(notifications).where(eq(notifications.userId, userId));
  await deleteListMatchNotificationsFrom(tx, userId);

  // entries, binder entries and binder pins cascade
  await tx.delete(objektLists).where(eq(objektLists.userId, userId));
  await tx.delete(binders).where(eq(binders.userId, userId));

  if (link.kind === "linked") {
    await tx.delete(pins).where(eq(pins.address, link.address));
    await tx
      .delete(lockedObjekts)
      .where(eq(lockedObjekts.address, link.address));
    await tx.delete(lists).where(eq(lists.userAddress, link.address));
  }

  await tx
    .update(authSchema.user)
    .set({
      name: "",
      email: tombstoneEmail(userId),
      emailVerified: false,
      image: null,
      username: null,
      displayUsername: null,
      discord: null,
      twitter: null,
      showSocials: false,
      role: "user",
      isAdmin: false,
      deletedAt: new Date(),
    })
    .where(eq(authSchema.user.id, userId));

  return link;
}
