import { ValidArtist } from "@/lib/universal/cosmo/common";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { citext } from "./columns";
import { CollectionDataSource } from "@/lib/utils";
import { CosmoGravityType, CosmoPollType } from "@/lib/universal/cosmo/gravity";

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
  ]
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
  ]
);

export const gravityPolls = pgTable(
  "gravity_polls",
  {
    id: serial("id").primaryKey(),
    cosmoGravityId: integer("cosmo_gravity_id").notNull(),
    cosmoId: integer("cosmo_id").notNull(),
    pollIdOnChain: integer("poll_id_on_chain").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
  },
  (t) => [
    index("gravity_polls_cosmo_gravity_id_idx").on(t.cosmoGravityId),
    index("gravity_polls_cosmo_id_idx").on(t.cosmoId),
    index("gravity_polls_poll_id_on_chain_idx").on(t.pollIdOnChain),
  ]
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
      t.cosmoGravityPollId
    ),
    index("gravity_poll_candidates_candidate_id_idx").on(t.candidateId),
    index("gravity_poll_candidates_cosmo_id_idx").on(t.cosmoId),
  ]
);

export type Profile = typeof profiles.$inferSelect;
export type ObjektList = typeof lists.$inferSelect;
export type ObjektListEntry = typeof listEntries.$inferSelect;
export type CreateObjektList = typeof lists.$inferInsert;
export type UpdateObjektList = typeof lists.$inferInsert;
export type ObjektMetadataEntry = typeof objektMetadata.$inferSelect;
export type Pin = typeof pins.$inferSelect;
export type CosmoToken = typeof cosmoTokens.$inferSelect;
export type Gravity = typeof gravities.$inferSelect;
export type GravityPoll = typeof gravityPolls.$inferSelect;
export type GravityPollCandidate = typeof gravityPollCandidates.$inferSelect;
