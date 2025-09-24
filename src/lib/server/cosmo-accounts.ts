import { sql } from "drizzle-orm";
import { FetchError } from "ofetch";
import { GRID_COLUMNS, isAddress } from "../utils";
import { db } from "./db";
import { cosmoAccounts } from "./db/schema";
import { fetchByNickname } from "./cosmo/user";
import { toPublicUser } from "./auth";
import type { CosmoAccount } from "./db/schema";
import type { FullAccount, PublicCosmo } from "../universal/cosmo-accounts";

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
        isAddress: true,
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
        showSocials: false,
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
        polygonAddress: null,
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
    isAddress: false,
  };
}
