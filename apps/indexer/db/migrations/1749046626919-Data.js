module.exports = class Data1749046626919 {
  name = "Data1749046626919";

  async up(db) {
    // 1. add an index on owner and collection_id for initial load
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_objekt_owner_collection_id ON objekt (owner, collection_id);`
    );
  }

  async down(db) {
    // 1. drop the index on owner and collection_id
    await db.query(`DROP INDEX IF EXISTS idx_objekt_owner_collection_id;`);
  }
};
