import { inArray, isNull, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "../auth";
import { citext, createdAt, createdTimestamp } from "../custom";
import {
  type CosmoGravityType,
  type CosmoPollType,
  type EventTypeKey,
  type ReportReason,
  type StaffAuditAction,
  type StaffAuditDetail,
  type StaffAuditTargetType,
  type TradeEvent,
  cosmoLinkEvents,
  cosmoLinkReasons,
  endedStatuses,
  listingOfferModes,
  listingStatuses,
  paymentMethods,
  reportStatuses,
  reportTargetTypes,
  tradeCancellers,
  tradeItemKinds,
  tradeMessageKinds,
  tradeOfferKinds,
  tradeOfferStatuses,
  tradeSides,
  tradeStatuses,
  tradeWantKinds,
} from "./types";

export * from "../auth";

export const listType = pgEnum("list_type", [
  "regular",
  "have",
  "want",
  "sale",
]);
export const notificationType = pgEnum("notification_type", [
  // the actor added something you want to their have list
  "trade_have",
  // the actor wants something on your have list
  "trade_want",
]);
export const binderLayout = pgEnum("binder_layout", ["3x3", "2x2", "4x3"]);
export const reportTargetType = pgEnum("report_target_type", reportTargetTypes);
export const reportStatus = pgEnum("report_status", reportStatuses);
export const cosmoLinkEvent = pgEnum("cosmo_link_event", cosmoLinkEvents);
export const cosmoLinkReason = pgEnum("cosmo_link_reason", cosmoLinkReasons);
export const tradeOfferKind = pgEnum("trade_offer_kind", tradeOfferKinds);
export const tradeOfferStatus = pgEnum(
  "trade_offer_status",
  tradeOfferStatuses,
);
export const tradeSide = pgEnum("trade_side", tradeSides);
export const tradeCanceller = pgEnum("trade_canceller", tradeCancellers);
export const tradeItemKind = pgEnum("trade_item_kind", tradeItemKinds);
export const tradeWantKind = pgEnum("trade_want_kind", tradeWantKinds);
export const tradeMessageKind = pgEnum("trade_message_kind", tradeMessageKinds);
export const listingOfferMode = pgEnum("listing_offer_mode", listingOfferModes);
export const paymentMethod = pgEnum("payment_method", paymentMethods);

export const cosmoAccounts = pgTable(
  "cosmo_account",
  {
    id: serial("id").primaryKey(),
    cosmoId: integer("cosmo_id"),
    username: citext("username", { length: 24 }).notNull(),
    address: citext("address", { length: 42 }).notNull(),
    polygonAddress: citext("polygon_address", { length: 42 }).default(
      sql`NULL`,
    ),
    userId: text("user_id").default(sql`NULL`),
  },
  (t) => [
    uniqueIndex("cosmo_account_address_idx").on(t.address),
    index("cosmo_account_polygon_address_idx").on(t.polygonAddress),
    index("cosmo_account_cosmo_id_idx").on(t.cosmoId),
    uniqueIndex("cosmo_account_username_address_idx").on(t.username, t.address),
    uniqueIndex("cosmo_account_user_id_unique_idx").on(t.userId),
    // covered by the unique index; dropped in the follow-up release with user.is_admin
    index("cosmo_account_user_id_idx").on(t.userId),
  ],
);

export const cosmoAccountChanges = pgTable("cosmo_account_changes", {
  address: citext("address", { length: 42 }).notNull(),
  username: citext("username", { length: 24 }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

/**
 * Append-only history of COSMO links: a row each time an address is linked to
 * or unlinked from a user, written in the transaction that changes
 * `cosmo_account.user_id`, which stays the current link. `user_id` has no
 * foreign key, so the rows outlive deleted accounts.
 */
export const cosmoLinkAudit = pgTable(
  "cosmo_link_audit",
  {
    id: serial("id").primaryKey(),
    createdAt,
    cosmoAccountId: integer("cosmo_account_id")
      .notNull()
      .references(() => cosmoAccounts.id),
    userId: text("user_id").notNull(),
    event: cosmoLinkEvent("event").notNull(),
    reason: cosmoLinkReason("reason").notNull(),
  },
  (t) => [
    index("cosmo_link_audit_cosmo_account_idx").on(t.cosmoAccountId, t.id),
    index("cosmo_link_audit_user_idx").on(t.userId, t.id),
    // verifying only links and deleting only unlinks
    check(
      "cosmo_link_audit_event_chk",
      sql`(${t.reason} <> 'verified' OR ${t.event} = 'linked') AND (${t.reason} <> 'account-deleted' OR ${t.event} = 'unlinked')`,
    ),
  ],
);

export const lockedObjekts = pgTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("tokenId").notNull(),
    locked: boolean("locked").notNull(),
  },
  (t) => [index("address_token_idx").on(t.address, t.tokenId)],
);

export const pins = pgTable(
  "pins",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("token_id"),
    binderId: uuid("binder_id").references(() => binders.id, {
      onDelete: "cascade",
    }),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    index("pins_token_id_idx").on(t.tokenId),
    index("pins_address_position_idx").on(t.address, t.position),
    uniqueIndex("pins_address_binder_idx").on(t.address, t.binderId),
    check(
      "pins_target_chk",
      sql`num_nonnulls(${t.tokenId}, ${t.binderId}) = 1`,
    ),
  ],
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
    currency: varchar("currency", { length: 3 }),
    type: listType("type").notNull().default("regular"),
    discoverable: boolean("discoverable").notNull().default(false),
    description: text("description"),
    linkedWantListId: uuid("linked_want_list_id").references(
      (): AnyPgColumn => objektLists.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [
    uniqueIndex("objekt_lists_user_slug_idx").on(t.userId, t.slug),
    index("objekt_lists_trade_active_idx")
      .on(t.type, t.userId)
      .where(sql`type IN ('have', 'want') AND discoverable = true`),
    uniqueIndex("objekt_lists_linked_want_list_idx")
      .on(t.linkedWantListId)
      .where(sql`linked_want_list_id IS NOT NULL`),
    check(
      "objekt_lists_currency_type_chk",
      sql`(${t.type} = 'sale') = (${t.currency} IS NOT NULL)`,
    ),
  ],
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
    tokenId: text("token_id"),
    quantity: integer("quantity").notNull().default(1),
    price: real("price"),
    verifiedAt: timestamp("verified_at", { mode: "string" }),
  },
  (t) => [
    // leading column serves entry lookups, created_at serves newest-n shelf previews
    index("objekt_list_entries_list_created_idx").on(
      t.objektListId,
      t.createdAt,
    ),
    index("objekt_list_entries_collection_id_idx").on(t.collectionId),
    uniqueIndex("objekt_list_entries_token_list_unique_idx")
      .on(t.tokenId, t.objektListId)
      .where(sql`${t.tokenId} IS NOT NULL`),
  ],
);

export const binders = pgTable(
  "binders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),
    name: varchar("name", { length: 24 }).notNull(),
    slug: citext("slug", { length: 24 }).notNull(),
    layout: binderLayout("layout").notNull(),
    colour: varchar("colour", { length: 7 }).notNull(),
    pageCount: integer("page_count").notNull().default(1),
    // null falls back to the page 1 collage
    coverTokenId: integer("cover_token_id"),
  },
  (t) => [
    uniqueIndex("binders_user_slug_idx").on(t.userId, t.slug),
    check("binders_colour_chk", sql`${t.colour} ~ '^#[0-9a-fA-F]{6}$'`),
    check("binders_page_count_chk", sql`${t.pageCount} >= 1`),
  ],
);

