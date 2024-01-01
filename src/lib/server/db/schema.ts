import { ValidArtist } from "@/lib/universal/cosmo/common";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
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

export const lockedObjektsRelations = relations(lockedObjekts, ({ one }) => ({
  profile: one(profiles, {
    fields: [lockedObjekts.userAddress],
    references: [profiles.userAddress],
  }),
}));

export const lists = mysqlTable(
  "lists",
  {
    id: serial("id").primaryKey(),
    userAddress: varchar("user_address", { length: 42 }).notNull(),
    name: varchar("name", { length: 24 }).notNull(),
    slug: varchar("slug", { length: 24 }).notNull(),
  },
  (table) => ({
    addressIdx: index("address_idx").on(table.userAddress),
    slugIdx: index("slug_idx").on(table.slug),
  })
);

export const listRelations = relations(lists, ({ many, one }) => ({
  entries: many(listEntries),
  profile: one(profiles, {
    fields: [lists.userAddress],
    references: [profiles.userAddress],
  }),
}));

export const listEntries = mysqlTable(
  "list_entries",
  {
    id: serial("id").primaryKey(),
    listId: int("list_id").notNull(),
    collectionId: varchar("collection_id", { length: 36 }).notNull(), // uuid
  },
  (table) => ({
    listIdx: index("list_idx").on(table.listId),
  })
);

export const listEntryRelations = relations(listEntries, ({ one }) => ({
  list: one(lists, {
    fields: [listEntries.listId],
    references: [lists.id],
  }),
}));

export const profiles = mysqlTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userAddress: varchar("user_address", { length: 42 }).notNull(),
    cosmoId: int("cosmo_id").notNull(),
    nickname: varchar("nickname", { length: 24 }).notNull(),
    // using a string and casting output so the db doesn't have to know about the enum
    artist: varchar("artist", { length: 24 }).notNull().$type<ValidArtist>(),
    privacyNickname: boolean("privacy_nickname").notNull().default(false),
    privacyObjekts: boolean("privacy_objekts").notNull().default(false),
    privacyComo: boolean("privacy_como").notNull().default(false),
    privacyTrades: boolean("privacy_trades").notNull().default(false),
  },
  (table) => ({
    addressIdx: index("address_idx").on(table.userAddress),
    cosmoIdIdx: index("cosmo_id_idx").on(table.cosmoId),
    nicknameIdx: index("nickname_idx").on(table.nickname),
  })
);

export const profileRelations = relations(profiles, ({ many }) => ({
  lockedObjekts: many(lockedObjekts),
  lists: many(lists),
}));

export type Profile = InferSelectModel<typeof profiles>;
export type ObjektList = InferSelectModel<typeof lists>;
export type CreateObjektList = InferInsertModel<typeof lists>;
export type UpdateObjektList = InferInsertModel<typeof lists>;
