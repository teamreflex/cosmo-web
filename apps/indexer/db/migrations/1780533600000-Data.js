module.exports = class Data1780533600000 {
  name = "Data1780533600000";

  async up(db) {
    /**
     * covering indexes for the third-party /api/roy profile activity counts
     * (all-time sent/received/mint/spin tallies over a wallet's full transfer history).
     *
     * applied manually:
     * CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transfer_to_covering" ON "transfer" ("to") INCLUDE ("from", "collection_id", "timestamp");
     * CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transfer_from_covering" ON "transfer" ("from") INCLUDE ("to", "collection_id", "timestamp");
     */
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_transfer_to_covering" ON "transfer" ("to") INCLUDE ("from", "collection_id", "timestamp");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_transfer_from_covering" ON "transfer" ("from") INCLUDE ("to", "collection_id", "timestamp");`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_from_covering";`);
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_to_covering";`);
  }
};
