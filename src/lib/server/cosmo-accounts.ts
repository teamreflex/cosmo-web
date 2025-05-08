import { sql } from "drizzle-orm";
import { db } from "./db";
import { cosmoAccounts, type CosmoAccount } from "./db/schema";

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
