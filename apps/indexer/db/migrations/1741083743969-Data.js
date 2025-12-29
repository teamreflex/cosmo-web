module.exports = class Data1741083743969 {
  name = "Data1741083743969";

  async up(db) {
    // 1. drop duplicate index
    await db.query(`DROP INDEX "public"."IDX_objekt_owner_received_at"`);

    // 2. create an index specifically for the cosmo-spin account
    await db.query(
      `CREATE INDEX "IDX_objekts_spin_initial" ON "objekt" ("received_at" DESC) WHERE owner = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'`,
    );
  }

  async down(db) {
    // recreate 1
    await db.query(
      `CREATE INDEX "IDX_objekt_owner_received_at" ON "objekt" ("owner", "received_at") `,
    );

    // drop the cosmo-spin index
    await db.query(`DROP INDEX "public"."IDX_objekts_spin_initial"`);
  }
};
