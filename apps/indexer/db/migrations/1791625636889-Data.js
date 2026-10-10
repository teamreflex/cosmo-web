module.exports = class Data1791625636889 {
  name = "Data1791625636889";

  // collection_market_stats: floor (USD), listing count and latest listing
  // time of each collection's priced sale listings, synced from the web DB by
  // apps/schedules so apps/web can filter, sort and page the market in one
  // query against collection. a row exists only while the collection is
  // listed; the processor never touches it.
  async up(db) {
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
  }

  async down(db) {
    await db.query(`DROP TABLE IF EXISTS "collection_market_stats";`);
  }
};
