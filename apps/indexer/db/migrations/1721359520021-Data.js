module.exports = class Data1721359520021 {
  name = "Data1721359520021";

  async up(db) {
    await db.query(
      `CREATE TABLE "objekt" ("id" varchar NOT NULL, "owner" text NOT NULL, "minted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL, "serial" integer NOT NULL, "transferable" boolean NOT NULL, "collection_id" varchar(36), CONSTRAINT "PK_a50fda223abd7f6ae55f2cf629f" PRIMARY KEY ("id"))`,
    );
    await db.query(
      `CREATE INDEX "IDX_d2ddf18405b46538e169ab03e8" ON "objekt" ("owner") `,
    );
    await db.query(
      `CREATE INDEX "IDX_3d4c25bad83bb3fdae75fc0692" ON "objekt" ("received_at") `,
    );
    await db.query(
      `CREATE INDEX "IDX_19209bac5cab521e9327f74013" ON "objekt" ("serial") `,
    );
    await db.query(
      `CREATE INDEX "IDX_f47af96878c586b3fbb6d9439c" ON "objekt" ("transferable") `,
    );
    await db.query(
      `CREATE INDEX "IDX_cc0196669f13f5958a307824a2" ON "objekt" ("collection_id") `,
    );
    await db.query(
      `CREATE TABLE "transfer" ("id" varchar(36) NOT NULL, "from" text NOT NULL, "to" text NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "token_id" text NOT NULL, "hash" text NOT NULL, "objekt_id" varchar, "collection_id" varchar(36), CONSTRAINT "PK_fd9ddbdd49a17afcbe014401295" PRIMARY KEY ("id"))`,
    );
    await db.query(
      `CREATE INDEX "IDX_be54ea276e0f665ffc38630fc0" ON "transfer" ("from") `,
    );
    await db.query(
      `CREATE INDEX "IDX_4cbc37e8c3b47ded161f44c24f" ON "transfer" ("to") `,
    );
    await db.query(
      `CREATE INDEX "IDX_98d4c0e33193fdd3edfc826c37" ON "transfer" ("objekt_id") `,
    );
    await db.query(
      `CREATE INDEX "IDX_15a8d2966ae7e5e9b2ff47104f" ON "transfer" ("collection_id") `,
    );
    await db.query(
      `CREATE TABLE "collection" ("id" varchar(36) NOT NULL, "contract" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "slug" text NOT NULL, "collection_id" text NOT NULL, "season" text NOT NULL, "member" text NOT NULL, "artist" text NOT NULL, "collection_no" text NOT NULL, "class" text NOT NULL, "thumbnail_image" text NOT NULL, "front_image" text NOT NULL, "back_image" text NOT NULL, "background_color" text NOT NULL, "text_color" text NOT NULL, "accent_color" text NOT NULL, "como_amount" integer NOT NULL, "on_offline" text NOT NULL, CONSTRAINT "PK_ad3f485bbc99d875491f44d7c85" PRIMARY KEY ("id"))`,
    );
    await db.query(
      `CREATE INDEX "IDX_e814aff6539600dfcc88af41fc" ON "collection" ("contract") `,
    );
    await db.query(
      `CREATE INDEX "IDX_f2c977a66579d262693a8cdbcd" ON "collection" ("created_at") `,
    );
    await db.query(
      `CREATE UNIQUE INDEX "IDX_75a6fd6eedd7fa7378de400b0a" ON "collection" ("slug") `,
    );
    await db.query(
      `CREATE INDEX "IDX_81f585f60e03d2dc803d8a4945" ON "collection" ("season") `,
    );
    await db.query(
      `CREATE INDEX "IDX_76242b6e82adf6f4ab4b388858" ON "collection" ("member") `,
    );
    await db.query(
      `CREATE INDEX "IDX_6f89ec57ebbfd978e196751051" ON "collection" ("artist") `,
    );
    await db.query(
      `CREATE INDEX "IDX_a8dbe2a49e54f73e2e7063dbb0" ON "collection" ("collection_no") `,
    );
    await db.query(
      `CREATE INDEX "IDX_d01899107849250643b52f2324" ON "collection" ("class") `,
    );
    await db.query(
      `CREATE INDEX "IDX_429351eac26f87942861266e48" ON "collection" ("on_offline") `,
    );
    await db.query(
      `CREATE TABLE "como_balance" ("id" varchar(36) NOT NULL, "contract" text NOT NULL, "owner" text NOT NULL, "amount" numeric NOT NULL, CONSTRAINT "PK_965a782766b42e9c0cf627e9295" PRIMARY KEY ("id"))`,
    );
    await db.query(
      `CREATE INDEX "IDX_e955d648996ebf3ae54bfa4c40" ON "como_balance" ("contract") `,
    );
    await db.query(
      `CREATE INDEX "IDX_625af50d78a8e51e688e96a331" ON "como_balance" ("owner") `,
    );
    await db.query(
      `CREATE INDEX "IDX_d840d7bff36ad3e0d91ea8b680" ON "como_balance" ("amount") `,
    );
    await db.query(
      `CREATE INDEX "IDX_0b05935e7f689d090d1a67a8cf" ON "como_balance" ("owner", "contract") `,
    );
    await db.query(
      `CREATE TABLE "vote" ("id" varchar(36) NOT NULL, "from" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "contract" text NOT NULL, "poll_id" integer NOT NULL, "candidate_id" integer, "index" integer NOT NULL, "amount" numeric NOT NULL, CONSTRAINT "PK_2d5932d46afe39c8176f9d4be72" PRIMARY KEY ("id"))`,
    );
    await db.query(
      `CREATE INDEX "IDX_8ea4539f32b721cfed8cb4796c" ON "vote" ("from") `,
    );
    await db.query(
      `CREATE INDEX "IDX_41065267c13533592a24836335" ON "vote" ("created_at") `,
    );
    await db.query(
      `CREATE INDEX "IDX_4c098d306adb4722a962ec89ea" ON "vote" ("contract") `,
    );
    await db.query(
      `CREATE INDEX "IDX_0d7459852150cf964af26adcf6" ON "vote" ("poll_id") `,
    );
    await db.query(
      `CREATE INDEX "IDX_8056b2df70cd298ce447bc186f" ON "vote" ("candidate_id") `,
    );
    await db.query(
      `CREATE INDEX "IDX_c630f7364ebb0c91d431679011" ON "vote" ("index") `,
    );
    await db.query(
      `CREATE INDEX "IDX_701e95fc921b4ca38caa9a4a2c" ON "vote" ("amount") `,
    );
    await db.query(
      `CREATE INDEX "IDX_b1bff3977e6bfbca8ea3747d50" ON "vote" ("contract", "poll_id", "index") `,
    );
    await db.query(
      `ALTER TABLE "objekt" ADD CONSTRAINT "FK_cc0196669f13f5958a307824a2b" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await db.query(
      `ALTER TABLE "transfer" ADD CONSTRAINT "FK_98d4c0e33193fdd3edfc826c37f" FOREIGN KEY ("objekt_id") REFERENCES "objekt"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await db.query(
      `ALTER TABLE "transfer" ADD CONSTRAINT "FK_15a8d2966ae7e5e9b2ff47104f0" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(db) {
    await db.query(`DROP TABLE "objekt"`);
    await db.query(`DROP INDEX "public"."IDX_d2ddf18405b46538e169ab03e8"`);
    await db.query(`DROP INDEX "public"."IDX_3d4c25bad83bb3fdae75fc0692"`);
    await db.query(`DROP INDEX "public"."IDX_19209bac5cab521e9327f74013"`);
    await db.query(`DROP INDEX "public"."IDX_f47af96878c586b3fbb6d9439c"`);
    await db.query(`DROP INDEX "public"."IDX_cc0196669f13f5958a307824a2"`);
    await db.query(`DROP TABLE "transfer"`);
    await db.query(`DROP INDEX "public"."IDX_be54ea276e0f665ffc38630fc0"`);
    await db.query(`DROP INDEX "public"."IDX_4cbc37e8c3b47ded161f44c24f"`);
    await db.query(`DROP INDEX "public"."IDX_98d4c0e33193fdd3edfc826c37"`);
    await db.query(`DROP INDEX "public"."IDX_15a8d2966ae7e5e9b2ff47104f"`);
    await db.query(`DROP TABLE "collection"`);
    await db.query(`DROP INDEX "public"."IDX_e814aff6539600dfcc88af41fc"`);
    await db.query(`DROP INDEX "public"."IDX_f2c977a66579d262693a8cdbcd"`);
    await db.query(`DROP INDEX "public"."IDX_75a6fd6eedd7fa7378de400b0a"`);
    await db.query(`DROP INDEX "public"."IDX_81f585f60e03d2dc803d8a4945"`);
    await db.query(`DROP INDEX "public"."IDX_76242b6e82adf6f4ab4b388858"`);
    await db.query(`DROP INDEX "public"."IDX_6f89ec57ebbfd978e196751051"`);
    await db.query(`DROP INDEX "public"."IDX_a8dbe2a49e54f73e2e7063dbb0"`);
    await db.query(`DROP INDEX "public"."IDX_d01899107849250643b52f2324"`);
    await db.query(`DROP INDEX "public"."IDX_429351eac26f87942861266e48"`);
    await db.query(`DROP TABLE "como_balance"`);
    await db.query(`DROP INDEX "public"."IDX_e955d648996ebf3ae54bfa4c40"`);
    await db.query(`DROP INDEX "public"."IDX_625af50d78a8e51e688e96a331"`);
    await db.query(`DROP INDEX "public"."IDX_d840d7bff36ad3e0d91ea8b680"`);
    await db.query(`DROP INDEX "public"."IDX_0b05935e7f689d090d1a67a8cf"`);
    await db.query(`DROP TABLE "vote"`);
    await db.query(`DROP INDEX "public"."IDX_8ea4539f32b721cfed8cb4796c"`);
    await db.query(`DROP INDEX "public"."IDX_41065267c13533592a24836335"`);
    await db.query(`DROP INDEX "public"."IDX_4c098d306adb4722a962ec89ea"`);
    await db.query(`DROP INDEX "public"."IDX_0d7459852150cf964af26adcf6"`);
    await db.query(`DROP INDEX "public"."IDX_8056b2df70cd298ce447bc186f"`);
    await db.query(`DROP INDEX "public"."IDX_c630f7364ebb0c91d431679011"`);
    await db.query(`DROP INDEX "public"."IDX_701e95fc921b4ca38caa9a4a2c"`);
    await db.query(`DROP INDEX "public"."IDX_b1bff3977e6bfbca8ea3747d50"`);
    await db.query(
      `ALTER TABLE "objekt" DROP CONSTRAINT "FK_cc0196669f13f5958a307824a2b"`,
    );
    await db.query(
      `ALTER TABLE "transfer" DROP CONSTRAINT "FK_98d4c0e33193fdd3edfc826c37f"`,
    );
    await db.query(
      `ALTER TABLE "transfer" DROP CONSTRAINT "FK_15a8d2966ae7e5e9b2ff47104f0"`,
    );
  }
};
