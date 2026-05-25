// Drop the (from, timestamp DESC) and (to, timestamp DESC) transfer indexes
// flagged by PlanetScale — together they account for ~4.3 GB / ~10% of DB
// storage, and transfer lookups by sender/receiver can be served by other
// access paths.
module.exports = class Data1779700687615 {
  name = "Data1779700687615";

  async up(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_from_timestamp";`);
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_to_timestamp";`);
  }

  async down(db) {
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_transfer_from_timestamp ON transfer("from", "timestamp" DESC);`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_transfer_to_timestamp ON transfer("to", "timestamp" DESC);`,
    );
  }
};
