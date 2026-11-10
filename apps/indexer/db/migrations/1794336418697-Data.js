module.exports = class Data1794336418697 {
  name = "Data1794336418697";

  async up(db) {
    /**
     * vote holds the votes of every chain COSMO has run on. poll ids restart per chain, and on
     * Polygon per artist, so chain says which chain a row's poll_id, block_number and hash
     * belong to. rows written before the column existed are all Abstract.
     */
    await db.query(
      `CREATE TYPE "chain" AS ENUM ('polygon', 'abstract', 'base');`,
    );
    await db.query(
      `ALTER TABLE "vote" ADD COLUMN "chain" "chain" NOT NULL DEFAULT 'abstract';`,
    );

    /**
     * a poll's votes are found by (chain, token_id, poll_id): poll summaries and the processor's
     * reveals read all of them, and the reveal feed reads the revealed ones past a block cursor.
     */
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_vote_poll" ON "vote" ("chain", "token_id", "poll_id");`,
    );
    await db.query(`DROP INDEX IF EXISTS "idx_vote_revealed";`);
    await db.query(
      `CREATE INDEX "idx_vote_revealed" ON "vote" ("chain", "token_id", "poll_id", "block_number") WHERE candidate_id IS NOT NULL;`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_vote_revealed";`);
    await db.query(
      `CREATE INDEX "idx_vote_revealed" ON "vote" ("poll_id", "block_number") WHERE candidate_id IS NOT NULL;`,
    );
    await db.query(`DROP INDEX IF EXISTS "idx_vote_poll";`);
    await db.query(`ALTER TABLE "vote" DROP COLUMN "chain";`);
    await db.query(`DROP TYPE "chain";`);
  }
};
