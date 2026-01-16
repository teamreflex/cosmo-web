module.exports = class Data1741083439703 {
  name = "Data1741083439703";

  async up(db) {
    // improves initial profile load performance
    await db.query(
      `CREATE INDEX "IDX_objekt_owner_received_at" ON "objekt" ("owner", "received_at") `,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX "public"."IDX_objekt_owner_received_at"`);
  }
};