export const binderEntries = pgTable(
  "binder_entries",
  {
    binderId: uuid("binder_id")
      .notNull()
      .references(() => binders.id, {
        onDelete: "cascade",
      }),
    // zero-based page and slot, slot counts row by row within the layout
    page: integer("page").notNull(),
    slot: integer("slot").notNull(),
    tokenId: integer("token_id").notNull(),
    placedAt: createdTimestamp("placed_at"),
  },
  (t) => [
    primaryKey({ columns: [t.binderId, t.page, t.slot] }),
    uniqueIndex("binder_entries_binder_token_idx").on(t.binderId, t.tokenId),
    // serves the outbox drain
    index("binder_entries_token_id_idx").on(t.tokenId),
    check("binder_entries_page_chk", sql`${t.page} >= 0`),
    check("binder_entries_slot_chk", sql`${t.slot} >= 0`),
  ],
);

/**
 * One row per event. Subject columns are nullable so a future type can do
 * without a list or an actor; the check says which ones each type requires.
 * The bell groups rows into bursts when it reads them.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    // better-auth ids are 32 characters
    userId: varchar("user_id", { length: 32 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
    // deleting the actor's account removes what they caused
    actorId: varchar("actor_id", { length: 32 }).references(() => user.id, {
      onDelete: "cascade",
    }),
    listId: uuid("list_id").references(() => objektLists.id, {
      onDelete: "cascade",
    }),
    collectionId: varchar("collection_id", { length: 36 }), // slug: atom01-jinsoul-101z
  },
  (t) => [
    /**
     * The bell's pages, a backward scan for `order by created_at desc, id desc`.
     * One job's rows share `created_at`, so `id` breaks the keyset ties.
     */
    index("notifications_user_created_idx").on(t.userId, t.createdAt, t.id),
    // the polled unread badge reads only unread rows
    index("notifications_user_unread_idx")
      .on(t.userId, t.createdAt)
      .where(isNull(t.readAt)),
    /**
     * An actor re-adding a collection never notifies the same user twice.
     * Leading with the actor serves the cascade when their account is deleted.
     */
    uniqueIndex("notifications_trade_dedup_idx")
      .on(t.actorId, t.userId, t.type, t.collectionId)
      .where(inArray(t.type, ["trade_have", "trade_want"])),
    // serves the cascade when the list is deleted
    index("notifications_list_idx").on(t.listId),
    check(
      "notifications_subject_chk",
      sql`${t.type} not in ('trade_have', 'trade_want') or num_nonnulls(${t.actorId}, ${t.listId}, ${t.collectionId}) = 3`,
    ),
  ],
);

