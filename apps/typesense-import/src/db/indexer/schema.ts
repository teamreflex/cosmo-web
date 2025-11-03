import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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
});
