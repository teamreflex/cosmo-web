import { cosmoLinkRefusal } from "@apollo/auth/guard";
import type { CosmoLinkOwner, CosmoLinkRefusal } from "@apollo/auth/guard";
import { CosmoApiError, CosmoDecodeError } from "@apollo/cosmo/errors";
import { runCosmo } from "@apollo/cosmo/runtime";
import { fetchByNickname } from "@apollo/cosmo/server/user";
import type { CosmoSearchResult } from "@apollo/cosmo/types/user";
import * as authSchema from "@apollo/database/auth";
import { cosmoAccounts, cosmoLinkAudit } from "@apollo/database/web/schema";
import type { CosmoAccount, CosmoLinkEvent } from "@apollo/database/web/types";
import { addr, isAddress } from "@apollo/util";
import { and, eq, isNull, like, sql } from "drizzle-orm";
import type {
  CosmoLink,
  FullAccount,
  PublicCosmo,
} from "../universal/cosmo-accounts";
import type { AccountErrorCode } from "../universal/errors/accounts";
import { ExpectedError } from "../universal/errors/expected";
import { toPublicUser } from "./auth.server";
import { db, type DbOrTx, type WebTx } from "./db";
import { importObjektLists } from "./objekts/lists.server";
import { isPostgresError } from "./util.server";

/**
 * The one place to read a user's linked COSMO address. The address keeps its
 * stored case, so compare it against indexer rows with isEqual() or addr().
 */
export async function getCosmoAddress(
  executor: DbOrTx,
  userId: string,
): Promise<CosmoLink> {
  const cosmo = await executor.query.cosmoAccounts.findFirst({
    where: { userId },
    columns: { address: true, username: true },
  });

  return cosmo ? { kind: "linked", ...cosmo } : { kind: "none" };
}

/**
 * Fetch a full account from the database.
 * This includes the user, locked objekts and pins.
 */
export async function fetchFullAccount(
  identifier: string,
  signal?: AbortSignal,
): Promise<FullAccount | undefined> {
  const identifierIsAddress = isAddress(identifier);

  // check db for a profile
  const column = identifierIsAddress ? "address" : "username";
  const result = await db.query.cosmoAccounts.findFirst({
    where: { [column]: decodeURIComponent(identifier) },
    with: {
      user: true,
      lockedObjekts: true,
      pins: true,
    },
  });

  // found a cosmo account
  if (result) {
    const { user, ...cosmoResult } = result;
    const { lockedObjekts, pins, ...cosmo } = cosmoResult;

    return {
      cosmo: toPublicCosmo(cosmo),
      user: toPublicUser(user ?? undefined),
      lockedObjekts: lockedObjekts
        .filter((o) => o.locked)
        .map((o) => o.tokenId),
      pins: pins.map((p) => p.tokenId).filter((id) => id !== null),
      verified: cosmo.userId !== null,
    };
  }

  // if no cosmo account and it's an address, make a fake one
  if (identifierIsAddress) {
    return {
      cosmo: {
        ...toPublicCosmo({
          username: identifier.substring(0, 6),
          address: identifier,
        }),
        isAddress: true,
      } satisfies PublicCosmo,
      user: undefined,
      lockedObjekts: [],
      pins: [],
      verified: false,
    };
  }

  // attempt to fetch from cosmo
  try {
    const user = await runCosmo(fetchByNickname(identifier), signal);

    // cache & upsert profile
    await cacheAccounts([
      {
        address: user.address,
        username: user.nickname,
        polygonAddress: null,
      },
    ]);

    return await fetchFullAccount(user.nickname, signal);
  } catch (err) {
    // a decode failure means COSMO changed their response shape, not a missing user
    if (err instanceof CosmoDecodeError) throw err;

    if (err instanceof CosmoApiError && err.status !== 404) {
      console.error(`[fetchFullAccount] ${err.status} from COSMO`, err);
    }

    // couldn't find any user
    return undefined;
  }
}

/**
 * A change to which user a COSMO account is linked to, as the link history
 * records it. Only a staff move names the staff member.
 */
export type CosmoLinkChange = { cosmoAccountId: number; userId: string } & (
  | { event: "linked"; reason: "verified" }
  | { event: "unlinked"; reason: "account-deleted" }
  | { event: CosmoLinkEvent; reason: "staff-move"; staffId: string }
);

/**
 * Append to the link history, in the transaction that changes the link.
 */
export async function recordCosmoLinkChanges(
  tx: WebTx,
  changes: [CosmoLinkChange, ...CosmoLinkChange[]],
) {
  await tx.insert(cosmoLinkAudit).values(changes);
}

/**
 * Upsert a COSMO account into the database, link it to a user and record the
 * link. Used when verifying ownership of a COSMO account. The upsert only
 * takes an unlinked address, and the unique user_id index refuses a second
 * link for the same user.
 */
export async function linkAccount(
  tx: WebTx,
  account: Omit<CosmoAccount, "id" | "userId"> & { userId: string },
) {
  try {
    const [result] = await tx
      .insert(cosmoAccounts)
      .values(account)
      .onConflictDoUpdate({
        target: cosmoAccounts.address,
        set: {
          username: account.username,
          cosmoId: account.cosmoId,
          userId: account.userId,
        },
        setWhere: isNull(cosmoAccounts.userId),
      })
      .returning();

    if (!result) {
      // held by another user, or by the caller after a concurrent link
      const holder = await tx.query.cosmoAccounts.findFirst({
        where: { address: account.address },
        columns: { userId: true },
      });
      throw new ExpectedError(
        holder?.userId === account.userId
          ? "cosmo_already_linked"
          : "account_linked_elsewhere",
      );
    }

    await recordCosmoLinkChanges(tx, [
      {
        cosmoAccountId: result.id,
        userId: account.userId,
        event: "linked",
        reason: "verified",
      },
    ]);

    return result;
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      throw new ExpectedError("cosmo_already_linked");
    }
    throw error;
  }
}

