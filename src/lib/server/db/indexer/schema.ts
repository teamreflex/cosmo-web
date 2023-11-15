import {
  bigint,
  index,
  integer,
  pgTable,
  serial,
  varchar,
} from "drizzle-orm/pg-core";

export const objekts = pgTable(
  "objekt",
  {
    id: serial("id").primaryKey(),
    contract: varchar("contract", { length: 42 }).notNull(),
    timestamp: bigint("timestamp", { mode: "number" }).notNull(),
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
    // snake case to match cosmo filter convention
    on_offline: varchar("on_offline", { length: 16 })
      .notNull()
      .$type<"online" | "offline">(),
  },
  (table) => ({
    seasonIdx: index("season_idx").on(table.season),
    memberIdx: index("member_idx").on(table.member),
    artistIdx: index("artist_idx").on(table.artist),
    classIdx: index("class_idx").on(table.class),
    collectionNoIdx: index("collectionNo_idx").on(table.collectionNo),
    onOfflineIdx: index("onOffline_idx").on(table.on_offline),
  })
);

export const comoCalendar = pgTable(
  "como_calendar",
  {
    id: serial("id").primaryKey(),
    contract: varchar("contract", { length: 42 }).notNull(),
    address: varchar("address", { length: 42 }).notNull(),
    day: integer("day").notNull(),
    amount: integer("amount").notNull(),
  },
  (table) => ({
    contractIdx: index("contract_idx").on(table.contract),
    addressIdx: index("address_idx").on(table.address),
    dayIdx: index("day_idx").on(table.day),
  })
);
