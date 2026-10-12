import type { Role } from "@apollo/auth";
import * as webSchema from "@apollo/database/web/schema";
import { hashPassword } from "better-auth/crypto";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

const PASSWORD = "password";

/**
 * Staff and member accounts for local QA. Direct inserts bypass the admin
 * plugin's defaultRole, so every role is set explicitly. The moderator has no
 * COSMO link; the member owns a web-only profile so it can be reported.
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
] satisfies readonly {
  id: string;
  name: string;
  email: string;
  username: string;
  displayUsername: string;
  role: Role;
}[];

const SEED_MEMBER_PROFILE = {
  address: "0x5eed000000000000000000000000000000000001",
  username: "SeedMember",
  userId: "seed-member",
};

async function seedStaff() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new SQL({ url: DATABASE_URL });
  const db = drizzle({ client });

  console.log("Seeding staff accounts (web DB only)...");

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

    await tx
      .insert(webSchema.cosmoAccounts)
      .values(SEED_MEMBER_PROFILE)
      .onConflictDoUpdate({
        target: webSchema.cosmoAccounts.address,
        set: {
          username: SEED_MEMBER_PROFILE.username,
          userId: SEED_MEMBER_PROFILE.userId,
        },
      });
    console.log(
      `  @${SEED_MEMBER_PROFILE.username} (${SEED_MEMBER_PROFILE.address})`,
    );
  });

  await client.close();

  console.log(`\nStaff seed complete. Every account's password: ${PASSWORD}`);
}

seedStaff()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Staff seed failed:", err);
    process.exit(1);
  });
