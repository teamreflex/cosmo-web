import { InferSelectModel, relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const collections = pgTable(
  "collection",
  {
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
  },
  (table) => ({
    slugIdx: index("slug_idx").on(table.slug),
    seasonIdx: index("season_idx").on(table.season),
    memberIdx: index("member_idx").on(table.member),
    artistIdx: index("artist_idx").on(table.artist),
    classIdx: index("class_idx").on(table.class),
    collectionNoIdx: index("collectionNo_idx").on(table.collectionNo),
    onOfflineIdx: index("onOffline_idx").on(table.onOffline),
  })
);

export const collectionRelations = relations(collections, ({ many }) => ({
  transfers: many(transfers),
  objekts: many(objekts),
}));

export const objekts = pgTable(
  "objekt",
  {
    id: serial("id").primaryKey(),
    owner: varchar("owner", { length: 42 }).notNull(),
    mintedAt: timestamp("minted_at", { mode: "string" }).notNull(),
    receivedAt: timestamp("received_at", { mode: "string" }).notNull(),
    serial: integer("serial").notNull(),
    transferable: boolean("transferable").notNull(),
    used_for_grid: boolean("used_for_grid").notNull(),
    collectionId: varchar("collection_id", { length: 36 })
      .notNull()
      .references(() => collections.id),
  },
  (table) => ({
    ownerIdx: index("owner_idx").on(table.owner),
    collectionIdIdx: index("collection_id_idx").on(table.collectionId),
  })
);

export const objektRelations = relations(objekts, ({ many, one }) => ({
  transfers: many(transfers),
  collection: one(collections, {
    fields: [objekts.collectionId],
    references: [collections.id],
  }),
}));

export const transfers = pgTable(
  "transfer",
  {
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
  },
  (table) => ({
    fromIdx: index("from_idx").on(table.from),
    toIdx: index("to_idx").on(table.to),
    objektIdIdx: index("objekt_id_idx").on(table.objektId),
    collectionIdIdx: index("collection_id_idx").on(table.collectionId),
  })
);

export const transferRelations = relations(transfers, ({ one }) => ({
  objekt: one(objekts, {
    fields: [transfers.objektId],
    references: [objekts.id],
  }),
  collection: one(collections, {
    fields: [transfers.collectionId],
    references: [collections.id],
  }),
}));

export type Transfer = InferSelectModel<typeof transfers>;
export type Objekt = InferSelectModel<typeof objekts>;
export type Collection = InferSelectModel<typeof collections>;
