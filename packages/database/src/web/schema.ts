import { eq, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "../auth";
import { bunJsonb, citext, createdAt } from "../custom";
import type {
  CosmoGravityType,
  CosmoPollType,
  EventTypeKey,
  NotificationPayload,
} from "./types";

export * from "../auth";

export const listType = pgEnum("list_type", [
  "regular",
  "have",
  "want",
  "sale",
]);
export const notificationType = pgEnum("notification_type", ["list_match"]);

export const cosmoAccounts = pgTable(
  "cosmo_account",
  {
    id: serial("id").primaryKey(),
    cosmoId: integer("cosmo_id"),
    username: citext("username", { length: 24 }).notNull(),
    address: citext("address", { length: 42 }).notNull(),
    polygonAddress: citext("polygon_address", { length: 42 }).default(
      sql`NULL`,
    ),
    userId: text("user_id").default(sql`NULL`),
  },
  (t) => [
    uniqueIndex("cosmo_account_address_idx").on(t.address),
    index("cosmo_account_polygon_address_idx").on(t.polygonAddress),
    index("cosmo_account_cosmo_id_idx").on(t.cosmoId),
    uniqueIndex("cosmo_account_username_address_idx").on(t.username, t.address),
    index("cosmo_account_user_id_idx").on(t.userId),
  ],
);

export const cosmoAccountChanges = pgTable(
  "cosmo_account_changes",
  {
    address: citext("address", { length: 42 }).notNull(),
    username: citext("username", { length: 24 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cosmo_account_changes_address_idx").on(t.address),
    index("cosmo_account_changes_username_idx").on(t.username),
    index("cosmo_account_changes_created_at_idx").on(t.createdAt),
  ],
);

export const lockedObjekts = pgTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("tokenId").notNull(),
    locked: boolean("locked").notNull(),
  },
  (t) => [
    index("locked_objekts_locked_idx").on(t.locked),
    index("address_locked_idx").on(t.address, t.locked),
    index("address_token_idx").on(t.address, t.tokenId),
  ],
);

export const pins = pgTable(
  "pins",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("token_id").notNull(),
  },
  (t) => [
    index("pins_address_idx").on(t.address),
    index("pins_token_id_idx").on(t.tokenId),
  ],
);

