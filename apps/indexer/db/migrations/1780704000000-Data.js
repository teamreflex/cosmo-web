module.exports = class Data1780704000000 {
  name = "Data1780704000000";

  // member reference table: canonical COSMO member sort order, synced by
  // apps/schedules and read by apps/web. the processor never touches it.
  async up(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "member" (
        "id" varchar(36) NOT NULL,
        "name" varchar(32) NOT NULL,
        "cosmo_id" integer NOT NULL,
        "artist_id" text NOT NULL,
        "alias" text NOT NULL,
        "units" jsonb NOT NULL,
        "primary_color_hex" text NOT NULL,
        "sort_order" integer NOT NULL,
        CONSTRAINT "PK_member" PRIMARY KEY ("id")
      );
    `);
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_member_name" ON "member" ("name");`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "IDX_member_name";`);
    await db.query(`DROP TABLE IF EXISTS "member";`);
  }
};
