module.exports = class Data1791627703101 {
  name = "Data1791627703101";

  async up(db) {
    /**
     * collection_market_stats: floor (USD), listing count and latest listing
     * time of each collection's priced sale listings, synced from the web DB by
     * apps/schedules so apps/web can filter, sort and page the market in one
     * query against collection. a row exists only while the collection is
     * listed; the processor never touches it.
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS "collection_market_stats" (
        "collection_id" varchar(36) NOT NULL,
        "floor_usd" real NOT NULL,
        "listing_count" integer NOT NULL,
        "last_listed_at" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_collection_market_stats" PRIMARY KEY ("collection_id")
      );
    `);

    // one per market sort, in its exact key order, so each page walks the
    // index from the keyset cursor instead of sorting every listed collection
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_market_stats_floor_asc" ON "collection_market_stats" ("floor_usd", "listing_count" DESC, "collection_id");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_market_stats_floor_desc" ON "collection_market_stats" ("floor_usd" DESC, "listing_count" DESC, "collection_id");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_market_stats_most_listed" ON "collection_market_stats" ("listing_count" DESC, "floor_usd", "collection_id");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_market_stats_recently_listed" ON "collection_market_stats" ("last_listed_at" DESC, "collection_id");`,
    );

    /**
     * list_event_outbox carries transferability changes beside transfers, so
     * the web drain sees a serial turn untransferable as well as move.
     * transfer rows keep their transfer id and addresses; transferability rows
     * carry the new flag instead. hash is the transaction hash, null on rows
     * written before this migration.
     *
     * every change is catalog-only: nullable columns, a constant default, and
     * a NOT VALID check that holds for new rows without scanning old ones.
     */
    await db.query(`
      ALTER TABLE "list_event_outbox"
        ADD COLUMN IF NOT EXISTS "type" varchar(16) NOT NULL DEFAULT 'transfer',
        ADD COLUMN IF NOT EXISTS "transferable" boolean,
        ADD COLUMN IF NOT EXISTS "hash" text,
        ALTER COLUMN "transfer_id" DROP NOT NULL,
        ALTER COLUMN "from_address" DROP NOT NULL,
        ALTER COLUMN "to_address" DROP NOT NULL;
    `);
    await db.query(
      `ALTER TABLE "list_event_outbox" DROP CONSTRAINT IF EXISTS "CHK_list_event_outbox_type";`,
    );
    await db.query(`
      ALTER TABLE "list_event_outbox" ADD CONSTRAINT "CHK_list_event_outbox_type" CHECK (
        CASE "type"
          WHEN 'transfer' THEN num_nonnulls("transfer_id", "from_address", "to_address") = 3 AND "transferable" IS NULL
          WHEN 'transferability' THEN num_nulls("transfer_id", "from_address", "to_address") = 3 AND "transferable" IS NOT NULL
          ELSE false
        END
      ) NOT VALID;
    `);
  }

  async down(db) {
    await db.query(
      `ALTER TABLE "list_event_outbox" DROP CONSTRAINT IF EXISTS "CHK_list_event_outbox_type";`,
    );
    await db.query(
      `DELETE FROM "list_event_outbox" WHERE "type" <> 'transfer';`,
    );
    await db.query(`
      ALTER TABLE "list_event_outbox"
        DROP COLUMN IF EXISTS "type",
        DROP COLUMN IF EXISTS "transferable",
        DROP COLUMN IF EXISTS "hash",
        ALTER COLUMN "transfer_id" SET NOT NULL,
        ALTER COLUMN "from_address" SET NOT NULL,
        ALTER COLUMN "to_address" SET NOT NULL;
    `);
    await db.query(`DROP TABLE IF EXISTS "collection_market_stats";`);
  }
};