/**
 * Named cursor for the indexer outbox drain. The drain locks the row, then
 * advances `seq` inside the same transaction as the entry deletes, so a crash
 * or an overlapping run cannot replay already-applied outbox rows.
 * `chain_time` is the newest chain timestamp among the drained rows, whether
 * or not they changed anything; null until the first drain records one.
 */
export const listDrainCursor = pgTable("list_drain_cursor", {
  name: text("name").primaryKey(),
  seq: bigint("seq", { mode: "bigint" }).notNull(),
  chainTime: timestamp("chain_time", { mode: "date", withTimezone: true }),
});

export const eras = pgTable(
  "eras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    slug: citext("slug", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    artist: varchar("artist", { length: 32 }).notNull(),
    spotifyAlbumId: varchar("spotify_album_id", { length: 64 }),
    spotifyAlbumArt: varchar("spotify_album_art", { length: 255 }),
    imageUrl: varchar("image_url", { length: 255 }),
    dominantColor: varchar("dominant_color", { length: 16 }),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
  },
  (t) => [
    index("eras_artist_idx").on(t.artist),
    index("eras_created_at_idx").on(t.createdAt),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    eraId: uuid("era_id")
      .notNull()
      .references(() => eras.id, { onDelete: "cascade" }),
    slug: citext("slug", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    artist: varchar("artist", { length: 32 }).notNull(),
    eventType: varchar("event_type", { length: 32 })
      .notNull()
      .$type<EventTypeKey>(),
    twitterUrl: varchar("twitter_url", { length: 255 }),
    discordUrl: varchar("discord_url", { length: 255 }),
    startDate: timestamp("start_date", { mode: "date", withTimezone: true }),
    endDate: timestamp("end_date", { mode: "date", withTimezone: true }),
    imageUrl: varchar("image_url", { length: 255 }),
    dominantColor: varchar("dominant_color", { length: 16 }),
    seasons: jsonb("seasons").$type<string[]>().notNull().default([]),
  },
  (t) => [
    index("events_artist_idx").on(t.artist),
    index("events_era_idx").on(t.eraId),
    index("events_created_at_idx").on(t.createdAt),
    index("events_start_date_idx").on(t.startDate),
  ],
);

