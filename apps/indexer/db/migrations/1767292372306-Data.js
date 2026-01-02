// Add tokenId, logIndex, candidateId columns to vote table.
// Replace contract column with tokenId (extracted from Voted event).
// This enables matching votes to reveals for candidate deanonymization.
module.exports = class Data1767292372306 {
  name = "Data1767292372306";

  async up(db) {
    // Drop the contract column and its index
    await db.query(`DROP INDEX IF EXISTS idx_vote_contract;`);
    await db.query(`ALTER TABLE vote DROP COLUMN IF EXISTS contract;`);

    // Add new columns
    await db.query(
      `ALTER TABLE vote ADD COLUMN IF NOT EXISTS token_id INT4 NOT NULL DEFAULT 0;`,
    );
    await db.query(
      `ALTER TABLE vote ADD COLUMN IF NOT EXISTS log_index INT4 NOT NULL DEFAULT 0;`,
    );
    await db.query(
      `ALTER TABLE vote ADD COLUMN IF NOT EXISTS candidate_id INT4;`,
    );

    // Remove defaults after adding (they're only needed for existing rows)
    await db.query(`ALTER TABLE vote ALTER COLUMN token_id DROP DEFAULT;`);
    await db.query(`ALTER TABLE vote ALTER COLUMN log_index DROP DEFAULT;`);

    // Add index for token_id
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_vote_token_id ON vote (token_id);`,
    );

    // Partial index for revealed votes polling query
    // Covers: WHERE poll_id = ? AND candidate_id IS NOT NULL AND block_number > ?
    // ORDER BY block_number ASC
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_vote_revealed ON vote (poll_id, block_number) WHERE candidate_id IS NOT NULL;`,
    );
  }

  async down(db) {
    // Drop new columns and indexes
    await db.query(`DROP INDEX IF EXISTS idx_vote_revealed;`);
    await db.query(`DROP INDEX IF EXISTS idx_vote_token_id;`);
    await db.query(`ALTER TABLE vote DROP COLUMN IF EXISTS token_id;`);
    await db.query(`ALTER TABLE vote DROP COLUMN IF EXISTS log_index;`);
    await db.query(`ALTER TABLE vote DROP COLUMN IF EXISTS candidate_id;`);

    // Re-add contract column
    await db.query(
      `ALTER TABLE vote ADD COLUMN IF NOT EXISTS contract TEXT NOT NULL DEFAULT '';`,
    );
    await db.query(`ALTER TABLE vote ALTER COLUMN contract DROP DEFAULT;`);
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_vote_contract ON vote (contract);`,
    );
  }
};