export const objektLists = pgTable(
  "objekt_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),
    name: varchar("name", { length: 24 }).notNull(),
    slug: citext("slug", { length: 24 }).notNull(),
    currency: varchar("currency", { length: 3 }),
    type: listType("type").notNull().default("regular"),
    discoverable: boolean("discoverable").notNull().default(false),
    description: text("description"),
    linkedWantListId: uuid("linked_want_list_id").references(
      (): AnyPgColumn => objektLists.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [
    index("objekt_lists_slug_idx").on(t.slug),
    uniqueIndex("objekt_lists_user_slug_idx").on(t.userId, t.slug),
    index("objekt_lists_trade_active_idx")
      .on(t.type, t.userId)
      .where(sql`type IN ('have', 'want') AND discoverable = true`),
    uniqueIndex("objekt_lists_linked_want_list_idx")
      .on(t.linkedWantListId)
      .where(sql`linked_want_list_id IS NOT NULL`),
    check(
      "objekt_lists_currency_type_chk",
      sql`(${t.type} = 'sale') = (${t.currency} IS NOT NULL)`,
    ),
  ],
);

export const objektListEntries = pgTable(
  "objekt_list_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    objektListId: uuid("objekt_list_id")
      .notNull()
      .references(() => objektLists.id, {
        onDelete: "cascade",
      }),
    collectionId: varchar("collection_id", { length: 36 }).notNull(), // slug: atom01-jinsoul-101z
    tokenId: text("token_id"),
    quantity: integer("quantity").notNull().default(1),
    price: real("price"),
    verifiedAt: timestamp("verified_at", { mode: "string" }),
  },
  (t) => [
    index("objekt_list_entries_list_idx").on(t.objektListId),
    index("objekt_list_entries_collection_id_idx").on(t.collectionId),
    uniqueIndex("objekt_list_entries_token_list_unique_idx")
      .on(t.tokenId, t.objektListId)
      .where(sql`${t.tokenId} IS NOT NULL`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    payload: bunJsonb("payload").$type<NotificationPayload>().notNull(),
    readAt: timestamp("read_at", { mode: "string" }),
  },
  (t) => [
    index("notifications_user_unread_idx").on(t.userId, t.readAt),
    uniqueIndex("notifications_list_match_dedup_idx")
      .on(
        t.userId,
        sql`(payload->>'sourceUserId')`,
        sql`(payload->>'collectionId')`,
        sql`(payload->>'direction')`,
      )
      .where(eq(t.type, "list_match")),
  ],
);

/**
 * Named cursor for the indexer outbox drain. The drain advances `seq`
 * inside the same transaction as the entry deletes so a crash cannot
 * replay already-applied outbox rows.
 */
export const listDrainCursor = pgTable("list_drain_cursor", {
  name: text("name").primaryKey(),
  seq: bigint("seq", { mode: "bigint" }).notNull(),
});

export const eras = pgTable(
  "eras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    slug: citext("slug", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    artist: varchar("artist", { length: 32 }).notNull(),
    spotifyAlbumId: varchar("spotify_album_id", { length: 64 }),
    spotifyAlbumArt: varchar("spotify_album_art", { length: 255 }),
    imageUrl: varchar("image_url", { length: 255 }),
    dominantColor: varchar("dominant_color", { length: 16 }),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
  },
  (t) => [
    index("eras_artist_idx").on(t.artist),
    index("eras_created_at_idx").on(t.createdAt),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    eraId: uuid("era_id")
      .notNull()
      .references(() => eras.id, { onDelete: "cascade" }),
    slug: citext("slug", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    artist: varchar("artist", { length: 32 }).notNull(),
    eventType: varchar("event_type", { length: 32 })
      .notNull()
      .$type<EventTypeKey>(),
    twitterUrl: varchar("twitter_url", { length: 255 }),
    discordUrl: varchar("discord_url", { length: 255 }),
    startDate: timestamp("start_date", { mode: "date", withTimezone: true }),
    endDate: timestamp("end_date", { mode: "date", withTimezone: true }),
    imageUrl: varchar("image_url", { length: 255 }),
    dominantColor: varchar("dominant_color", { length: 16 }),
    /**
     * NOTE: uses Drizzle's built-in jsonb, which double-encodes under bun:sql (stored as a JSON string rather than an object).
     * Existing data is in that format and the read path already copes, so we leave it.
     * New columns should use `bunJsonb` from ../custom instead.
     */
    seasons: jsonb("seasons").$type<string[]>().notNull().default([]),
  },
  (t) => [
    index("events_artist_idx").on(t.artist),
    index("events_era_idx").on(t.eraId),
    index("events_created_at_idx").on(t.createdAt),
    index("events_start_date_idx").on(t.startDate),
  ],
);

export const collectionData = pgTable(
  "collection_data",
  {
    id: serial("id").primaryKey(),
    collectionId: varchar("collection_id", { length: 36 }).notNull().unique(), // slug: atom01-jinsoul-101z
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    description: varchar("description", { length: 255 }),
    contributor: citext("address", { length: 42 }).notNull(),
  },
  (t) => [
    index("collection_data_collection_id_idx").on(t.collectionId),
    index("collection_data_event_idx").on(t.eventId),
    index("collection_data_contributor_idx").on(t.contributor),
  ],
);

export const fxRates = pgTable(
  "fx_rates",
  {
    date: date("date", { mode: "string" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    rateToUsd: real("rate_to_usd").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.date, t.currency] }),
    index("fx_rates_currency_idx").on(t.currency),
  ],
);

export const collectionPriceStats = pgTable(
  "collection_price_stats",
  {
    collectionId: varchar("collection_id", { length: 36 }).primaryKey(),
    medianPriceUsd: real("median_price_usd").notNull(),
    listingCount: integer("listing_count").notNull(),
    minPriceUsd: real("min_price_usd").notNull(),
    maxPriceUsd: real("max_price_usd").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("collection_price_stats_median_idx").on(t.medianPriceUsd)],
);

export const cosmoTokens = pgTable(
  "cosmo_tokens",
  {
    id: serial("id").primaryKey(),
    accessToken: varchar("access_token", { length: 255 }).notNull(),
    refreshToken: varchar("refresh_token", { length: 255 }).notNull(),
  },
  (t) => [
    index("cosmo_tokens_access_token_idx").on(t.accessToken),
    index("cosmo_tokens_refresh_token_idx").on(t.refreshToken),
  ],
);

