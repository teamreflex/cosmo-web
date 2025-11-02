module.exports = class Data1741780963552 {
  name = "Data1741780963552";

  async up(db) {
    // 1. create an index for loading transfers
    await db.query(
      `CREATE INDEX idx_transfer_from_timestamp ON transfer("from", "timestamp" DESC);`
    );

    // 2. create an index for loading transfers
    await db.query(
      `CREATE INDEX idx_transfer_to_timestamp ON transfer("to", "timestamp" DESC);`
    );

    // 3. specifically add an initial page load index for @cosmo-spin
    await db.query(
      `CREATE INDEX idx_transfer_timestamp_cosmo_spin ON transfer("timestamp" DESC) WHERE "from" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f' OR "to" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f';`
    );

    // 4. improve collection join performance
    await db.query(
      `CREATE INDEX idx_transfer_collection_id ON transfer(collection_id);`
    );

    // 5. improve objekt join performance
    await db.query(
      `CREATE INDEX idx_transfer_objekt_id ON transfer(objekt_id);`
    );
  }

  async down(db) {
    // 1. drop the index for loading transfers
    await db.query(`DROP INDEX "public"."idx_transfer_from_timestamp"`);

    // 2. drop the index for loading transfers
    await db.query(`DROP INDEX "public"."idx_transfer_to_timestamp"`);

    // 3. drop the index for loading transfers from @cosmo-spin
    await db.query(`DROP INDEX "public"."idx_transfer_timestamp_cosmo_spin"`);

    // 4. drop the index for improving collection join performance
    await db.query(`DROP INDEX "public"."idx_transfer_collection_id"`);

    // 5. drop the index for improving objekt join performance
    await db.query(`DROP INDEX "public"."idx_transfer_objekt_id"`);
  }
};
