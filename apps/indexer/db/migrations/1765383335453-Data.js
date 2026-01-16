module.exports = class Data1765383335453 {
  name = "Data1765383335453";

  async up(db) {
    // 1. create an index for the hourly stats query
    await db.query(
      `CREATE INDEX "IDX_objekt_hourly_stats" ON "objekt" ("minted_at", "collection_id");`,
    );
  }

  async down(db) {
    // 1. drop the index for the hourly stats query
    await db.query(`DROP INDEX "IDX_objekt_hourly_stats";`);
  }
};
