module.exports = class Data1788127107480 {
  name = "Data1788127107480";

  async up(db) {
    // replace the transfer from/to pagination indexes with covering variants:
    // the transfer page's id-first subquery filters on the opposite address
    // (mint/sent/spin) and on collection_id (member/artist filters), so
    // including both lets a filtered walk over a large address history run
    // index-only instead of doing a random heap fetch per scanned row
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_from_ts_id_incl_idx" ON "transfer" ("from", "timestamp" DESC, "id" DESC) INCLUDE ("to", "collection_id");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_to_ts_id_incl_idx" ON "transfer" ("to", "timestamp" DESC, "id" DESC) INCLUDE ("from", "collection_id");`,
    );
    await db.query(`DROP INDEX IF EXISTS "transfer_from_timestamp_id_idx";`);
    await db.query(`DROP INDEX IF EXISTS "transfer_to_timestamp_id_idx";`);
  }

  async down(db) {
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_from_timestamp_id_idx" ON "transfer" ("from", "timestamp" DESC, "id" DESC);`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_to_timestamp_id_idx" ON "transfer" ("to", "timestamp" DESC, "id" DESC);`,
    );
    await db.query(`DROP INDEX IF EXISTS "transfer_from_ts_id_incl_idx";`);
    await db.query(`DROP INDEX IF EXISTS "transfer_to_ts_id_incl_idx";`);
  }
};
