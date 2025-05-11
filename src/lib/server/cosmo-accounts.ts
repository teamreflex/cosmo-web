import { sql } from "drizzle-orm";
import { db } from "./db";
import { cosmoAccounts, type CosmoAccount } from "./db/schema";
import { fetchByNickname } from "./cosmo/auth";
import { FetchError } from "ofetch";
import { FullAccount, PublicCosmo } from "../universal/cosmo-accounts";
import { GRID_COLUMNS, isAddress } from "../utils";
import { toPublicUser } from "./auth";

/**
 * Fetch a full account from the database.
 * This includes the user, locked objekts, pins, and lists.
 */
export async function fetchFullAccount(
  identifier: string
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
        username: identifier.substring(0, 6),
        address: identifier,
      },
      user: {
        id: crypto.randomUUID(),
        username: undefined,
        image: undefined,
        isAdmin: false,
        gridColumns: GRID_COLUMNS,
        collectionMode: "blockchain",
        social: {
          discord: undefined,
          twitter: undefined,
        },
      },
      lockedObjekts: [],
      pins: [],
      objektLists: [],
      verified: false,
    };
  }

  // attempt to fetch from cosmo
  try {
    const user = await fetchByNickname(identifier);

    // cache & upsert profile
    await cacheAccounts([
      {
        address: user.address,
        username: user.nickname,
      },
    ]);

    return await fetchFullAccount(user.nickname);
  } catch (err) {
    if (err instanceof FetchError && err.status !== 404) {
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

  return result;
}

/**
 * Upsert COSMO accounts into the database without linking it to a user.
 * Used when caching profiles from `/@:username` and search results.
 */
export async function cacheAccounts(
  accounts: Omit<CosmoAccount, "id" | "cosmoId" | "userId">[]
) {
  return await db
    .insert(cosmoAccounts)
    .values(accounts)
    .onConflictDoUpdate({
      target: cosmoAccounts.address,
      set: {
        username: sql.raw(`excluded.${cosmoAccounts.username.name}`),
      },
    })
    .returning();
}

/**
 * Fetch all known addresses from the database.
 */
export async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];

  // fetch known profiles
  return await db.query.cosmoAccounts.findMany({
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
}

/**
 * Safely convert a COSMO account object for public use.
 */
export function toPublicCosmo(cosmo: undefined): undefined;
export function toPublicCosmo(cosmo: CosmoAccount): PublicCosmo;
export function toPublicCosmo(
  cosmo: CosmoAccount | undefined
): PublicCosmo | undefined {
  if (!cosmo) {
    return undefined;
  }

  return {
    username: cosmo.username,
    address: cosmo.address,
  };
}
