import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  real,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// subsquid metadata
export const subsquidSchema = pgSchema("squid_processor");
export const subsquidStatus = subsquidSchema.table("status", {
  id: integer("id").notNull(),
  height: integer("height").notNull(),
  hash: text("hash"),
  nonce: integer("nonce"),
});

export const collections = pgTable("collection", {
  id: uuid("id").primaryKey(),
  contract: varchar("contract", { length: 42 }).notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  collectionId: varchar("collection_id", { length: 255 }).notNull(),
  season: varchar("season", { length: 32 }).notNull(),
  member: varchar("member", { length: 32 }).notNull(),
  artist: varchar("artist", { length: 32 }).notNull(),
  collectionNo: varchar("collection_no", { length: 8 }).notNull(),
  class: varchar("class", { length: 8 }).notNull(),
  thumbnailImage: varchar("thumbnail_image", { length: 255 }).notNull(),
  frontImage: varchar("front_image", { length: 255 }).notNull(),
  backImage: varchar("back_image", { length: 255 }).notNull(),
  backgroundColor: varchar("background_color", { length: 8 }).notNull(),
  textColor: varchar("text_color", { length: 8 }).notNull(),
  accentColor: varchar("accent_color", { length: 8 }).notNull(),
  comoAmount: integer("como_amount").notNull(),
  onOffline: varchar("on_offline", { length: 16 })
    .notNull()
    .$type<"online" | "offline">(),
  bandImageUrl: varchar("band_image_url", { length: 255 }),
  frontMedia: varchar("front_media", { length: 255 }),
  hasAudio: boolean("has_audio").notNull().default(false),
  frontImageVersion: varchar("front_image_version", { length: 12 }),
  backImageVersion: varchar("back_image_version", { length: 12 }),
  unobtainable: boolean("unobtainable").notNull().default(false),
});

