module.exports = class Data1780533509824 {
  name = "Data1780533509824";

  async up(db) {
    // index hygiene pass. each of these is also applied live via CONCURRENTLY in psql;
    // this migration is the idempotent safety net so a from-scratch rebuild matches prod.

    // add (owner, transferable, collection_id): serves owner+transferable counts/filters
    // as an index-only scan instead of filtering transferable from the heap (PS rec #12).
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_on_owner_transferable_collection_id" ON "objekt" ("owner", "transferable", "collection_id");`,
    );

    // drop redundant left-prefixes of existing composites:
    //   IDX_15a8d2966... (transfer.collection_id) is covered by
    //     transfer_collection_timestamp_id_idx (collection_id, timestamp DESC, id DESC)
    //   IDX_d01899107... (collection.class) is covered by idx_como_calendar (class, artist, id)
    await db.query(`DROP INDEX IF EXISTS "IDX_15a8d2966ae7e5e9b2ff47104f";`);
    await db.query(`DROP INDEX IF EXISTS "IDX_d01899107849250643b52f2324";`);

    // drop the standalone (transferable) boolean index: no selectivity, 0 scans,
    // superseded by the composite added above.
    await db.query(`DROP INDEX IF EXISTS "IDX_f47af96878c586b3fbb6d9439c";`);
  }

  async down(db) {
    await db.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f47af96878c586b3fbb6d9439c" ON "objekt" ("transferable");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d01899107849250643b52f2324" ON "collection" ("class");`,
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS "IDX_15a8d2966ae7e5e9b2ff47104f" ON "transfer" ("collection_id");`,
    );
    await db.query(
      `DROP INDEX IF EXISTS "idx_objekt_on_owner_transferable_collection_id";`,
    );
  }
};