/**
 * The owner columns `cosmoLinkRefusal` reads.
 */
export const linkOwnerColumns = {
  id: true,
  banned: true,
  banExpires: true,
} satisfies Record<keyof CosmoLinkOwner, true>;

const linkRefusalErrors = {
  "linked-elsewhere": "account_linked_elsewhere",
  banned: "cosmo_account_banned",
} satisfies Record<CosmoLinkRefusal, AccountErrorCode>;

/**
 * Link a COSMO account to a user who has proven they control it through its
 * bio, and copy the address's legacy lists onto them. Having proven control,
 * the user may learn that the address belongs to a banned user.
 */
export async function linkVerifiedAccount(
  userId: string,
  account: Pick<CosmoAccount, "address" | "username" | "cosmoId">,
) {
  await db.transaction(async (tx) => {
    // lock the caller's live row, so an account deletion can't run alongside the link
    const [caller] = await tx
      .select({ id: authSchema.user.id })
      .from(authSchema.user)
      .where(
        and(eq(authSchema.user.id, userId), isNull(authSchema.user.deletedAt)),
      )
      .for("share");
    if (!caller) {
      throw new ExpectedError("not_signed_in");
    }

    const owner = await tx.query.cosmoAccounts.findFirst({
      where: { address: account.address },
      columns: {},
      with: { user: { columns: linkOwnerColumns } },
    });
    const refusal = cosmoLinkRefusal({
      callerId: userId,
      owner: owner?.user ?? null,
      now: new Date(),
    });
    if (refusal !== null) {
      throw new ExpectedError(linkRefusalErrors[refusal]);
    }

    const linked = await linkAccount(tx, {
      ...account,
      userId,
      polygonAddress: null,
    });

    await importObjektLists(tx, userId, linked.address);
  });
}

type PartialAccount = Omit<CosmoAccount, "id" | "cosmoId" | "userId">;

/**
 * Upsert COSMO accounts into the database without linking it to a user.
 * Used when caching profiles from `/@:username` and search results.
 */
export async function cacheAccounts(accounts: PartialAccount[]) {
  // deduplicate accounts by address to prevent constraint violations
  const uniqueAccounts = accounts.reduce((acc, account) => {
    acc.set(account.address, account);
    return acc;
  }, new Map<string, PartialAccount>());

  if (uniqueAccounts.size === 0) {
    return [];
  }

  return await db
    .insert(cosmoAccounts)
    .values(Array.from(uniqueAccounts.values()))
    .onConflictDoUpdate({
      target: cosmoAccounts.address,
      set: {
        username: sql.raw(`excluded.${cosmoAccounts.username.name}`),
      },
    })
    .returning();
}

/**
 * Search the database for accounts with a username starting with the query.
 * Fallback for when the COSMO user search API is unavailable.
 */
export async function searchCosmoAccounts(
  query: string,
): Promise<CosmoSearchResult> {
  if (query.length < 2) {
    return { hasNext: false, nextStartAfter: null, results: [] };
  }

  const users = await db
    .select({
      cosmoId: cosmoAccounts.cosmoId,
      username: cosmoAccounts.username,
      address: cosmoAccounts.address,
    })
    .from(cosmoAccounts)
    .where(like(cosmoAccounts.username, `${query}%`))
    .limit(100);

  return {
    hasNext: false,
    nextStartAfter: null,
    results: users.map((result) => ({
      id: result.cosmoId ?? 0,
      nickname: result.username,
      address: result.address,
      profileImageUrl: "",
      userProfiles: [],
    })),
  };
}

/**
 * Fetch all known addresses from the database.
 * Returns a Map with lowercase addresses as keys for O(1) lookups.
 */
export async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) {
    return new Map<string, { address: string; username: string }>();
  }

  // fetch known profiles
  const results = await db.query.cosmoAccounts.findMany({
    where: {
      address: {
        in: addresses,
      },
    },
    columns: {
      address: true,
      username: true,
    },
  });

  // convert to Map for O(1) lookups
  return new Map(results.map((a) => [addr(a.address), a]));
}

/**
 * Fetch all known Polygon-era addresses from the database.
 * COSMO issued each account a new address when it moved to Abstract, so
 * anything read out of the Polygon archive resolves against the old one.
 */
export async function fetchKnownPolygonAddresses(addresses: string[]) {
  if (addresses.length === 0) {
    return new Map<string, { username: string }>();
  }

  const results = await db.query.cosmoAccounts.findMany({
    where: {
      polygonAddress: {
        in: addresses,
      },
    },
    columns: {
      polygonAddress: true,
      username: true,
    },
  });

  return new Map(
    results.flatMap((account) =>
      account.polygonAddress === null
        ? []
        : [[addr(account.polygonAddress), account] as const],
    ),
  );
}

/**
 * Safely convert a COSMO account object for public use.
 */
export function toPublicCosmo(cosmo: undefined): undefined;
export function toPublicCosmo(
  cosmo: Pick<CosmoAccount, "username" | "address">,
): PublicCosmo;
export function toPublicCosmo(
  cosmo: Pick<CosmoAccount, "username" | "address"> | undefined,
): PublicCosmo | undefined {
  if (!cosmo) {
    return undefined;
  }

  // SAFETY: PublicCosmo is brand-typed; a cast is the only constructor
  return {
    username: cosmo.username,
    address: cosmo.address,
    isAddress: false,
  } as PublicCosmo;
}
