import {
  boolean,
  index,
  int,
  mysqlTable,
  serial,
  varchar,
} from "drizzle-orm/mysql-core";

export const lockedObjekts = mysqlTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    userAddress: varchar("user_address", { length: 42 }).notNull(),
    tokenId: int("tokenId").notNull(),
    locked: boolean("locked").notNull(),
  },
  (table) => ({
    addressIdx: index("address_idx").on(table.userAddress),
    addressTokenIdx: index("address_token_idx").on(
      table.userAddress,
      table.tokenId
    ),
  })
);

// used for the ingest server
export const objekts = mysqlTable(
  "objekts",
  {
    id: serial("id").primaryKey(),
    collectionId: varchar("collection_id", { length: 255 }).notNull(),
    season: varchar("season", { length: 32 }).notNull(),
    member: varchar("member", { length: 32 }).notNull(),
    collectionNo: varchar("collection_no", { length: 8 }).notNull(),
    class: varchar("class", { length: 8 }).notNull(),
    frontImage: varchar("frontImage", { length: 255 }).notNull(),
    backImage: varchar("backImage", { length: 255 }).notNull(),
    backgroundColor: varchar("background_color", { length: 8 }).notNull(),
    textColor: varchar("text_color", { length: 8 }).notNull(),
  },
  (table) => ({
    seasonIdx: index("season_idx").on(table.season),
    memberIdx: index("member_idx").on(table.member),
    classIdx: index("class_idx").on(table.class),
    collectionNoIdx: index("collectionNo_idx").on(table.collectionNo),
  })
);
