module.exports = class Data1739771974876 {
  name = "Data1739771974876";

  async up(db) {
    // for querying stats for the last 24 hours
    await db.query(
      `CREATE INDEX "IDX_objekt_minted_at" ON "objekt" ("minted_at") `
    );

    // improves performance when joining objekt and collection
    await db.query(`CREATE INDEX "IDX_collection_id" ON "collection" ("id") `);

    // improves leaderboard query performance
    await db.query(
      `CREATE INDEX "IDX_objekt_collection_owner" ON "objekt" ("collection_id", "owner") `
    );
  }

  async down(db) {
    await db.query(`DROP INDEX "public"."IDX_objekt_minted_at"`);
    await db.query(`DROP INDEX "public"."IDX_collection_id"`);
    await db.query(`DROP INDEX "public"."IDX_objekt_collection_owner"`);
  }
};