export const objekts = pgTable("objekt", {
  id: varchar("id").primaryKey(),
  owner: varchar("owner", { length: 42 }).notNull(),
  mintedAt: timestamp("minted_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  receivedAt: timestamp("received_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  serial: integer("serial").notNull(),
  transferable: boolean("transferable").notNull(),
  collectionId: varchar("collection_id", { length: 36 })
    .notNull()
    .references(() => collections.id),
});

export const transfers = pgTable("transfer", {
  id: uuid("id").primaryKey(),
  hash: varchar("hash", { length: 255 }).notNull(),
  from: varchar("from", { length: 42 }).notNull(),
  to: varchar("to", { length: 42 }).notNull(),
  timestamp: timestamp("timestamp", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  tokenId: integer("token_id").notNull(),
  objektId: varchar("objekt_id", { length: 12 })
    .notNull()
    .references(() => objekts.id),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collections.id),
});

export const comoBalances = pgTable("como_balance", {
  id: uuid("id").primaryKey(),
  tokenId: numeric("token_id", { mode: "number" }).notNull(),
  owner: varchar("owner", { length: 42 }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
});

export const listEventOutbox = pgTable(
  "list_event_outbox",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    type: varchar("type", { length: 16 })
      .notNull()
      .default("transfer")
      .$type<"transfer" | "transferability">(),
    // set on transfer rows only
    transferId: varchar("transfer_id", { length: 36 }),
    fromAddress: text("from_address"),
    toAddress: text("to_address"),
    // set on transferability rows only
    transferable: boolean("transferable"),
    collectionId: varchar("collection_id", { length: 36 }).notNull(),
    tokenId: text("token_id").notNull(),
    timestamp: timestamp("timestamp", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    // transaction hash, null on rows written before the column was added
    hash: text("hash"),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_list_event_outbox_created_at").on(t.createdAt)],
);

export const votes = pgTable("vote", {
  id: uuid("id").primaryKey(),
  from: varchar("from", { length: 42 }).notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  tokenId: integer("token_id").notNull(),
  pollId: integer("poll_id").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  blockNumber: integer("block_number").notNull(),
  logIndex: integer("log_index").notNull(),
  hash: text("hash").notNull(),
  candidateId: integer("candidate_id"),
});

/**
 * reference table synced by apps/schedules (canonical member sort order), read by apps/web.
 * processor never touches it.
 */
export const members = pgTable("member", {
  id: uuid("id").primaryKey(),
  // joins to collection.member
  name: varchar("name", { length: 32 }).notNull().unique(),
  cosmoId: integer("cosmo_id").notNull(),
  artistId: varchar("artist_id", { length: 32 }).notNull(),
  alias: text("alias").notNull(),
  units: jsonb("units").$type<string[]>().notNull(),
  primaryColorHex: text("primary_color_hex").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

/**
 * objekt and spun counts per collection, read by apps/web's mint-count sorts.
 * maintained by triggers on objekt; the processor never touches it.
 */
export const collectionStats = pgTable("collection_stats", {
  // joins to objekt.collection_id and collection.id
  collectionId: varchar("collection_id", { length: 36 }).primaryKey(),
  objektCount: integer("objekt_count").notNull(),
  spunCount: integer("spun_count").notNull(),
});

// floor, listing count and latest listing of each collection's priced sale
// listings, synced by apps/schedules and read by apps/web's market. a row
// exists only while the collection is listed; the processor never touches it.
export const collectionMarketStats = pgTable("collection_market_stats", {
  // joins to collection.id
  collectionId: varchar("collection_id", { length: 36 }).primaryKey(),
  floorUsd: real("floor_usd").notNull(),
  listingCount: integer("listing_count").notNull(),
  lastListedAt: timestamp("last_listed_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
});

// copies each owner holds of each collection (SPIN excluded), maintained by triggers on objekt
export const collectionOwners = pgTable(
  "collection_owner",
  {
    collectionId: varchar("collection_id", { length: 36 }).notNull(),
    owner: text("owner").notNull(),
    copies: integer("copies").notNull(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.owner] })],
);

/**
 * Distinct obtainable collections each owner holds, maintained by triggers on objekt and
 * collection. An empty season or onOffline is the total across all seasons or online types.
 */
export const progressLeaderboard = pgTable(
  "progress_leaderboard",
  {
    owner: text("owner").notNull(),
    member: text("member").notNull(),
    season: text("season").notNull(),
    onOffline: text("on_offline").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.owner, t.member, t.season, t.onOffline] }),
    index("idx_progress_leaderboard_top").on(
      t.member,
      t.season,
      t.onOffline,
      t.count.desc(),
      t.owner,
    ),
  ],
);

/**
 * How many owners hold each progressLeaderboard count per member, season and online type,
 * maintained by triggers on progress_leaderboard. Buckets that empty out stay at 0 owners.
 */
export const progressHistogram = pgTable(
  "progress_histogram",
  {
    member: text("member").notNull(),
    season: text("season").notNull(),
    onOffline: text("on_offline").notNull(),
    count: integer("count").notNull(),
    owners: integer("owners").notNull(),
  },
  (t) => [primaryKey({ columns: [t.member, t.season, t.onOffline, t.count] })],
);

/**
 * token-id ranges COSMO reserved for physical and QR coupon objekts,
 * used by serial estimation (@apollo/serial-estimation). written by the processor.
 */
export const serialReservations = pgTable("serial_reservation", {
  // the online token id just below the reserved range
  lo: integer("lo").primaryKey(),
  // the online token id just above it
  hi: integer("hi").notNull(),
});

/**
 * real serials reported by users, separate table so data isn't lost upon recompute.
 * the processor applies them to their collections but never writes this table.
 */
export const serialConfirmations = pgTable("serial_confirmation", {
  // joins to objekt.id
  tokenId: varchar("token_id").primaryKey(),
  serial: integer("serial").notNull(),
  // web user id, null when seeded from COSMO's own data
  confirmedBy: text("confirmed_by"),
  confirmedAt: timestamp("confirmed_at", {
    mode: "string",
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
