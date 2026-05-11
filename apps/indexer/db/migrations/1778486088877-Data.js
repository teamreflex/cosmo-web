// transfer_backlog: stores transfers whose metadata fetch failed so the processor can retry them on subsequent runs.
module.exports = class Data1778486088877 {
  name = "Data1778486088877";

  async up(db) {
    await db.query(`
      CREATE TABLE "transfer_backlog" (
        "id" varchar(36) NOT NULL,
        "hash" text NOT NULL,
        "from" text NOT NULL,
        "to" text NOT NULL,
        "token_id" text NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "retry_count" integer NOT NULL,
        "last_attempt_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfer_backlog" PRIMARY KEY ("id")
      );
    `);
    await db.query(
      `CREATE UNIQUE INDEX "idx_transfer_backlog_hash_token_id" ON "transfer_backlog" ("hash", "token_id");`,
    );
    await db.query(
      `CREATE INDEX "idx_transfer_backlog_last_attempt_at" ON "transfer_backlog" ("last_attempt_at");`,
    );
    await db.query(
      `CREATE INDEX "idx_transfer_backlog_token_id" ON "transfer_backlog" ("token_id");`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_transfer_backlog_token_id";`);
    await db.query(
      `DROP INDEX IF EXISTS "idx_transfer_backlog_last_attempt_at";`,
    );
    await db.query(
      `DROP INDEX IF EXISTS "idx_transfer_backlog_hash_token_id";`,
    );
    await db.query(`DROP TABLE IF EXISTS "transfer_backlog";`);
  }
};
