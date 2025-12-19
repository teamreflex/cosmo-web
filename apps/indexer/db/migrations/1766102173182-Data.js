module.exports = class Data1766102173182 {
  name = "Data1766102173182";

  async up(db) {
    // partial index for serial sort on cosmo-spin owner.
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_objekt_spin_serial
      ON objekt (serial)
      WHERE owner = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f';
    `);
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS idx_objekt_spin_serial;`);
  }
};
