import { CosmoApiError, CosmoDecodeError } from "@apollo/cosmo/errors";
import { runCosmo } from "@apollo/cosmo/runtime";
import { fetchByNickname } from "@apollo/cosmo/server/user";
import type { CosmoSearchResult } from "@apollo/cosmo/types/user";
import { cosmoAccounts } from "@apollo/database/web/schema";
import type { CosmoAccount } from "@apollo/database/web/types";
import { addr, isAddress } from "@apollo/util";
import { like, sql } from "drizzle-orm";
import type { FullAccount, PublicCosmo } from "../universal/cosmo-accounts";
import { toPublicUser } from "./auth.server";
import { db } from "./db";

/**
 * Fetch a full account from the database.
 * This includes the user, locked objekts, pins, and lists.
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
      objektLists: true,
    },
  });

  // found a cosmo account
  if (result) {
    const { user, ...cosmoResult } = result;
    const { objektLists, lockedObjekts, pins, ...cosmo } = cosmoResult;

    return {
      cosmo: toPublicCosmo(cosmo),
      user: toPublicUser(user ?? undefined),
      lockedObjekts: lockedObjekts
        .filter((o) => o.locked)
        .map((o) => o.tokenId),
      pins: pins.map((p) => p.tokenId),
      objektLists: objektLists,
      verified: cosmo.userId !== null,
    };
  }

  // if no cosmo account and it's an address, make a fake one
  if (identifierIsAddress) {
    return {
      cosmo: {
        ...toPublicCosmo({
          id: 0,
          cosmoId: null,
          polygonAddress: null,
          userId: null,
          username: identifier.substring(0, 6),
          address: identifier,
        }),
        isAddress: true,
      } satisfies PublicCosmo,
      user: undefined,
      lockedObjekts: [],
      pins: [],
      objektLists: [],
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
 * Upsert a COSMO account into the database and link it to a user.
 * Used when verifying ownership of a COSMO account.
 */
export async function linkAccount(account: Omit<CosmoAccount, "id">) {
  const [result] = await db
    .insert(cosmoAccounts)
    .values(account)
    .onConflictDoUpdate({
      target: cosmoAccounts.address,
      set: {
        username: account.username,
        cosmoId: account.cosmoId,
        userId: account.userId,
      },
    })
    .returning();

  if (!result) {
    throw new Error("Failed to link COSMO account");
  }

  return result;
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
export function toPublicCosmo(cosmo: CosmoAccount): PublicCosmo;
export function toPublicCosmo(
  cosmo: CosmoAccount | undefined,
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
