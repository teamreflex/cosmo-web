module.exports = class Data1780533600000 {
  name = "Data1780533600000";

  async up(db) {
    /**
     * extends the transfer from/to pagination indexes with INCLUDE columns so
     * they also cover the third-party /api/roy profile activity counts
     * (all-time sent/received/mint/spin tallies over a wallet's full transfer
     * history) as index-only scans, instead of maintaining separate covering
     * indexes alongside the composites.
     *
     * applied manually:
     * CREATE INDEX CONCURRENTLY IF NOT EXISTS "transfer_to_timestamp_id_covering_idx" ON "transfer" ("to", "timestamp" DESC, "id" DESC) INCLUDE ("from", "collection_id");
     * CREATE INDEX CONCURRENTLY IF NOT EXISTS "transfer_from_timestamp_id_covering_idx" ON "transfer" ("from", "timestamp" DESC, "id" DESC) INCLUDE ("to", "collection_id");
     * DROP INDEX CONCURRENTLY IF EXISTS "transfer_to_timestamp_id_idx";
     * DROP INDEX CONCURRENTLY IF EXISTS "transfer_from_timestamp_id_idx";
     */
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_to_timestamp_id_covering_idx" ON "transfer" ("to", "timestamp" DESC, "id" DESC) INCLUDE ("from", "collection_id");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_from_timestamp_id_covering_idx" ON "transfer" ("from", "timestamp" DESC, "id" DESC) INCLUDE ("to", "collection_id");`,
    );
    await db.query(`DROP INDEX IF EXISTS "transfer_to_timestamp_id_idx";`);
    await db.query(`DROP INDEX IF EXISTS "transfer_from_timestamp_id_idx";`);
    // clean up the standalone covering indexes from the previous version of this migration
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_to_covering";`);
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_from_covering";`);
  }

  async down(db) {
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_to_timestamp_id_idx" ON "transfer" ("to", "timestamp" DESC, "id" DESC);`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_from_timestamp_id_idx" ON "transfer" ("from", "timestamp" DESC, "id" DESC);`,
    );
    await db.query(
      `DROP INDEX IF EXISTS "transfer_to_timestamp_id_covering_idx";`,
    );
    await db.query(
      `DROP INDEX IF EXISTS "transfer_from_timestamp_id_covering_idx";`,
    );
  }
};