export const collectionData = pgTable(
  "collection_data",
  {
    id: serial("id").primaryKey(),
    collectionId: varchar("collection_id", { length: 36 }).notNull().unique(), // slug: atom01-jinsoul-101z
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    description: varchar("description", { length: 255 }),
    contributor: citext("address", { length: 42 }).notNull(),
  },
  (t) => [
    index("collection_data_collection_id_idx").on(t.collectionId),
    index("collection_data_event_idx").on(t.eventId),
    index("collection_data_contributor_idx").on(t.contributor),
  ],
);

export const fxRates = pgTable(
  "fx_rates",
  {
    date: date("date", { mode: "string" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    rateToUsd: real("rate_to_usd").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.date, t.currency] }),
    // latest rate per currency
    index("fx_rates_currency_date_idx").on(
      t.currency,
      t.date.desc().nullsFirst(),
    ),
  ],
);

export const collectionPriceStats = pgTable("collection_price_stats", {
  collectionId: varchar("collection_id", { length: 36 }).primaryKey(),
  medianPriceUsd: real("median_price_usd").notNull(),
  listingCount: integer("listing_count").notNull(),
  minPriceUsd: real("min_price_usd").notNull(),
  maxPriceUsd: real("max_price_usd").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Daily snapshot of `collection_price_stats`, written by the same job. The last
 * run of each UTC day wins, so a collection has at most one row per day.
 */
export const collectionPriceHistory = pgTable(
  "collection_price_history",
  {
    collectionId: varchar("collection_id", { length: 36 }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    floorUsd: real("floor_usd").notNull(),
    medianUsd: real("median_usd").notNull(),
    listingCount: integer("listing_count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.date] })],
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
  ],
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
  ],
);

export const gravityPolls = pgTable(
  "gravity_polls",
  {
    id: serial("id").primaryKey(),
    cosmoGravityId: integer("cosmo_gravity_id").notNull(),
    cosmoId: integer("cosmo_id").notNull(),
    pollIdOnChain: integer("poll_id_on_chain").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
  },
  (t) => [
    index("gravity_polls_cosmo_gravity_id_idx").on(t.cosmoGravityId),
    index("gravity_polls_cosmo_id_idx").on(t.cosmoId),
    index("gravity_polls_poll_id_on_chain_idx").on(t.pollIdOnChain),
  ],
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
      t.cosmoGravityPollId,
    ),
    index("gravity_poll_candidates_candidate_id_idx").on(t.candidateId),
    index("gravity_poll_candidates_cosmo_id_idx").on(t.cosmoId),
  ],
);

export const polygonVotes = pgTable(
  "polygon_votes",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    contract: citext("contract", { length: 42 }).notNull(),
    pollId: integer("poll_id").notNull(),
    candidateId: integer("candidate_id"),
    index: integer("index").notNull(),
    amount: integer("amount").notNull(),
    blockNumber: integer("block_number").notNull(),
    hash: varchar("hash", { length: 66 }).notNull(),
  },
  (t) => [
    index("polygon_votes_address_idx").on(t.address),
    index("polygon_votes_poll_id_idx").on(t.pollId),
    index("polygon_votes_contract_poll_id_idx").on(t.contract, t.pollId),
  ],
);

