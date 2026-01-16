module.exports = class Data1736335176223 {
  name = "Data1736335176223";

  // profiles initially load using the owner and received_at columns, so creating a covering index should optimize that query
  async up(db) {
    await db.query(
      `CREATE INDEX "IDX_463f5339e811c02da943075d43" ON "objekt" ("owner", "received_at" DESC) `,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX "public"."IDX_463f5339e811c02da943075d43"`);
  }
};
