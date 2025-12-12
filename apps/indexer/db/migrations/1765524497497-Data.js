module.exports = class Data1765524497497 {
  name = "Data1765524497497";

  async up(db) {
    // optimizes the objekt metadata transferable count query
    await db.query(
      `CREATE INDEX idx_objekt_transferable_count ON objekt (collection_id) INCLUDE (transferable, owner);`,
    );

    // drop redundant index - minted_at is the left-prefix of IDX_objekt_hourly_stats
    await db.query(`DROP INDEX IF EXISTS "IDX_objekt_minted_at";`);
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS idx_objekt_transferable_count;`);
    await db.query(
      `CREATE INDEX "IDX_objekt_minted_at" ON "objekt" ("minted_at");`,
    );
  }
};