export const gravities = pgTable(
  "gravities",
  {
    id: serial("id").primaryKey(),
    artist: citext("artist", { length: 36 }).notNull(),
    cosmoId: integer("cosmo_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    image: varchar("image", { length: 255 }).notNull(),
    gravityType: varchar("gravity_type", { length: 32 })
      .notNull()
      .$type<CosmoGravityType>(),
    pollType: varchar("poll_type", { length: 32 })
      .notNull()
      .$type<CosmoPollType>(),
    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }).notNull(),
  },
  (t) => [
    index("gravities_artist_idx").on(t.artist),
    index("gravities_cosmo_id_idx").on(t.cosmoId),
  ],
);

export const gravityPolls = pgTable(
  "gravity_polls",
  {
    id: serial("id").primaryKey(),
    cosmoGravityId: integer("cosmo_gravity_id").notNull(),
    cosmoId: integer("cosmo_id").notNull(),
    pollIdOnChain: integer("poll_id_on_chain").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
  },
  (t) => [
    index("gravity_polls_cosmo_gravity_id_idx").on(t.cosmoGravityId),
    index("gravity_polls_cosmo_id_idx").on(t.cosmoId),
    index("gravity_polls_poll_id_on_chain_idx").on(t.pollIdOnChain),
  ],
);

export const gravityPollCandidates = pgTable(
  "gravity_poll_candidates",
  {
    id: serial("id").primaryKey(),
    cosmoGravityPollId: integer("cosmo_gravity_poll_id").notNull(),
    candidateId: integer("candidate_id").notNull(), // just the index in the array
    cosmoId: varchar("cosmo_id", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    image: varchar("image", { length: 255 }).notNull(),
  },
  (t) => [
    index("gravity_poll_candidates_cosmo_gravity_poll_id_idx").on(
      t.cosmoGravityPollId,
    ),
    index("gravity_poll_candidates_candidate_id_idx").on(t.candidateId),
    index("gravity_poll_candidates_cosmo_id_idx").on(t.cosmoId),
  ],
);

export const polygonVotes = pgTable(
  "polygon_votes",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    contract: citext("contract", { length: 42 }).notNull(),
    pollId: integer("poll_id").notNull(),
    candidateId: integer("candidate_id"),
    index: integer("index").notNull(),
    amount: integer("amount").notNull(),
    blockNumber: integer("block_number").notNull(),
    hash: varchar("hash", { length: 66 }).notNull(),
  },
  (t) => [
    index("polygon_votes_address_idx").on(t.address),
    index("polygon_votes_poll_id_idx").on(t.pollId),
    index("polygon_votes_contract_poll_id_idx").on(t.contract, t.pollId),
  ],
);

// #region Legacy
export const lists = pgTable(
  "lists",
  {
    id: serial("id").primaryKey(),
    userAddress: citext("user_address", { length: 42 }).notNull(),
    name: varchar("name", { length: 24 }).notNull(),
    slug: citext("slug", { length: 24 }).notNull(),
  },
  (t) => [
    index("lists_address_idx").on(t.userAddress),
    index("lists_slug_idx").on(t.slug),
  ],
);

export const listEntries = pgTable(
  "list_entries",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => lists.id, {
        onDelete: "cascade",
      }),
    collectionId: varchar("collection_id", { length: 36 }).notNull(), // slug: atom01-jinsoul-101z
  },
  (t) => [index("list_entries_list_idx").on(t.listId)],
);
// #endregion

/**
 * SQL for cosmo username tracking trigger
 * 
-- create trigger function to track username changes
CREATE OR REPLACE FUNCTION track_cosmo_id_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- check if username actually changed
    IF OLD.username IS DISTINCT FROM NEW.username THEN
        -- insert the address and new username into cosmo_account_changes
        INSERT INTO cosmo_account_changes (address, username)
        VALUES (NEW.address, NEW.username);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- create trigger on cosmo_account table
CREATE TRIGGER cosmo_account_username_change_trigger
AFTER UPDATE OF username ON cosmo_account
FOR EACH ROW
EXECUTE FUNCTION track_cosmo_id_changes();

 */