// #region Moderation
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt,
    reporterId: text("reporter_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetType: reportTargetType("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: varchar("reason", { length: 32 }).$type<ReportReason>().notNull(),
    note: varchar("note", { length: 1000 }),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
  },
  (t) => [
    // one open report per reporter and target; escalated reports are still open
    uniqueIndex("reports_open_reporter_target_idx")
      .on(t.reporterId, t.targetType, t.targetId)
      .where(sql`${t.status} IN ('open', 'escalated')`),
    // serves the staff queue's keyset paging
    index("reports_status_created_idx").on(t.status, t.createdAt, t.id),
    index("reports_target_idx").on(t.targetType, t.targetId),
    check(
      "reports_resolved_chk",
      sql`(${t.status} IN ('resolved', 'dismissed')) = (${t.resolvedAt} IS NOT NULL)`,
    ),
  ],
);

/**
 * Append-only log of staff reads and actions. `staff_id` has no foreign key,
 * so the rows outlive a staff member's deleted account.
 */
export const staffAudit = pgTable(
  "staff_audit",
  {
    id: serial("id").primaryKey(),
    createdAt,
    staffId: text("staff_id").notNull(),
    action: varchar("action", { length: 48 })
      .$type<StaffAuditAction>()
      .notNull(),
    targetType: varchar("target_type", { length: 16 })
      .$type<StaffAuditTargetType>()
      .notNull(),
    targetId: text("target_id").notNull(),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    detail: jsonb("detail").$type<StaffAuditDetail>(),
  },
  (t) => [
    index("staff_audit_staff_idx").on(t.staffId, t.id),
    index("staff_audit_action_idx").on(t.action, t.id),
    index("staff_audit_report_idx").on(t.reportId),
    index("staff_audit_target_idx").on(t.targetType, t.targetId),
  ],
);
// #endregion

// #region Trades
/**
 * Inlines constant enum values into a check or index predicate, which
 * drizzle-kit can't parameterise.
 */
function sqlValues(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}

const tradeTimestamp = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true });

/**
 * Listings and the trades they turn into, plus direct offers, which are
 * trades that start pending. `from` is the poster or the offer's sender, and
 * `to` the claimer, buyer or recipient; a listing has no `to`. Both addresses
 * are pinned when the row is created or accepted, and the drain compares
 * transfers against them. Parties are set null when their account is
 * deleted, which live trades block.
 *
 * The collection arrays copy the indexer's values verbatim for every objekt a
 * listing offers, so the feed's filters run without crossing databases.
 */
