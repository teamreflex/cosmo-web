import { ValidArtist } from "@/lib/universal/cosmo/common";
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
import { CollectionDataSource } from "@/lib/utils";
import { user, session, account, verification } from "./auth-schema";

export { user, session, account, verification };

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userAddress: citext("user_address", { length: 42 }).notNull(),
    cosmoId: integer("cosmo_id").notNull(),
    nickname: citext("nickname", { length: 24 }).notNull(),
    // using a string and casting output so the db doesn't have to know about the enum
    artist: varchar("artist", { length: 24 }).notNull().$type<ValidArtist>(),
    privacyVotes: boolean("privacy_votes").notNull().default(true),
    gridColumns: integer("grid_columns").notNull().default(5),
    objektEditor: boolean("objekt_editor").notNull().default(false),
    dataSource: varchar("data_source", {
      length: 24,
    }).$type<CollectionDataSource>(),
    isModhaus: boolean("is_modhaus").notNull().default(false),
  },
  (t) => [
    uniqueIndex("profiles_address_idx").on(t.userAddress),
    index("profiles_cosmo_id_idx").on(t.cosmoId),
    index("profiles_nickname_idx").on(t.nickname),
    uniqueIndex("profiles_nickname_address_idx").on(t.nickname, t.userAddress),
    index("profiles_is_modhaus_idx").on(t.isModhaus),
  ]
);

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
  (t) => [index("list_entries_list_idx").on(t.listId)]
);

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

export type Profile = typeof profiles.$inferSelect;
export type ObjektList = typeof lists.$inferSelect;
export type ObjektListEntry = typeof listEntries.$inferSelect;
export type CreateObjektList = typeof lists.$inferInsert;
export type UpdateObjektList = typeof lists.$inferInsert;
export type ObjektMetadataEntry = typeof objektMetadata.$inferSelect;
export type Pin = typeof pins.$inferSelect;

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
