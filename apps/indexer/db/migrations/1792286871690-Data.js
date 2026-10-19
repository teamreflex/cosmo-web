module.exports = class Data1792286871690 {
  name = "Data1792286871690";

  async up(db) {
    // serial estimation loads every objekt in a collection (apps/schedules'
    // recompute and the processor's whole-collection estimates). a
    // collection's objekts are scattered across the heap, so without this
    // each one costs a random page read; with it the load is an index-only
    // scan. id is a key column so a collection's objekts can be range-scanned
    // by token id.
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_objekt_serial_estimation" ON "objekt" ("collection_id", "id") INCLUDE ("serial", "minted_at");`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_objekt_serial_estimation";`);
  }
};
