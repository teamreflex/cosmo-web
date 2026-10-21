module.exports = class Data1792554582229 {
  name = "Data1792554582229";

  async up(db) {
    /**
     * progress breakdowns read the collections an owner holds for one member. without an
     * owner-leading index the only path is probing objekt once per member collection, which
     * Postgres falls into under prepared-statement generic plans and which costs a random read
     * per probe. collection_owner holds one row per owned collection, so this reads one
     * contiguous range per owner.
     */
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_owner_progress" ON "collection_owner" ("owner", "collection_id");`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_collection_owner_progress";`);
  }
};
