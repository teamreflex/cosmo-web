// Add has_audio flag to collection so we can mark collections that include audio.
module.exports = class Data1777593600000 {
  name = "Data1777593600000";

  async up(db) {
    await db.query(
      `ALTER TABLE collection ADD COLUMN IF NOT EXISTS has_audio BOOLEAN NOT NULL DEFAULT false;`,
    );
  }

  async down(db) {
    await db.query(`ALTER TABLE collection DROP COLUMN IF EXISTS has_audio;`);
  }
};
