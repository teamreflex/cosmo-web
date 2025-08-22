import {
  bigint,
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// indexes are managed by the indexer

export const collections = pgTable("collection", {
  id: uuid("id").primaryKey(),
  contract: varchar("contract", { length: 42 }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull(),
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
});

export const objekts = pgTable("objekt", {
  id: serial("id").primaryKey(),
  owner: varchar("owner", { length: 42 }).notNull(),
  mintedAt: timestamp("minted_at", { mode: "string" }).notNull(),
  receivedAt: timestamp("received_at", { mode: "string" }).notNull(),
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
  timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
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

export const votes = pgTable("vote", {
  id: uuid("id").primaryKey(),
  from: varchar("from", { length: 42 }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull(),
  contract: varchar("contract", { length: 42 }).notNull(),
  pollId: integer("poll_id").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
});

export type Transfer = typeof transfers.$inferSelect;
export type Objekt = typeof objekts.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type ComoBalance = typeof comoBalances.$inferSelect;
export type Vote = typeof votes.$inferSelect;
