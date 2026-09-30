// Versions of the front/back images mirrored into R2 (@apollo/image): a hash of
// the source URL, used as the folder in objekts/{front,back}/<slug>/<version>/.
// Null until the image has been mirrored, so readers fall back to COSMO's URL.
module.exports = class Data1790173437892 {
  name = "Data1790173437892";

  async up(db) {
    await db.query(
      `ALTER TABLE collection ADD COLUMN IF NOT EXISTS front_image_version VARCHAR(12), ADD COLUMN IF NOT EXISTS back_image_version VARCHAR(12);`,
    );
  }

  async down(db) {
    await db.query(
      `ALTER TABLE collection DROP COLUMN IF EXISTS front_image_version, DROP COLUMN IF EXISTS back_image_version;`,
    );
  }
};
