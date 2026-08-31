module.exports = class Data1788133922106 {
  name = "Data1788133922106";

  async up(db) {
    // covering owner indexes for the profile blockchain views: the id-first
    // page subquery filters on transferable/collection_id and sorts on
    // received_at or serial, so keeping those in the index makes paged and
    // filtered walks over large accounts index-only instead of doing a
    // random heap fetch per scanned row
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_owner_received_at" ON "objekt" ("owner", "received_at" DESC, "id") INCLUDE ("collection_id", "transferable");`,
    );
    // (owner, serial): without it, serial sorts walk the global serial index
    // and heap-filter by owner — 3M+ rows discarded on large accounts
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_owner_serial" ON "objekt" ("owner", "serial", "id") INCLUDE ("collection_id", "transferable");`,
    );
    // add transferable to the grouped-view index so transferable-filtered
    // collection groups stay index-only
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_owner_collection_incl" ON "objekt" ("owner", "collection_id") INCLUDE ("minted_at", "received_at", "transferable");`,
    );
    await db.query(`DROP INDEX IF EXISTS "IDX_463f5339e811c02da943075d43";`);
    await db.query(
      `DROP INDEX IF EXISTS "idx_objekt_owner_collection_minted";`,
    );
    // bare received_at index: zero scans in pg_stat since the 2026-08-27
    // restart; nothing orders objekts by received_at without an owner
    await db.query(`DROP INDEX IF EXISTS "IDX_3d4c25bad83bb3fdae75fc0692";`);
  }

  async down(db) {
    await db.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3d4c25bad83bb3fdae75fc0692" ON "objekt" ("received_at");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_owner_collection_minted" ON "objekt" ("owner", "collection_id") INCLUDE ("minted_at", "received_at");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "IDX_463f5339e811c02da943075d43" ON "objekt" ("owner", "received_at" DESC);`,
    );
    await db.query(`DROP INDEX IF EXISTS "idx_objekt_owner_collection_incl";`);
    await db.query(`DROP INDEX IF EXISTS "idx_objekt_owner_serial";`);
    await db.query(`DROP INDEX IF EXISTS "idx_objekt_owner_received_at";`);
  }
};
