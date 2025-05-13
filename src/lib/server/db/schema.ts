import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { citext, createdAt } from "./columns";
import { user, session, account, verification } from "./auth-schema";
import { CosmoGravityType, CosmoPollType } from "@/lib/universal/cosmo/gravity";

export { user, session, account, verification };

export const cosmoAccounts = pgTable(
  "cosmo_account",
  {
    id: serial("id").primaryKey(),
    cosmoId: integer("cosmo_id"),
    username: citext("username", { length: 24 }).notNull(),
    address: citext("address", { length: 42 }).notNull(),
    polygonAddress: citext("polygon_address", { length: 42 }).default(
      sql`NULL`
    ),
    userId: text("user_id").default(sql`NULL`),
  },
  (t) => [
    uniqueIndex("cosmo_account_address_idx").on(t.address),
    index("cosmo_account_polygon_address_idx").on(t.polygonAddress),
    index("cosmo_account_cosmo_id_idx").on(t.cosmoId),
    index("cosmo_account_username_idx").on(t.username),
    uniqueIndex("cosmo_account_username_address_idx").on(t.username, t.address),
    index("cosmo_account_user_id_idx").on(t.userId),
  ]
);

export const lockedObjekts = pgTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("tokenId").notNull(),
    locked: boolean("locked").notNull(),
  },
  (t) => [
    index("locked_objekts_address_idx").on(t.address),
    index("locked_objekts_locked_idx").on(t.locked),
    index("address_locked_idx").on(t.address, t.locked),
    index("address_token_idx").on(t.address, t.tokenId),
  ]
);

export const pins = pgTable(
  "pins",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("token_id").notNull(),
  },
  (t) => [
    index("pins_address_idx").on(t.address),
    index("pins_token_id_idx").on(t.tokenId),
  ]
);

export const objektMetadata = pgTable(
  "objekt_metadata",
  {
    id: serial("id").primaryKey(),
    collectionId: varchar("collection_id", { length: 36 }).notNull().unique(), // slug: atom01-jinsoul-101z
    description: varchar("description", { length: 255 }).notNull(),
    contributor: citext("address", { length: 42 }).notNull(),
  },
  (t) => [
    index("objekt_metadata_collection_idx").on(t.collectionId),
    index("objekt_metadata_contributor_idx").on(t.contributor),
  ]
);

export const objektLists = pgTable(
  "objekt_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),
    name: varchar("name", { length: 24 }).notNull(),
    slug: citext("slug", { length: 24 }).notNull(),
  },
  (t) => [
    index("objekt_lists_user_idx").on(t.userId),
    index("objekt_lists_slug_idx").on(t.slug),
    uniqueIndex("objekt_lists_user_slug_idx").on(t.userId, t.slug),
  ]
);

export const objektListEntries = pgTable(
  "objekt_list_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    objektListId: uuid("objekt_list_id")
      .notNull()
      .references(() => objektLists.id, {
        onDelete: "cascade",
      }),
    collectionId: varchar("collection_id", { length: 36 }).notNull(), // slug: atom01-jinsoul-101z
  },
  (t) => [index("objekt_list_entries_list_idx").on(t.objektListId)]
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

export const polygonVotes = pgTable(
  "polygon_votes",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    contract: citext("contract", { length: 42 }).notNull(),
    pollId: integer("poll_id").notNull(),
    candidateId: integer("candidate_id"),
    index: integer("index").notNull(),
    amount: integer("amount").notNull(),
  },
  (t) => [
    index("polygon_votes_address_idx").on(t.address),
    index("polygon_votes_poll_id_idx").on(t.pollId),
    index("polygon_votes_contract_poll_id_idx").on(t.contract, t.pollId),
  ]
);

export type CosmoAccount = typeof cosmoAccounts.$inferSelect;
export type Pin = typeof pins.$inferSelect;
export type ObjektMetadataEntry = typeof objektMetadata.$inferSelect;
export type ObjektList = typeof objektLists.$inferSelect;
export type ObjektListEntry = typeof objektListEntries.$inferSelect;
export type CosmoToken = typeof cosmoTokens.$inferSelect;
export type Gravity = typeof gravities.$inferSelect;
export type GravityPoll = typeof gravityPolls.$inferSelect;
export type GravityPollCandidate = typeof gravityPollCandidates.$inferSelect;

// #region Legacy
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

export type List = typeof lists.$inferSelect;
export type ListEntry = typeof listEntries.$inferSelect;
export type CreateList = typeof lists.$inferInsert;
export type UpdateList = typeof lists.$inferInsert;
// #endregion
