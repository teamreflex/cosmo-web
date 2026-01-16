module.exports = class Data1765001026625 {
  name = "Data1765001026625";

  async up(db) {
    // add block_number column to vote table
    await db.query(
      `ALTER TABLE "public"."vote" ADD COLUMN "block_number" int4;`,
    );

    // add hash column to vote table
    await db.query(`ALTER TABLE "public"."vote" ADD COLUMN "hash" text;`);
  }

  async down(db) {
    await db.query(`ALTER TABLE "public"."vote" DROP COLUMN "hash";`);
    await db.query(`ALTER TABLE "public"."vote" DROP COLUMN "block_number";`);
  }
};
