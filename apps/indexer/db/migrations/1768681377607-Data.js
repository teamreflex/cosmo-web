module.exports = class Data1768681377607 {
  name = "Data1768681377607";

  async up(db) {
    // covering index for COMO calendar
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_como_calendar ON collection (class, artist, id);
    `);
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS idx_como_calendar;`);
  }
};
