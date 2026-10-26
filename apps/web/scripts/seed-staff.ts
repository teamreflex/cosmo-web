import type { Role } from "@apollo/auth";
import * as webSchema from "@apollo/database/web/schema";
import { hashPassword } from "better-auth/crypto";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

const PASSWORD = "password";

/**
 * Staff, member and trader accounts for local QA. Direct inserts bypass the
 * admin plugin's defaultRole, so every role is set explicitly. The moderator
 * has no COSMO link; the member owns a web-only profile so it can be
 * reported. Traders B and C are linked to addresses that own thousands of
 * transferable ARTMS Atom01 and Atom02 objekts in the local indexer, so
 * listings and ranges can be satisfied.
 */
const SEED_USERS = [
  {
    id: "seed-admin",
    name: "Seed Admin",
    email: "admin@seed.invalid",
    username: "seedadmin",
    displayUsername: "SeedAdmin",
    role: "admin",
  },
  {
    id: "seed-moderator",
    name: "Seed Moderator",
    email: "moderator@seed.invalid",
    username: "seedmoderator",
    displayUsername: "SeedModerator",
    role: "moderator",
  },
  {
    id: "seed-member",
    name: "Seed Member",
    email: "member@seed.invalid",
    username: "seedmember",
    displayUsername: "SeedMember",
    role: "user",
  },
  {
    id: "seed-trader-b",
    name: "Seed Trader B",
    email: "trader-b@seed.invalid",
    username: "seedtraderb",
    displayUsername: "SeedTraderB",
    role: "user",
  },
  {
    id: "seed-trader-c",
    name: "Seed Trader C",
    email: "trader-c@seed.invalid",
    username: "seedtraderc",
    displayUsername: "SeedTraderC",
    role: "user",
  },
] satisfies readonly {
  id: string;
  name: string;
  email: string;
  username: string;
  displayUsername: string;
  role: Role;
}[];

/**
 * COSMO links. An address already in `cosmo_account` keeps its username and
 * only gains the link.
 */
const SEED_PROFILES = [
  {
    address: "0x5eed000000000000000000000000000000000001",
    username: "SeedMember",
    userId: "seed-member",
  },
  {
    address: "0x3b47852fce1936960591ae0845705f6f8e865e7c",
    username: "SeedTraderB",
    userId: "seed-trader-b",
  },
  {
    address: "0x144ff722eac2ab8389af89807d91f1d872b2cd11",
    username: "SeedTraderC",
    userId: "seed-trader-c",
  },
];

async function seedStaff() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new SQL({ url: DATABASE_URL });
  const db = drizzle({ client });

  console.log("Seeding QA accounts (web DB only)...");

  const now = new Date();
  const password = await hashPassword(PASSWORD);

  await db.transaction(async (tx) => {
    for (const { id, ...fields } of SEED_USERS) {
      // reset the ban state so every run starts from a clean account
      const profile = {
        ...fields,
        emailVerified: true,
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: now,
      };

      await tx
        .insert(webSchema.user)
        .values({ id, ...profile, createdAt: now })
        .onConflictDoUpdate({ target: webSchema.user.id, set: profile });

      await tx
        .insert(webSchema.account)
        .values({
          id: `${id}-credential`,
          accountId: id,
          providerId: "credential",
          userId: id,
          password,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: webSchema.account.id,
          set: { password, updatedAt: now },
        });

      console.log(`  ${fields.email} (${fields.role})`);
    }

    for (const profile of SEED_PROFILES) {
      const [linked] = await tx
        .insert(webSchema.cosmoAccounts)
        .values(profile)
        .onConflictDoUpdate({
          target: webSchema.cosmoAccounts.address,
          set: { userId: profile.userId },
        })
        .returning({ username: webSchema.cosmoAccounts.username });
      console.log(
        `  @${linked?.username ?? profile.username} (${profile.address}) → ${profile.userId}`,
      );
    }
  });

  await client.close();

  console.log(`\nQA seed complete. Every account's password: ${PASSWORD}`);
}

seedStaff()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("QA seed failed:", err);
    process.exit(1);
  });
