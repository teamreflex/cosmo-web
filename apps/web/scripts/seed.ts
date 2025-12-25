import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { sql } from "drizzle-orm";
import * as webSchema from "@apollo/database/web/schema";
import * as indexerSchema from "@apollo/database/indexer/schema";

// Constants
const SEED_USER_ID = "seed-user-1";
const SEED_ACCOUNT_ID = "seed-account-1";
const SEED_ADDRESS = "0xa5848873c7ab6189989dd8534eecf4295b00a98d";
const SEED_USERNAME = "Kairu";
const CONTRACT = "0x0fb69f54ba90f17578a59823e09e5a1f8f3fa200";

// Real collection data from the indexer database
const SEED_COLLECTIONS = [
  {
    id: "96c1f628-f072-4e34-a05f-9208f9d8aa85",
    season: "Atom01",
    member: "HeeJin",
    class: "Double",
    collectionNo: "303Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/617d37d4-9b25-4871-13cc-657a5b8bc200/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/09dd0e3f-0cf9-4b04-1e14-45b781e45c00/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/617d37d4-9b25-4871-13cc-657a5b8bc200/thumbnail",
    backgroundColor: "#8A8C8E",
    textColor: "#FFFFFF",
    accentColor: "#8A8C8E",
    comoAmount: 2,
    onOffline: "online" as const,
    slug: "atom01-heejin-303z",
    collectionId: "Atom01 HeeJin 303Z",
    createdAt: "2023-07-04T06:18:34.000Z",
  },
  {
    id: "4744f4df-7eb7-4749-b79b-8d49fed79a34",
    season: "Atom01",
    member: "HeeJin",
    class: "First",
    collectionNo: "101A",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/6b0973b6-7918-428a-1665-569a030ba900/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/ed33449e-2e15-474d-d46f-3b2dc5abaf00/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/6b0973b6-7918-428a-1665-569a030ba900/thumbnail",
    backgroundColor: "#FFDD00",
    textColor: "#000000",
    accentColor: "#FFDD00",
    comoAmount: 1,
    onOffline: "offline" as const,
    slug: "atom01-heejin-101a",
    collectionId: "Atom01 HeeJin 101A",
    createdAt: "2023-07-12T09:50:51.000Z",
  },
  {
    id: "f70221fd-1e74-482e-8f15-9d45f0a73a58",
    season: "Atom01",
    member: "HeeJin",
    class: "Special",
    collectionNo: "201Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/1d344c37-49cd-42bf-133d-a22a8d46ae00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/8b616826-b292-4cca-16d9-ad0cc24ffb00/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/1d344c37-49cd-42bf-133d-a22a8d46ae00/thumbnail",
    backgroundColor: "#F7F7F7",
    textColor: "#000000",
    accentColor: "#F7F7F7",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "atom01-heejin-201z",
    collectionId: "Atom01 HeeJin 201Z",
    createdAt: "2023-07-04T12:00:36.000Z",
  },
  {
    id: "f46e66c1-1826-45b3-84e6-9ce3bc2992c6",
    season: "Atom01",
    member: "HeeJin",
    class: "Welcome",
    collectionNo: "100Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/462cb422-b17a-4f92-2ffe-5d6d08d2ac00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/9afd0be6-0dd9-4aa1-2136-1bdb6f481800/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/462cb422-b17a-4f92-2ffe-5d6d08d2ac00/thumbnail",
    backgroundColor: "#dddddd",
    textColor: "#000000",
    accentColor: "#dddddd",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "atom01-heejin-100z",
    collectionId: "Atom01 HeeJin 100Z",
    createdAt: "2023-06-19T00:51:45.000Z",
  },
  {
    id: "aeb871f1-35b5-44cc-9e38-9e4e6fc26f12",
    season: "Atom01",
    member: "JinSoul",
    class: "Double",
    collectionNo: "304Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/fadea10c-7082-4891-bfeb-b8096e80d200/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/5fabe577-4411-4d29-5307-20e9354b4f00/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/fadea10c-7082-4891-bfeb-b8096e80d200/thumbnail",
    backgroundColor: "#F4B94E",
    textColor: "#2DA8A1",
    accentColor: "#F4B94E",
    comoAmount: 2,
    onOffline: "online" as const,
    slug: "atom01-jinsoul-304z",
    collectionId: "Atom01 JinSoul 304Z",
    createdAt: "2023-08-26T14:24:20.000Z",
  },
  {
    id: "6112a913-a8dc-4480-8e71-d72bc367d4d7",
    season: "Atom01",
    member: "JinSoul",
    class: "First",
    collectionNo: "101A",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/4b17d0de-a90e-499a-4e4c-d20572159000/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/825d6a92-c6b8-470d-228e-0e7be076aa00/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/4b17d0de-a90e-499a-4e4c-d20572159000/thumbnail",
    backgroundColor: "#FFDD00",
    textColor: "#000000",
    accentColor: "#FFDD00",
    comoAmount: 1,
    onOffline: "offline" as const,
    slug: "atom01-jinsoul-101a",
    collectionId: "Atom01 JinSoul 101A",
    createdAt: "2023-07-12T10:21:59.000Z",
  },
  {
    id: "210e6869-6da3-4fbe-99c6-a2b607308c31",
    season: "Atom01",
    member: "JinSoul",
    class: "Special",
    collectionNo: "201Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/543842fc-da51-429f-b095-6b429484e500/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/9aa7fc9d-976b-49ba-89ae-85d53333df00/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/543842fc-da51-429f-b095-6b429484e500/thumbnail",
    backgroundColor: "#F7F7F7",
    textColor: "#000000",
    accentColor: "#F7F7F7",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "atom01-jinsoul-201z",
    collectionId: "Atom01 JinSoul 201Z",
    createdAt: "2023-07-04T12:00:48.000Z",
  },
  {
    id: "22825e25-ef78-4ff5-8fa5-08454c9e84b3",
    season: "Atom01",
    member: "JinSoul",
    class: "Welcome",
    collectionNo: "100Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/02ffe8b0-2821-4cf1-60d3-96858733e300/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/574e8cbd-f332-47fc-1af7-b5c10afa4700/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/02ffe8b0-2821-4cf1-60d3-96858733e300/thumbnail",
    backgroundColor: "#dddddd",
    textColor: "#000000",
    accentColor: "#dddddd",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "atom01-jinsoul-100z",
    collectionId: "Atom01 JinSoul 100Z",
    createdAt: "2023-06-19T00:59:17.000Z",
  },
  {
    id: "91e03bb4-ed58-4c6f-85b8-43a6616a700f",
    season: "Binary01",
    member: "HeeJin",
    class: "Double",
    collectionNo: "301A",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/e6536b8c-b7a9-4721-a381-60a69d781900/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/1745c1ad-28d3-488e-d8db-f17197304300/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/e6536b8c-b7a9-4721-a381-60a69d781900/thumbnail",
    backgroundColor: "#c4c0bf",
    textColor: "#000000",
    accentColor: "#c4c0bf",
    comoAmount: 2,
    onOffline: "offline" as const,
    slug: "binary01-heejin-301a",
    collectionId: "Binary01 HeeJin 301A",
    createdAt: "2024-05-31T03:37:28.000Z",
  },
  {
    id: "6a64082d-ada1-4b86-876a-bf160de3d008",
    season: "Binary01",
    member: "HeeJin",
    class: "First",
    collectionNo: "101Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/1c23c04b-5074-48fe-2e58-6b54c1095a00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/bc663fc1-befa-4491-8064-3c10cb7f4900/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/1c23c04b-5074-48fe-2e58-6b54c1095a00/thumbnail",
    backgroundColor: "#75FB4C",
    textColor: "#000000",
    accentColor: "#75FB4C",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "binary01-heejin-101z",
    collectionId: "Binary01 HeeJin 101Z",
    createdAt: "2024-05-31T04:00:16.000Z",
  },
  {
    id: "782eb6c5-d208-4829-ab1c-8483cefaeb64",
    season: "Binary01",
    member: "HeeJin",
    class: "Special",
    collectionNo: "201Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/08b500d9-8807-45b9-c9a6-315b5b7d7700/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/b184a05d-890b-4e93-0d4a-600d3947f900/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/08b500d9-8807-45b9-c9a6-315b5b7d7700/thumbnail",
    backgroundColor: "#F7F7F7",
    textColor: "#000000",
    accentColor: "#F7F7F7",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "binary01-heejin-201z",
    collectionId: "Binary01 HeeJin 201Z",
    createdAt: "2024-05-31T04:00:48.000Z",
  },
  {
    id: "34d2d25b-9e3c-4437-a4ca-f1fce36a5875",
    season: "Binary01",
    member: "HeeJin",
    class: "Welcome",
    collectionNo: "100Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/6769d86d-a131-47f2-f5c0-b5985da35400/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/9a0fd664-8666-49f0-b62b-8fa575f79d00/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/6769d86d-a131-47f2-f5c0-b5985da35400/thumbnail",
    backgroundColor: "#F1F2F2",
    textColor: "#000000",
    accentColor: "#F1F2F2",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "binary01-heejin-100z",
    collectionId: "Binary01 HeeJin 100Z",
    createdAt: "2024-05-31T04:02:52.000Z",
  },
  {
    id: "ab50bc98-701a-41ca-bf1e-904ddbfb518f",
    season: "Binary01",
    member: "JinSoul",
    class: "Double",
    collectionNo: "301A",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/01a177bb-01da-4bb3-a6cb-0221585e5900/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/e3bf917c-f942-4731-3dd4-69dd4e781900/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/01a177bb-01da-4bb3-a6cb-0221585e5900/thumbnail",
    backgroundColor: "#c4c0bf",
    textColor: "#000000",
    accentColor: "#c4c0bf",
    comoAmount: 2,
    onOffline: "offline" as const,
    slug: "binary01-jinsoul-301a",
    collectionId: "Binary01 JinSoul 301A",
    createdAt: "2024-05-31T03:27:18.000Z",
  },
  {
    id: "26e3fbf6-38c6-4b6b-bc75-fd88d159dd50",
    season: "Binary01",
    member: "JinSoul",
    class: "First",
    collectionNo: "101Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/4d6fa4ea-a152-4c40-fe9c-0ca12f556700/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/d1f5a8e3-60b2-4cba-b174-063091218400/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/4d6fa4ea-a152-4c40-fe9c-0ca12f556700/thumbnail",
    backgroundColor: "#75FB4C",
    textColor: "#000000",
    accentColor: "#75FB4C",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "binary01-jinsoul-101z",
    collectionId: "Binary01 JinSoul 101Z",
    createdAt: "2024-06-03T04:01:17.000Z",
  },
  {
    id: "80f87320-aa90-4f02-9d15-1a9a60b501bd",
    season: "Binary01",
    member: "JinSoul",
    class: "Special",
    collectionNo: "201Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/5d693178-b4a7-4444-0a99-683257a61a00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/2b1120fb-eca8-4681-c46f-8024a770e200/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/5d693178-b4a7-4444-0a99-683257a61a00/thumbnail",
    backgroundColor: "#F7F7F7",
    textColor: "#000000",
    accentColor: "#F7F7F7",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "binary01-jinsoul-201z",
    collectionId: "Binary01 JinSoul 201Z",
    createdAt: "2024-06-03T04:00:31.000Z",
  },
  {
    id: "10e5fb35-50f2-4451-8254-43f4160bec7d",
    season: "Binary01",
    member: "JinSoul",
    class: "Welcome",
    collectionNo: "100Z",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/8cf37c8c-0a59-455a-1223-bc15a914ff00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/d6eff272-44b0-4991-ba65-010489020400/4x",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/8cf37c8c-0a59-455a-1223-bc15a914ff00/thumbnail",
    backgroundColor: "#F1F2F2",
    textColor: "#000000",
    accentColor: "#F1F2F2",
    comoAmount: 1,
    onOffline: "online" as const,
    slug: "binary01-jinsoul-100z",
    collectionId: "Binary01 JinSoul 100Z",
    createdAt: "2024-05-31T04:08:04.000Z",
  },
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Create database connections
  const webClient = new SQL({ url: process.env.DATABASE_URL! });
  const indexerClient = new SQL({ url: process.env.INDEXER_DATABASE_URL! });

  const db = drizzle({ client: webClient });
  const indexer = drizzle({ client: indexerClient });

  const now = new Date();

  // 1. Seed user
  console.log("👤 Seeding user...");
  await db
    .insert(webSchema.user)
    .values({
      id: SEED_USER_ID,
      name: "Seed User",
      email: "user@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: webSchema.user.id,
      set: {
        name: "Seed User",
        email: "user@example.com",
        emailVerified: true,
        updatedAt: now,
      },
    });
  console.log("  ✓ User created: user@example.com");

  // 2. Seed credential account with hashed password
  console.log("🔐 Seeding credential account...");
  const hashedPassword = await Bun.password.hash("password", {
    algorithm: "bcrypt",
    cost: 10,
  });

  await db
    .insert(webSchema.account)
    .values({
      id: SEED_ACCOUNT_ID,
      accountId: SEED_USER_ID,
      providerId: "credential",
      userId: SEED_USER_ID,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: webSchema.account.id,
      set: {
        password: hashedPassword,
        updatedAt: now,
      },
    });
  console.log("  ✓ Credential account created with password: password");

  // 3. Seed cosmo account and link to user
  console.log("🎮 Seeding cosmo account...");
  await db
    .insert(webSchema.cosmoAccounts)
    .values({
      address: SEED_ADDRESS,
      username: SEED_USERNAME,
      userId: SEED_USER_ID,
    })
    .onConflictDoUpdate({
      target: webSchema.cosmoAccounts.address,
      set: {
        username: SEED_USERNAME,
        userId: SEED_USER_ID,
      },
    });
  console.log(`  ✓ Cosmo account created: ${SEED_USERNAME} (${SEED_ADDRESS})`);

  // 4. Seed collections (batch insert)
  console.log("📦 Seeding collections...");
  const collectionValues = SEED_COLLECTIONS.map((collection) => ({
    id: collection.id,
    contract: CONTRACT,
    createdAt: collection.createdAt,
    slug: collection.slug,
    collectionId: collection.collectionId,
    season: collection.season,
    member: collection.member,
    artist: "artms",
    collectionNo: collection.collectionNo,
    class: collection.class,
    thumbnailImage: collection.thumbnailImage,
    frontImage: collection.frontImage,
    backImage: collection.backImage,
    backgroundColor: collection.backgroundColor,
    textColor: collection.textColor,
    accentColor: collection.accentColor,
    comoAmount: collection.comoAmount,
    onOffline: collection.onOffline,
  }));

  await indexer
    .insert(indexerSchema.collections)
    .values(collectionValues)
    .onConflictDoUpdate({
      target: indexerSchema.collections.id,
      set: {
        slug: sql.raw(`excluded.${indexerSchema.collections.slug.name}`),
        collectionId: sql.raw(
          `excluded.${indexerSchema.collections.collectionId.name}`,
        ),
        season: sql.raw(`excluded.${indexerSchema.collections.season.name}`),
        member: sql.raw(`excluded.${indexerSchema.collections.member.name}`),
        collectionNo: sql.raw(
          `excluded.${indexerSchema.collections.collectionNo.name}`,
        ),
        class: sql.raw(`excluded.${indexerSchema.collections.class.name}`),
        thumbnailImage: sql.raw(
          `excluded.${indexerSchema.collections.thumbnailImage.name}`,
        ),
        frontImage: sql.raw(
          `excluded.${indexerSchema.collections.frontImage.name}`,
        ),
        backImage: sql.raw(
          `excluded.${indexerSchema.collections.backImage.name}`,
        ),
        backgroundColor: sql.raw(
          `excluded.${indexerSchema.collections.backgroundColor.name}`,
        ),
        textColor: sql.raw(
          `excluded.${indexerSchema.collections.textColor.name}`,
        ),
        accentColor: sql.raw(
          `excluded.${indexerSchema.collections.accentColor.name}`,
        ),
        comoAmount: sql.raw(
          `excluded.${indexerSchema.collections.comoAmount.name}`,
        ),
        onOffline: sql.raw(
          `excluded.${indexerSchema.collections.onOffline.name}`,
        ),
      },
    });

  for (const collection of SEED_COLLECTIONS) {
    console.log(`  ✓ ${collection.collectionId}`);
  }

  // 5. Seed objekts (batch insert)
  console.log("🎴 Seeding objekts...");
  const objektMintedAt = now.toISOString();

  // Get max objekt id to increment from
  const maxIdResult = await indexer
    .select({ maxId: sql<string>`COALESCE(MAX(CAST(id AS INTEGER)), 0)` })
    .from(indexerSchema.objekts);
  let nextId = parseInt(maxIdResult[0]?.maxId ?? "0", 10) + 1;

  const objektValues = SEED_COLLECTIONS.map((collection) => ({
    id: String(nextId++),
    owner: SEED_ADDRESS,
    mintedAt: objektMintedAt,
    receivedAt: objektMintedAt,
    serial: 1,
    transferable: true,
    collectionId: collection.id,
  }));

  await indexer.insert(indexerSchema.objekts).values(objektValues);

  for (const objekt of objektValues) {
    console.log(`  ✓ ${objekt.id}`);
  }

  // Close connections
  webClient.close();
  indexerClient.close();

  console.log("\n✅ Seed complete!");
  console.log("\nLogin credentials:");
  console.log("  Email: user@example.com");
  console.log("  Password: password");
  console.log(`\nCosmo account: ${SEED_USERNAME} (${SEED_ADDRESS})`);
  console.log(`Collections: ${SEED_COLLECTIONS.length}`);
  console.log(`Objekts: ${SEED_COLLECTIONS.length}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
