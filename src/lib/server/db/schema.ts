import { ValidArtist } from "@/lib/universal/cosmo/common";
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { citext } from "./columns";

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userAddress: citext("user_address", { length: 42 }).notNull(),
    cosmoId: integer("cosmo_id").notNull(),
    nickname: citext("nickname", { length: 24 }).notNull(),
    // using a string and casting output so the db doesn't have to know about the enum
    artist: varchar("artist", { length: 24 }).notNull().$type<ValidArtist>(),
    privacyNickname: boolean("privacy_nickname").notNull().default(false),
    privacyObjekts: boolean("privacy_objekts").notNull().default(false),
    privacyComo: boolean("privacy_como").notNull().default(false),
    privacyTrades: boolean("privacy_trades").notNull().default(false),
    gridColumns: integer("grid_columns").notNull().default(5),
    objektEditor: boolean("objekt_editor").notNull().default(false),
  },
  (t) => [
    index("profiles_address_idx").on(t.userAddress),
    index("profiles_cosmo_id_idx").on(t.cosmoId),
    index("profiles_nickname_idx").on(t.nickname),
    index("profiles_priv_nickname_idx").on(t.privacyNickname),
    index("profiles_priv_objekts_idx").on(t.privacyObjekts),
    index("profiles_priv_como_idx").on(t.privacyComo),
    index("profiles_priv_trades_idx").on(t.privacyTrades),
    uniqueIndex("profiles_nickname_address_idx").on(t.nickname, t.userAddress),
  ]
);

export const profileRelations = relations(profiles, ({ many }) => ({
  lockedObjekts: many(lockedObjekts),
  lists: many(lists),
  objektMetadata: many(objektMetadata),
  pins: many(pins),
}));

export const lockedObjekts = pgTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    userAddress: citext("user_address", { length: 42 }).notNull(),
    tokenId: integer("tokenId").notNull(),
    locked: boolean("locked").notNull(),
  },
  (t) => [
    index("locked_objekts_user_address_idx").on(t.userAddress),
    index("locked_objekts_locked_idx").on(t.locked),
    index("address_locked_idx").on(t.userAddress, t.locked),
    index("address_token_idx").on(t.userAddress, t.tokenId),
  ]
);

export const lockedObjektsRelations = relations(lockedObjekts, ({ one }) => ({
  profile: one(profiles, {
    fields: [lockedObjekts.userAddress],
    references: [profiles.userAddress],
  }),
}));

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
  ]
);

export const listRelations = relations(lists, ({ many, one }) => ({
  entries: many(listEntries),
  profile: one(profiles, {
    fields: [lists.userAddress],
    references: [profiles.userAddress],
  }),
}));

export const listEntries = pgTable(
  "list_entries",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id").notNull(),
    collectionId: varchar("collection_id", { length: 36 }).notNull(), // slug: atom01-jinsoul-101z
  },
  (t) => [index("list_entries_list_idx").on(t.listId)]
);

export const listEntryRelations = relations(listEntries, ({ one }) => ({
  list: one(lists, {
    fields: [listEntries.listId],
    references: [lists.id],
  }),
}));

export const objektMetadata = pgTable(
  "objekt_metadata",
  {
    id: serial("id").primaryKey(),
    collectionId: varchar("collection_id", { length: 36 }).notNull().unique(), // slug: atom01-jinsoul-101z
    description: varchar("description", { length: 255 }).notNull(),
    contributor: citext("user_address", { length: 42 }).notNull(),
  },
  (t) => [
    index("objekt_metadata_collection_idx").on(t.collectionId),
    index("objekt_metadata_contributor_idx").on(t.contributor),
  ]
);

export const objektMetadataRelations = relations(objektMetadata, ({ one }) => ({
  profile: one(profiles, {
    fields: [objektMetadata.contributor],
    references: [profiles.userAddress],
  }),
}));

export const pins = pgTable(
  "pins",
  {
    id: serial("id").primaryKey(),
    userAddress: citext("user_address", { length: 42 }).notNull(),
    tokenId: integer("token_id").notNull(),
  },
  (t) => [
    index("pins_userAddress_idx").on(t.userAddress),
    index("pins_token_id_idx").on(t.tokenId),
  ]
);

export const pinRelations = relations(pins, ({ one }) => ({
  profile: one(profiles, {
    fields: [pins.userAddress],
    references: [profiles.userAddress],
  }),
}));

export type Profile = typeof profiles.$inferSelect;
export type ObjektList = typeof lists.$inferSelect;
export type ObjektListEntry = typeof listEntries.$inferSelect;
export type CreateObjektList = typeof lists.$inferInsert;
export type UpdateObjektList = typeof lists.$inferInsert;
export type ObjektMetadataEntry = typeof objektMetadata.$inferSelect;
export type Pin = typeof pins.$inferSelect;
