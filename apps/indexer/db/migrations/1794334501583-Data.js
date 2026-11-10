module.exports = class Data1794334501583 {
  name = "Data1794334501583";

  async up(db) {
    /**
     * the processor writes the block and transaction of every vote, and reveals are matched to
     * votes by (block_number, log_index) order, so a vote without a block could never be revealed.
     */
    await db.query(
      `ALTER TABLE "vote" ALTER COLUMN "block_number" SET NOT NULL;`,
    );
    await db.query(`ALTER TABLE "vote" ALTER COLUMN "hash" SET NOT NULL;`);
  }

  async down(db) {
    await db.query(`ALTER TABLE "vote" ALTER COLUMN "hash" DROP NOT NULL;`);
    await db.query(
      `ALTER TABLE "vote" ALTER COLUMN "block_number" DROP NOT NULL;`,
    );
  }
};
