module.exports = class Data1768777674546 {
  name = "Data1768777674546";

  async up(db) {
    // indexes to speed up transfer queries by address + timestamp
    await db.query(`
      CREATE INDEX IF NOT EXISTS transfer_from_timestamp_id_idx ON transfer ("from", "timestamp" DESC, id DESC);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS transfer_to_timestamp_id_idx ON transfer ("to", "timestamp" DESC, id DESC);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS transfer_collection_timestamp_id_idx ON transfer (collection_id, "timestamp" DESC, id DESC);
    `);
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS transfer_from_timestamp_id_idx;`);
    await db.query(`DROP INDEX IF EXISTS transfer_to_timestamp_id_idx;`);
    await db.query(
      `DROP INDEX IF EXISTS transfer_collection_timestamp_id_idx;`,
    );
  }
};
