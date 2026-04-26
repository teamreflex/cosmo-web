module.exports = class Data1776470400000 {
  name = "Data1776470400000";

  // outbox table for the live have/want list drain in apps/schedules
  async up(db) {
    await db.query(`
      CREATE TABLE "list_event_outbox" (
        "id" BIGSERIAL NOT NULL,
        "transfer_id" varchar(36) NOT NULL,
        "from_address" text NOT NULL,
        "to_address" text NOT NULL,
        "collection_id" varchar(36) NOT NULL,
        "token_id" text NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_list_event_outbox" PRIMARY KEY ("id")
      );
    `);
    await db.query(
      `CREATE INDEX "idx_list_event_outbox_created_at" ON "list_event_outbox" ("created_at");`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_list_event_outbox_created_at";`);
    await db.query(`DROP TABLE IF EXISTS "list_event_outbox";`);
  }
};