export const tradeOffers = pgTable(
  "trade_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: tradeOfferKind("kind").notNull(),
    status: tradeOfferStatus("status").notNull(),
    fromUserId: varchar("from_user_id", { length: 32 }).references(
      () => user.id,
      { onDelete: "set null" },
    ),
    toUserId: varchar("to_user_id", { length: 32 }).references(() => user.id, {
      onDelete: "set null",
    }),
    fromAddress: citext("from_address", { length: 42 }).notNull(),
    toAddress: citext("to_address", { length: 42 }),
    // the offer a counter replies to
    parentId: uuid("parent_id").references((): AnyPgColumn => tradeOffers.id, {
      onDelete: "set null",
    }),
    // judged against the drain's chain-time watermark, not the clock
    deadlineAt: tradeTimestamp("deadline_at"),
    // listings with a payment side
    offers: listingOfferMode("offers"),
    slugs: varchar("slugs", { length: 255 }).array().notNull().default([]),
    artists: varchar("artists", { length: 32 }).array().notNull().default([]),
    seasons: varchar("seasons", { length: 32 }).array().notNull().default([]),
    members: varchar("members", { length: 32 }).array().notNull().default([]),
    classes: varchar("classes", { length: 8 }).array().notNull().default([]),
    onOfflines: varchar("on_offlines", { length: 16 })
      .array()
      .notNull()
      .default([]),
    cancelledBy: tradeCanceller("cancelled_by"),
    abandonedBy: tradeSide("abandoned_by").array(),
    disputeReportId: uuid("dispute_report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    note: varchar("note", { length: 500 }),
    createdAt: tradeTimestamp("created_at").notNull().defaultNow(),
    /**
     * Moves on every update, so accepting can refuse a listing that changed
     * after the claimer opened it. Listing writes set it from the database
     * clock, never less than a millisecond past the old value, so it strictly
     * increases; `$onUpdate` covers every other writer. Millisecond
     * precision, so the value survives a round trip through a JS Date.
     */
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // a pending direct offer's answer window; listings don't expire
    expiresAt: tradeTimestamp("expires_at"),
    acceptedAt: tradeTimestamp("accepted_at"),
    endedAt: tradeTimestamp("ended_at"),
  },
  (t) => [
    // the feed, a backward scan for `order by created_at desc, id desc`
    index("trade_offers_feed_idx")
      .on(t.createdAt, t.id)
      .where(sql`${t.kind} = 'listing' AND ${t.status} = 'open'`),
    /**
     * Offering narrows on any subset of these offered-objekt columns before
     * the per-objekt EXISTS over the items. At 50k open listings a selective
     * Offering page reads about 1,900 buffers through it against 61,000
     * through the items alone. Looking for has no listing-level arrays and
     * walks the feed index, probing each listing's wants.
     */
    index("trade_offers_feed_filters_idx")
      .using(
        "gin",
        t.slugs,
        t.artists,
        t.seasons,
        t.members,
        t.classes,
        t.onOfflines,
      )
      .where(sql`${t.kind} = 'listing' AND ${t.status} = 'open'`),
    // my trades, sales pages, claim caps and the deletion check
    index("trade_offers_from_user_idx").on(t.fromUserId, t.status),
    index("trade_offers_to_user_idx").on(t.toUserId, t.status),
    check(
      "trade_offers_status_chk",
      sql`CASE ${t.kind} WHEN 'listing' THEN ${t.status} IN (${sqlValues(listingStatuses)}) ELSE ${t.status} IN (${sqlValues(tradeStatuses)}) END`,
    ),
    check(
      "trade_offers_listing_chk",
      sql`${t.kind} = 'trade' OR num_nulls(${t.toUserId}, ${t.toAddress}, ${t.parentId}, ${t.deadlineAt}, ${t.acceptedAt}, ${t.expiresAt}) = 6`,
    ),
    check(
      "trade_offers_trade_chk",
      sql`${t.kind} = 'listing' OR (${t.toAddress} IS NOT NULL AND ${t.offers} IS NULL AND ${t.note} IS NULL)`,
    ),
    check(
      "trade_offers_accepted_chk",
      sql`${t.status} NOT IN ('accepted', 'disputed', 'completed', 'timed_out') OR (${t.deadlineAt} IS NOT NULL AND ${t.acceptedAt} IS NOT NULL)`,
    ),
    check(
      "trade_offers_ended_chk",
      sql`(${t.status} IN (${sqlValues(endedStatuses)})) = (${t.endedAt} IS NOT NULL)`,
    ),
    check(
      "trade_offers_cancelled_chk",
      sql`(${t.status} = 'cancelled') = (${t.cancelledBy} IS NOT NULL)`,
    ),
    check(
      "trade_offers_abandoned_chk",
      sql`CASE WHEN ${t.status} = 'timed_out' THEN coalesce(cardinality(${t.abandonedBy}), 0) BETWEEN 1 AND 2 ELSE ${t.abandonedBy} IS NULL END`,
    ),
    check(
      "trade_offers_disputed_chk",
      sql`${t.status} <> 'disputed' OR ${t.disputeReportId} IS NOT NULL`,
    ),
  ],
);

