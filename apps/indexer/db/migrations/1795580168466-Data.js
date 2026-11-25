module.exports = class Data1795580168466 {
  name = "Data1795580168466";

  async up(db) {
    /**
     * every Member trait in a collection's metadata. a Unit collection names each of its members
     * and their pairing label ("S15 x S21") as separate traits, while member holds only the label.
     * filled with [member] here; the processor writes the full list on each transfer, and a
     * hand-run backfill covers collections that don't transfer.
     */
    await db.query(
      `ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "members" text[];`,
    );
    await db.query(
      `UPDATE "collection" SET "members" = ARRAY["member"] WHERE "members" IS NULL;`,
    );
    await db.query(
      `ALTER TABLE "collection" ALTER COLUMN "members" SET NOT NULL;`,
    );
    /**
     * member filters match any of a collection's members (members && $1). without this
     * index each one scans all of collection, about 10 ms more per filtered objekt query.
     */
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_collection_members" ON "collection" USING gin ("members");`,
    );
    // array statistics, so plans that filter on members estimate their selectivity
    await db.query(`ANALYZE "collection";`);

    /**
     * member filters match a collection on any of its members, so an empty list would hide the
     * collection from every member and a repeat or NULL means the metadata was misread. a CHECK
     * can't hold a subquery, hence the function. collection is small, so the check is validated
     * against every row rather than added NOT VALID.
     */
    await db.query(`
      CREATE OR REPLACE FUNCTION collection_members_valid(p_members text[]) RETURNS boolean
      LANGUAGE sql IMMUTABLE AS $$
        SELECT cardinality(p_members) > 0
          AND array_position(p_members, NULL) IS NULL
          AND cardinality(p_members) = (SELECT count(DISTINCT m) FROM unnest(p_members) AS m)
      $$;
    `);
    await db.query(
      `ALTER TABLE "collection" DROP CONSTRAINT IF EXISTS "CHK_collection_members";`,
    );
    await db.query(
      `ALTER TABLE "collection" ADD CONSTRAINT "CHK_collection_members" CHECK (collection_members_valid("members"));`,
    );
  }

  async down(db) {
    await db.query(
      `ALTER TABLE "collection" DROP CONSTRAINT IF EXISTS "CHK_collection_members";`,
    );
    await db.query(`DROP FUNCTION IF EXISTS collection_members_valid(text[]);`);
    await db.query(`DROP INDEX IF EXISTS "idx_collection_members";`);
    await db.query(`ALTER TABLE "collection" DROP COLUMN IF EXISTS "members";`);
  }
};
