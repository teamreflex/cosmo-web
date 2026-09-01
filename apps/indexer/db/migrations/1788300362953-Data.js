module.exports = class Data1788300362953 {
  name = "Data1788300362953";

  async up(db) {
    // one (collection_id, owner) index covers both consumers of the two it
    // replaces: the collection stats count reads transferable index-only, and
    // the per-collection owner lookups behind member-filtered profile queries
    // and the progress leaderboard walk the same (collection_id, owner) order.
    // INCLUDE rather than a key column keeps that order, which the leaderboard's
    // grouped aggregate depends on
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_collection_owner_incl" ON "objekt" ("collection_id", "owner") INCLUDE ("transferable");`,
    );
    await db.query(`DROP INDEX IF EXISTS "IDX_objekt_collection_owner";`);
    await db.query(`DROP INDEX IF EXISTS "idx_objekt_transferable_count";`);

    // spin-account partial indexes: every spin profile and transfer page query
    // plans on the owner-/address-leading covering indexes instead, so these
    // only add write cost on the two hottest tables
    await db.query(`DROP INDEX IF EXISTS "IDX_objekts_spin_initial";`);
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_timestamp_cosmo_spin";`);
  }

  async down(db) {
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_transfer_timestamp_cosmo_spin" ON "transfer" ("timestamp" DESC) WHERE "from" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f' OR "to" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f';`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "IDX_objekts_spin_initial" ON "objekt" ("received_at" DESC) WHERE "owner" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f';`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_transferable_count" ON "objekt" ("collection_id") INCLUDE ("transferable", "owner");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "IDX_objekt_collection_owner" ON "objekt" ("collection_id", "owner");`,
    );
    await db.query(`DROP INDEX IF EXISTS "idx_objekt_collection_owner_incl";`);
  }
};
