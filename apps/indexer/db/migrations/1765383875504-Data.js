module.exports = class Data1765383875504 {
  name = "Data1765383875504";

  async up(db) {
    // transfer table - remove redundant indexes
    await db.query(`DROP INDEX IF EXISTS "IDX_be54ea276e0f665ffc38630fc0";`); // (from) - covered by idx_transfer_from_timestamp
    await db.query(`DROP INDEX IF EXISTS "IDX_4cbc37e8c3b47ded161f44c24f";`); // (to) - covered by idx_transfer_to_timestamp
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_collection_id";`); // duplicate of IDX_15a8d2966ae7e5e9b2ff47104f
    await db.query(`DROP INDEX IF EXISTS "IDX_98d4c0e33193fdd3edfc826c37";`); // (objekt_id) - duplicate of idx_transfer_objekt_id

    // objekt table - remove redundant indexes
    await db.query(`DROP INDEX IF EXISTS "IDX_d2ddf18405b46538e169ab03e8";`); // (owner) - covered by IDX_463f5339e811c02da943075d43
    await db.query(`DROP INDEX IF EXISTS "IDX_cc0196669f13f5958a307824a2";`); // (collection_id) - covered by IDX_objekt_collection_owner

    // como_balance table - remove redundant indexes
    await db.query(`DROP INDEX IF EXISTS "IDX_como_balance_owner";`); // (owner) - covered by IDX_como_balance_owner_token_id
    await db.query(`DROP INDEX IF EXISTS "IDX_625af50d78a8e51e688e96a331";`); // (owner) - duplicate

    // collection table - remove redundant index
    await db.query(`DROP INDEX IF EXISTS "IDX_collection_id";`); // (id) - redundant with primary key
  }

  async down(db) {
    // transfer table
    await db.query(
      `CREATE INDEX "IDX_be54ea276e0f665ffc38630fc0" ON "transfer" ("from");`,
    );
    await db.query(
      `CREATE INDEX "IDX_4cbc37e8c3b47ded161f44c24f" ON "transfer" ("to");`,
    );
    await db.query(
      `CREATE INDEX "idx_transfer_collection_id" ON "transfer" ("collection_id");`,
    );
    await db.query(
      `CREATE INDEX "IDX_98d4c0e33193fdd3edfc826c37" ON "transfer" ("objekt_id");`,
    );

    // objekt table
    await db.query(
      `CREATE INDEX "IDX_d2ddf18405b46538e169ab03e8" ON "objekt" ("owner");`,
    );
    await db.query(
      `CREATE INDEX "IDX_cc0196669f13f5958a307824a2" ON "objekt" ("collection_id");`,
    );

    // como_balance table
    await db.query(
      `CREATE INDEX "IDX_como_balance_owner" ON "como_balance" ("owner");`,
    );
    await db.query(
      `CREATE INDEX "IDX_625af50d78a8e51e688e96a331" ON "como_balance" ("owner");`,
    );

    // collection table
    await db.query(`CREATE INDEX "IDX_collection_id" ON "collection" ("id");`);
  }
};
