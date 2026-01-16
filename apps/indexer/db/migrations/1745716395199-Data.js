module.exports = class Data1745716395199 {
  name = "Data1745716395199";

  async up(db) {
    // 1. drop the contract column from como_balance
    await db.query(
      `ALTER TABLE "public"."como_balance" DROP COLUMN "contract";`,
    );

    // 2. add token_id column to como_balance
    await db.query(
      `ALTER TABLE "public"."como_balance" ADD COLUMN "token_id" numeric NOT NULL;`,
    );

    // 3. add an index on owner
    await db.query(
      `CREATE INDEX "IDX_como_balance_owner" ON "public"."como_balance" ("owner");`,
    );

    // 4. add an index on owner and token_id
    await db.query(
      `CREATE INDEX "IDX_como_balance_owner_token_id" ON "public"."como_balance" ("owner", "token_id");`,
    );

    // 5. add a unique constraint on owner and token_id
    await db.query(
      `ALTER TABLE "public"."como_balance" ADD CONSTRAINT "UQ_como_balance_owner_token_id" UNIQUE ("owner", "token_id");`,
    );
  }

  async down(db) {
    // 1. drop the unique constraint on owner and token_id
    await db.query(
      `ALTER TABLE "public"."como_balance" DROP CONSTRAINT "UQ_como_balance_owner_token_id";`,
    );

    // 2. drop the index on owner and token_id
    await db.query(`DROP INDEX "public"."IDX_como_balance_owner_token_id";`);

    // 3. drop the index on owner
    await db.query(`DROP INDEX "public"."IDX_como_balance_owner";`);

    // 4. drop the token_id column from como_balance
    await db.query(
      `ALTER TABLE "public"."como_balance" DROP COLUMN "token_id";`,
    );

    // 5. add the contract column to como_balance
    await db.query(
      `ALTER TABLE "public"."como_balance" ADD COLUMN "contract" text NOT NULL;`,
    );
  }
};
