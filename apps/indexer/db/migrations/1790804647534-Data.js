module.exports = class Data1790804647534 {
  name = "Data1790804647534";

  // collection_market_stats reference table: floor, listing count and latest
  // listing time of each collection's sale listings, synced from the web DB by
  // apps/schedules so apps/web can filter, sort and page the market in one
  // query against collection. the processor never touches it.
  async up(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "collection_market_stats" (
        "slug" varchar(255) NOT NULL,
        "floor_usd" real NOT NULL,
        "listing_count" integer NOT NULL,
        "last_listed_at" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_collection_market_stats" PRIMARY KEY ("slug")
      );
    `);

    // one per market sort, in its exact key order, so each page walks the
    // index from the keyset cursor instead of sorting every match
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_market_stats_floor_asc" ON "collection_market_stats" ("floor_usd", "listing_count" DESC, "slug");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_market_stats_floor_desc" ON "collection_market_stats" ("floor_usd" DESC, "listing_count" DESC, "slug");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_market_stats_most_listed" ON "collection_market_stats" ("listing_count" DESC, "floor_usd", "slug");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_market_stats_recently_listed" ON "collection_market_stats" ("last_listed_at" DESC, "slug");`,
    );
  }

  async down(db) {
    await db.query(`DROP TABLE IF EXISTS "collection_market_stats";`);
  }
};