/**
 * Everything a listing or trade moves: tokens and payments, each sent by
 * one side. A listing's own tokens are copied into its trade, keeping
 * `listing_id`. `live` is set in the same statement as every status change
 * and is only ever true on an accepted or disputed trade's tokens, so a
 * token can be in one such trade at a time. Tokens copy their collection's
 * indexer values verbatim, like the listing arrays. Any change to a listing's
 * items updates the listing row in the same transaction.
 */
export const tradeOfferItems = pgTable(
  "trade_offer_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => tradeOffers.id, { onDelete: "cascade" }),
    // the listing a trade's token came from
    listingId: uuid("listing_id").references(() => tradeOffers.id, {
      onDelete: "set null",
    }),
    sender: tradeSide("sender").notNull(),
    kind: tradeItemKind("kind").notNull(),
    // integer like pins and binder entries; the indexer's is text
    tokenId: integer("token_id"),
    slug: varchar("slug", { length: 255 }),
    artist: varchar("artist", { length: 32 }),
    member: varchar("member", { length: 32 }),
    season: varchar("season", { length: 32 }),
    class: varchar("class", { length: 8 }),
    onOffline: varchar("on_offline", { length: 16 }),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }),
    method: paymentMethod("method"),
    live: boolean("live").notNull().default(false),
    // chain time and hash of the transfer the drain matched
    transferredAt: tradeTimestamp("transferred_at"),
    txHash: varchar("tx_hash", { length: 66 }),
    markedPaidAt: tradeTimestamp("marked_paid_at"),
    confirmedAt: tradeTimestamp("confirmed_at"),
  },
  (t) => [
    // one accepted trade per token, which also makes a listing claimable once
    uniqueIndex("trade_offer_items_live_token_idx")
      .on(t.tokenId)
      .where(sql`${t.live}`),
    // the drain's lookup of every offer a transferred token is part of
    index("trade_offer_items_token_idx").on(t.tokenId),
    index("trade_offer_items_offer_idx").on(t.offerId),
    index("trade_offer_items_listing_idx").on(t.listingId),
    check(
      "trade_offer_items_objekt_chk",
      sql`CASE ${t.kind} WHEN 'objekt' THEN num_nulls(${t.tokenId}, ${t.slug}, ${t.artist}, ${t.member}, ${t.season}, ${t.class}, ${t.onOffline}) = 0 AND num_nonnulls(${t.amount}, ${t.currency}, ${t.method}, ${t.markedPaidAt}, ${t.confirmedAt}) = 0 ELSE num_nonnulls(${t.tokenId}, ${t.slug}, ${t.artist}, ${t.member}, ${t.season}, ${t.class}, ${t.onOffline}, ${t.transferredAt}, ${t.txHash}) = 0 AND coalesce(${t.amount}, 0) > 0 AND ${t.currency} IS NOT NULL AND NOT ${t.live} END`,
    ),
    check(
      "trade_offer_items_transfer_chk",
      sql`(${t.transferredAt} IS NULL) = (${t.txHash} IS NULL)`,
    ),
  ],
);

/**
 * What a listing asks for. Exact rows name a collection and copy its indexer
 * values, range rows hold one array per column where an empty array matches
 * any value, and the payment row prices the listing. The trade side is every
 * exact and range row, all required. A listing's wants are inserted
 * together and replaced together on edit, so id order is the posted order.
 * Any change to them updates the listing row in the same transaction.
 */
