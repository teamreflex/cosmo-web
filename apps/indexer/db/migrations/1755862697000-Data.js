module.exports = class Data1755862697000 {
  name = "Data1755862697000";

  async up(db) {
    // add band_image_url column to collection table
    await db.query(
      `ALTER TABLE "public"."collection" ADD COLUMN "band_image_url" varchar(255);`
    );
  }

  async down(db) {
    // drop band_image_url column from collection table
    await db.query(
      `ALTER TABLE "public"."collection" DROP COLUMN "band_image_url";`
    );
  }
};
