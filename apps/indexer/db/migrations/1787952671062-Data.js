module.exports = class Data1787952671062 {
  name = "Data1787952671062";

  async up(db) {
    // replace (owner, collection_id) with a covering variant: minted_at serves the
    // como calendar and received_at the grouped objekt view, both index-only
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_owner_collection_minted" ON "objekt" ("owner", "collection_id") INCLUDE ("minted_at", "received_at");`,
    );
    await db.query(`DROP INDEX IF EXISTS "idx_objekt_owner_collection_id";`);

    // drop the spin serial-sort partial index: clampSpinSort remaps serial
    // sorts to newest for the spin account, so it's unreachable (PS rec #25)
    await db.query(`DROP INDEX IF EXISTS "idx_objekt_spin_serial";`);
  }

  async down(db) {
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_spin_serial" ON "objekt" ("serial") WHERE ("owner" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f');`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_owner_collection_id" ON "objekt" ("owner", "collection_id");`,
    );
    await db.query(
      `DROP INDEX IF EXISTS "idx_objekt_owner_collection_minted";`,
    );
  }
};
