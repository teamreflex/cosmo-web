module.exports = class Data1792479548937 {
  name = "Data1792479548937";

  async up(db) {
    // index hygiene pass (PS recs #30, #31).

    // replace transfer_collection_timestamp_id_idx (5.6 GB) with a plain (collection_id) index (~290 MB).
    // no query reads transfers by collection alone, but the FK to collection(id) needs an index so deleting
    // a collection (a hot-block rollback) doesn't scan every transfer. btree deduplication keeps it small.
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_transfer_collection_id" ON "transfer" ("collection_id");`,
    );
    await db.query(
      `DROP INDEX IF EXISTS "transfer_collection_timestamp_id_idx";`,
    );

    // vote.token_id has one value per gravity token and each poll uses one, so the poll_id index already
    // narrows reveal lookups as far as this one could.
    await db.query(`DROP INDEX IF EXISTS "idx_vote_token_id";`);
  }

  async down(db) {
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_vote_token_id" ON "vote" ("token_id");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "transfer_collection_timestamp_id_idx" ON "transfer" ("collection_id", "timestamp" DESC, "id" DESC);`,
    );
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_collection_id";`);
  }
};