export const tradeListingWants = pgTable(
  "trade_listing_wants",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => tradeOffers.id, { onDelete: "cascade" }),
    kind: tradeWantKind("kind").notNull(),
    count: smallint("count"),
    slug: varchar("slug", { length: 255 }),
    artist: varchar("artist", { length: 32 }),
    member: varchar("member", { length: 32 }),
    season: varchar("season", { length: 32 }),
    class: varchar("class", { length: 8 }),
    onOffline: varchar("on_offline", { length: 16 }),
    artists: varchar("artists", { length: 32 }).array(),
    members: varchar("members", { length: 32 }).array(),
    seasons: varchar("seasons", { length: 32 }).array(),
    classes: varchar("classes", { length: 8 }).array(),
    onOfflines: varchar("on_offlines", { length: 16 }).array(),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }),
  },
  (t) => [
    // a listing's wants in the order they were posted, which is id order
    index("trade_listing_wants_listing_idx").on(t.listingId, t.id),
    // at most one payment side
    uniqueIndex("trade_listing_wants_payment_idx")
      .on(t.listingId)
      .where(sql`${t.kind} = 'payment'`),
    check(
      "trade_listing_wants_shape_chk",
      sql`CASE ${t.kind}
        WHEN 'exact' THEN coalesce(${t.count}, 0) > 0 AND num_nulls(${t.slug}, ${t.artist}, ${t.member}, ${t.season}, ${t.class}, ${t.onOffline}) = 0 AND num_nonnulls(${t.artists}, ${t.members}, ${t.seasons}, ${t.classes}, ${t.onOfflines}, ${t.amount}, ${t.currency}) = 0
        WHEN 'range' THEN coalesce(${t.count}, 0) > 0 AND num_nulls(${t.artists}, ${t.members}, ${t.seasons}, ${t.classes}, ${t.onOfflines}) = 0 AND num_nonnulls(${t.slug}, ${t.artist}, ${t.member}, ${t.season}, ${t.class}, ${t.onOffline}, ${t.amount}, ${t.currency}) = 0
        ELSE coalesce(${t.amount}, 0) > 0 AND ${t.currency} IS NOT NULL AND num_nonnulls(${t.count}, ${t.slug}, ${t.artist}, ${t.member}, ${t.season}, ${t.class}, ${t.onOffline}, ${t.artists}, ${t.members}, ${t.seasons}, ${t.classes}, ${t.onOfflines}) = 0
      END`,
    ),
  ],
);

/**
 * A trade's chat and timeline in one stream. Text messages have a sender, or
 * none once their account is deleted, and their body is blanked 14 days after
 * the trade ends. Events are system or staff actions with a typed payload.
 */
export const tradeMessages = pgTable(
  "trade_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => tradeOffers.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id", { length: 32 }).references(() => user.id, {
      onDelete: "set null",
    }),
    kind: tradeMessageKind("kind").notNull(),
    body: varchar("body", { length: 1000 }),
    event: jsonb("event").$type<TradeEvent>(),
    createdAt: tradeTimestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("trade_messages_trade_idx").on(t.tradeId, t.id),
    check(
      "trade_messages_kind_chk",
      sql`CASE ${t.kind} WHEN 'text' THEN ${t.event} IS NULL ELSE ${t.event} IS NOT NULL AND num_nonnulls(${t.body}, ${t.senderId}) = 0 END`,
    ),
  ],
);
// #endregion

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
  ],
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
  (t) => [index("list_entries_list_idx").on(t.listId)],
);
// #endregion

/**
 * SQL for cosmo username tracking trigger
 * 
-- create trigger function to track username changes
CREATE OR REPLACE FUNCTION track_cosmo_id_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- check if username actually changed
    IF OLD.username IS DISTINCT FROM NEW.username THEN
        -- insert the address and new username into cosmo_account_changes
        INSERT INTO cosmo_account_changes (address, username)
        VALUES (NEW.address, NEW.username);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- create trigger on cosmo_account table
CREATE TRIGGER cosmo_account_username_change_trigger
AFTER UPDATE OF username ON cosmo_account
FOR EACH ROW
EXECUTE FUNCTION track_cosmo_id_changes();

 */
