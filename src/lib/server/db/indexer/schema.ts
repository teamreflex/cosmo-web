import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const objekts = pgTable(
  "objekt",
  {
    id: serial("id").primaryKey(),
    contract: varchar("contract", { length: 42 }).notNull(),
    timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
    collectionId: varchar("collection_id", { length: 255 }).notNull(),
    season: varchar("season", { length: 32 }).notNull(),
    member: varchar("member", { length: 32 }).notNull(),
    artist: varchar("artist", { length: 32 }).notNull(),
    collectionNo: varchar("collection_no", { length: 8 }).notNull(),
    class: varchar("class", { length: 8 }).notNull(),
    frontImage: varchar("front_image", { length: 255 }).notNull(),
    backImage: varchar("back_image", { length: 255 }).notNull(),
    backgroundColor: varchar("background_color", { length: 8 }).notNull(),
    textColor: varchar("text_color", { length: 8 }).notNull(),
    comoAmount: integer("como_amount").notNull(),
    onOffline: varchar("on_offline", { length: 16 })
      .notNull()
      .$type<"online" | "offline">(),
  },
  (table) => ({
    seasonIdx: index("season_idx").on(table.season),
    memberIdx: index("member_idx").on(table.member),
    artistIdx: index("artist_idx").on(table.artist),
    classIdx: index("class_idx").on(table.class),
    collectionNoIdx: index("collectionNo_idx").on(table.collectionNo),
    onOfflineIdx: index("onOffline_idx").on(table.onOffline),
  })
);

export const objektRelations = relations(objekts, ({ many }) => ({
  transfers: many(transfers),
}));

export const transfers = pgTable(
  "transfer",
  {
    id: uuid("id").primaryKey(),
    from: varchar("from", { length: 42 }).notNull(),
    to: varchar("to", { length: 42 }).notNull(),
    timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
    tokenId: integer("token_id").notNull(),
    objektId: integer("objekt_id")
      .notNull()
      .references(() => objekts.id),
  },
  (table) => ({
    fromIdx: index("from_idx").on(table.from),
    toIdx: index("to_idx").on(table.to),
    objektIdIdx: index("objekt_id_idx").on(table.objektId),
  })
);

export const transferRelations = relations(transfers, ({ one }) => ({
  objekt: one(objekts, {
    fields: [transfers.objektId],
    references: [objekts.id],
  }),
}));
