/**
 * Progress leaderboard kept current by triggers on objekt and collection, replacing the
 * per-request count over every objekt of a member's collections, plus a histogram of
 * leaderboard counts so an owner's rank is a sum over a few hundred buckets.
 *
 * Every statement is idempotent and the backfill only fills empty tables, so on a large
 * database run these statements by hand first (autocommit, processor stopped) and let this
 * migration apply as a no-op. Inside the runner's single transaction, the fill would hold
 * the lock from adding collection.unobtainable (blocking reads of collection) for minutes.
 *
 * A full reindex from the start block would run every transfer through the triggers:
 * disable them, reindex, truncate all three tables and re-run the backfill instead.
 */
module.exports = class Data1792234623962 {
  name = "Data1792234623962";

  async up(db) {
    /**
     * Collections excluded from the leaderboard and progress totals, set by hand once a
     * collection can no longer be obtained. The processor maps it but never assigns it.
     */
    await db.query(
      `ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "unobtainable" boolean NOT NULL DEFAULT false;`,
    );
    await db.query(`
      UPDATE "collection" SET "unobtainable" = true
      WHERE NOT "unobtainable" AND "slug" IN (
        -- test
        'atom01-artmstest-100u',
        -- error in minting
        'atom01-jinsoul-109a',
        -- artms 1st anniversary events
        'atom01-heejin-346z',
        'atom01-haseul-346z',
        'atom01-kimlip-346z',
        'atom01-jinsoul-346z',
        'atom01-choerry-346z',
        -- chilsung event
        'atom01-heejin-351z',
        'atom01-haseul-351z',
        'atom01-kimlip-351z',
        'atom01-jinsoul-351z',
        'atom01-choerry-351z',
        -- virtual angel events
        'binary01-heejin-310z',
        'binary01-haseul-310z',
        'binary01-kimlip-310z',
        'binary01-jinsoul-310z',
        'binary01-choerry-310z',
        -- lunar theory events
        'cream01-haseul-330z',
        'cream01-heejin-330z',
        'cream01-kimlip-330z',
        'cream01-jinsoul-330z',
        'cream01-choerry-330z',
        -- burn event
        'cream01-heejin-333z',
        'cream01-haseul-333z',
        'cream01-kimlip-333z',
        'cream01-jinsoul-333z',
        'cream01-choerry-333z',
        -- zero class
        'atom01-triples-000z',
        'atom01-aaa-000z',
        'atom01-kre-000z',
        -- error in minting
        'binary01-mayu-101a',
        'binary01-mayu-104a',
        'binary01-mayu-105a',
        'binary01-mayu-106a',
        'binary01-mayu-107a',
        'binary01-mayu-108a',
        -- self-made events
        'divine01-seoyeon-312z',
        'divine01-hyerin-312z',
        'divine01-jiwoo-312z',
        'divine01-chaeyeon-312z',
        'divine01-yooyeon-312z',
        'divine01-soomin-312z',
        'divine01-nakyoung-312z',
        'divine01-yubin-312z',
        'divine01-kaede-312z',
        'divine01-dahyun-312z',
        'divine01-kotone-312z',
        'divine01-yeonji-312z',
        'divine01-nien-312z',
        'divine01-sohyun-312z',
        'divine01-xinyu-312z',
        'divine01-mayu-312z',
        'divine01-lynn-312z',
        'divine01-joobin-312z',
        'divine01-hayeon-312z',
        'divine01-shion-312z',
        'divine01-chaewon-312z',
        'divine01-sullin-312z',
        'divine01-seoah-312z',
        'divine01-jiyeon-312z',
        -- love poison streaming event
        'divine01-haseul-331z',
        -- can you entertain streaming event
        'divine01-kimlip-337z',
        -- ring of chaos streaming event
        'divine01-jinsoul-338z',
        -- pressure streaming event
        'divine01-choerry-339z',
        -- savior streaming event
        'divine01-heejin-340z',
        -- 22/05/26 minting error
        'binary01-hyerin-118a',
        'binary01-seoyeon-119a',
        'binary01-dahyun-117a',
        'binary01-chaeyeon-120a',
        'binary01-yubin-118a',
        'binary01-nakyoung-118a',
        'binary01-kaede-120a',
        'binary01-nien-120a',
        'binary01-sohyun-103a',
        'binary01-hyerin-120a',
        'binary01-nien-118a',
        'binary01-mayu-119a',
        'binary01-yooyeon-118a',
        'binary01-kotone-117a',
        'binary01-xinyu-120a',
        'atom01-heejin-111a'
      );
    `);

    /**
     * Copies each owner holds of each collection (SPIN excluded), so the triggers can
     * tell when an owner gains their first or loses their last copy.
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS "collection_owner" (
        "collection_id" varchar(36) NOT NULL,
        "owner" text NOT NULL,
        "copies" integer NOT NULL,
        CONSTRAINT "collection_owner_pkey" PRIMARY KEY ("collection_id", "owner")
      );
    `);

    /**
     * Distinct obtainable collections each owner holds per member, per season and
     * online type. An empty season or on_offline is the total across all of them.
     * count is indexed, so no update is HOT and every change leaves a dead row version in
     * the heap and both indexes: vacuum after about an hour of churn rather than the
     * default 20% of the table.
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS "progress_leaderboard" (
        "owner" text NOT NULL,
        "member" text NOT NULL,
        "season" text NOT NULL,
        "on_offline" text NOT NULL,
        "count" integer NOT NULL,
        CONSTRAINT "progress_leaderboard_pkey" PRIMARY KEY ("owner", "member", "season", "on_offline")
      ) WITH (
        autovacuum_vacuum_scale_factor = 0,
        autovacuum_vacuum_threshold = 10000,
        autovacuum_vacuum_insert_scale_factor = 0,
        autovacuum_vacuum_insert_threshold = 10000
      );
    `);

    /**
     * How many owners hold each count per member, season and online type, so an owner's
     * rank is the sum of the buckets above their count. Buckets that empty out stay at 0
     * rather than churning the primary key, and owners is unindexed so updates stay HOT.
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS "progress_histogram" (
        "member" text NOT NULL,
        "season" text NOT NULL,
        "on_offline" text NOT NULL,
        "count" integer NOT NULL,
        "owners" integer NOT NULL,
        CONSTRAINT "progress_histogram_pkey" PRIMARY KEY ("member", "season", "on_offline", "count")
      ) WITH (fillfactor = 90);
    `);

    // backfill, skipped once the tables hold data
    await db.query(`
      INSERT INTO collection_owner (collection_id, owner, copies)
      SELECT collection_id, owner, count(*)
      FROM objekt
      WHERE owner <> '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'
        AND collection_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM collection_owner)
      GROUP BY collection_id, owner
      ORDER BY collection_id, owner;
    `);
    await db.query(`
      INSERT INTO progress_leaderboard (owner, member, season, on_offline, count)
      SELECT co.owner, c.member, s.season, s.on_offline, count(*)
      FROM collection_owner co
      JOIN collection c ON c.id = co.collection_id
      CROSS JOIN LATERAL (VALUES ('', ''), (c.season, ''), ('', c.on_offline), (c.season, c.on_offline)) AS s (season, on_offline)
      WHERE c.class NOT IN ('Welcome', 'Zero')
        AND NOT c.unobtainable
        AND NOT EXISTS (SELECT 1 FROM progress_leaderboard)
      GROUP BY co.owner, c.member, s.season, s.on_offline
      ORDER BY co.owner, c.member, s.season, s.on_offline;
    `);

    // top 25 for a member, season and online type, ties ordered by owner
    await db.query(
      `CREATE INDEX IF NOT EXISTS "idx_progress_leaderboard_top" ON "progress_leaderboard" ("member", "season", "on_offline", "count" DESC, "owner");`,
    );

    // inserted in key order so each variant's buckets share a few pages
    await db.query(`
      INSERT INTO progress_histogram (member, season, on_offline, count, owners)
      SELECT member, season, on_offline, count, count(*) AS owners
      FROM progress_leaderboard
      WHERE NOT EXISTS (SELECT 1 FROM progress_histogram)
      GROUP BY member, season, on_offline, count
      ORDER BY member, season, on_offline, count;
    `);

    /**
     * Applies per-(collection, owner) copy deltas, then turns first-copy and last-copy
     * transitions into +1/-1 on the owner's four leaderboard rows for that collection.
     * Upserts run in key order, so a hand-run collection update can't deadlock with a
     * processor batch over the same rows.
     */
    await db.query(`
      CREATE OR REPLACE FUNCTION leaderboard_apply_ownership(p_collection_ids varchar[], p_owners text[], p_deltas integer[])
      RETURNS void LANGUAGE sql AS $$
        WITH changes AS (
          SELECT collection_id, owner, sum(delta)::integer AS delta
          FROM unnest(p_collection_ids, p_owners, p_deltas) AS u (collection_id, owner, delta)
          WHERE owner <> '0xd3d5f29881ad87bb10c1100e2c709c9596de345f' AND collection_id IS NOT NULL
          GROUP BY collection_id, owner
          HAVING sum(delta) <> 0
        ),
        pairs AS (
          INSERT INTO collection_owner AS co (collection_id, owner, copies)
          SELECT collection_id, owner, delta FROM changes
          ORDER BY collection_id, owner
          ON CONFLICT (collection_id, owner) DO UPDATE SET copies = co.copies + excluded.copies
          RETURNING co.collection_id, co.owner, co.copies
        ),
        transitions AS (
          SELECT p.collection_id, p.owner, (p.copies > 0)::integer - (p.copies - c.delta > 0)::integer AS delta
          FROM pairs p
          JOIN changes c USING (collection_id, owner)
        )
        INSERT INTO progress_leaderboard AS lb (owner, member, season, on_offline, count)
        SELECT t.owner, c.member, s.season, s.on_offline, sum(t.delta)
        FROM transitions t
        JOIN collection c ON c.id = t.collection_id
        CROSS JOIN LATERAL (VALUES ('', ''), (c.season, ''), ('', c.on_offline), (c.season, c.on_offline)) AS s (season, on_offline)
        WHERE t.delta <> 0 AND c.class NOT IN ('Welcome', 'Zero') AND NOT c.unobtainable
        GROUP BY t.owner, c.member, s.season, s.on_offline
        HAVING sum(t.delta) <> 0
        ORDER BY t.owner, c.member, s.season, s.on_offline
        ON CONFLICT (owner, member, season, on_offline) DO UPDATE SET count = lb.count + excluded.count;

        DELETE FROM collection_owner co
        USING unnest(p_collection_ids, p_owners) AS u (collection_id, owner)
        WHERE co.collection_id = u.collection_id AND co.owner = u.owner AND co.copies = 0;

        DELETE FROM progress_leaderboard lb
        USING (
          SELECT DISTINCT u.owner, c.member
          FROM unnest(p_collection_ids, p_owners) AS u (collection_id, owner)
          JOIN collection c ON c.id = u.collection_id
        ) k
        WHERE lb.owner = k.owner AND lb.member = k.member AND lb.count = 0;
      $$;
    `);

    // adds (+1) or removes (-1) one collection's contribution for every current owner
    await db.query(`
      CREATE OR REPLACE FUNCTION leaderboard_apply_collection(p_collection_id varchar, p_member text, p_season text, p_on_offline text, p_sign integer)
      RETURNS void LANGUAGE sql AS $$
        INSERT INTO progress_leaderboard AS lb (owner, member, season, on_offline, count)
        SELECT co.owner, p_member, s.season, s.on_offline, p_sign
        FROM collection_owner co
        CROSS JOIN (VALUES ('', ''), (p_season, ''), ('', p_on_offline), (p_season, p_on_offline)) AS s (season, on_offline)
        WHERE co.collection_id = p_collection_id
        ORDER BY co.owner, s.season, s.on_offline
        ON CONFLICT (owner, member, season, on_offline) DO UPDATE SET count = lb.count + excluded.count;

        DELETE FROM progress_leaderboard lb
        USING collection_owner co
        WHERE co.collection_id = p_collection_id AND lb.owner = co.owner AND lb.member = p_member AND lb.count = 0;
      $$;
    `);

    /**
     * Statement-level so each processor upsert batch is one call. An ON CONFLICT upsert
     * fires the INSERT and UPDATE triggers separately, which the copy counts absorb.
     */
    await db.query(`
      CREATE OR REPLACE FUNCTION leaderboard_objekt_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        collection_ids varchar[];
        owners text[];
        deltas integer[];
      BEGIN
        IF tg_op = 'INSERT' THEN
          SELECT array_agg(n.collection_id), array_agg(n.owner), array_agg(1)
          INTO collection_ids, owners, deltas
          FROM new_rows n;
        ELSIF tg_op = 'UPDATE' THEN
          -- the processor upserts every column, so skip rows whose ownership didn't change
          SELECT array_agg(x.collection_id), array_agg(x.owner), array_agg(x.delta)
          INTO collection_ids, owners, deltas
          FROM old_rows o
          JOIN new_rows n ON n.id = o.id
          CROSS JOIN LATERAL (VALUES (o.collection_id, o.owner, -1), (n.collection_id, n.owner, 1)) AS x (collection_id, owner, delta)
          WHERE (o.owner, o.collection_id) IS DISTINCT FROM (n.owner, n.collection_id);
        ELSE
          SELECT array_agg(o.collection_id), array_agg(o.owner), array_agg(-1)
          INTO collection_ids, owners, deltas
          FROM old_rows o;
        END IF;

        IF collection_ids IS NOT NULL THEN
          PERFORM leaderboard_apply_ownership(collection_ids, owners, deltas);
        END IF;
        RETURN NULL;
      END
      $$;
    `);
    await db.query(`
      CREATE OR REPLACE FUNCTION leaderboard_collection_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF old.class NOT IN ('Welcome', 'Zero') AND NOT old.unobtainable THEN
          PERFORM leaderboard_apply_collection(old.id, old.member, old.season, old.on_offline, -1);
        END IF;
        IF new.class NOT IN ('Welcome', 'Zero') AND NOT new.unobtainable THEN
          PERFORM leaderboard_apply_collection(new.id, new.member, new.season, new.on_offline, 1);
        END IF;
        RETURN NULL;
      END
      $$;
    `);

    await db.query(`
      CREATE OR REPLACE TRIGGER "objekt_leaderboard_insert" AFTER INSERT ON "objekt"
        REFERENCING NEW TABLE AS new_rows
        FOR EACH STATEMENT EXECUTE FUNCTION leaderboard_objekt_trigger();
    `);
    await db.query(`
      CREATE OR REPLACE TRIGGER "objekt_leaderboard_update" AFTER UPDATE ON "objekt"
        REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
        FOR EACH STATEMENT EXECUTE FUNCTION leaderboard_objekt_trigger();
    `);
    await db.query(`
      CREATE OR REPLACE TRIGGER "objekt_leaderboard_delete" AFTER DELETE ON "objekt"
        REFERENCING OLD TABLE AS old_rows
        FOR EACH STATEMENT EXECUTE FUNCTION leaderboard_objekt_trigger();
    `);

    // the processor rewrites these columns on every transfer, so WHEN skips unchanged rows
    await db.query(`
      CREATE OR REPLACE TRIGGER "collection_leaderboard_update"
        AFTER UPDATE OF member, season, on_offline, class, unobtainable ON "collection"
        FOR EACH ROW
        WHEN ((old.member, old.season, old.on_offline, old.class, old.unobtainable)
          IS DISTINCT FROM (new.member, new.season, new.on_offline, new.class, new.unobtainable))
        EXECUTE FUNCTION leaderboard_collection_trigger();
    `);

    /**
     * Moves owners between histogram buckets as their leaderboard counts change, so every
     * writer of progress_leaderboard keeps it current. Created after the backfill, which
     * would otherwise pass all 12M rows through a transition table.
     */
    await db.query(`
      CREATE OR REPLACE FUNCTION leaderboard_histogram_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF tg_op = 'INSERT' THEN
          INSERT INTO progress_histogram AS h (member, season, on_offline, count, owners)
          SELECT member, season, on_offline, count, count(*) AS owners
          FROM new_rows
          WHERE count > 0
          GROUP BY member, season, on_offline, count
          ORDER BY member, season, on_offline, count
          ON CONFLICT (member, season, on_offline, count) DO UPDATE SET owners = h.owners + excluded.owners;
        ELSIF tg_op = 'UPDATE' THEN
          INSERT INTO progress_histogram AS h (member, season, on_offline, count, owners)
          SELECT member, season, on_offline, count, sum(n) AS owners
          FROM (
            SELECT member, season, on_offline, count, 1 AS n FROM new_rows WHERE count > 0
            UNION ALL
            SELECT member, season, on_offline, count, -1 FROM old_rows WHERE count > 0
          ) moves
          GROUP BY member, season, on_offline, count
          HAVING sum(n) <> 0
          ORDER BY member, season, on_offline, count
          ON CONFLICT (member, season, on_offline, count) DO UPDATE SET owners = h.owners + excluded.owners;
        ELSE
          INSERT INTO progress_histogram AS h (member, season, on_offline, count, owners)
          SELECT member, season, on_offline, count, -count(*) AS owners
          FROM old_rows
          WHERE count > 0
          GROUP BY member, season, on_offline, count
          ORDER BY member, season, on_offline, count
          ON CONFLICT (member, season, on_offline, count) DO UPDATE SET owners = h.owners + excluded.owners;
        END IF;
        RETURN NULL;
      END
      $$;
    `);
    await db.query(`
      CREATE OR REPLACE TRIGGER "leaderboard_histogram_insert" AFTER INSERT ON "progress_leaderboard"
        REFERENCING NEW TABLE AS new_rows
        FOR EACH STATEMENT EXECUTE FUNCTION leaderboard_histogram_trigger();
    `);
    await db.query(`
      CREATE OR REPLACE TRIGGER "leaderboard_histogram_update" AFTER UPDATE ON "progress_leaderboard"
        REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
        FOR EACH STATEMENT EXECUTE FUNCTION leaderboard_histogram_trigger();
    `);
    await db.query(`
      CREATE OR REPLACE TRIGGER "leaderboard_histogram_delete" AFTER DELETE ON "progress_leaderboard"
        REFERENCING OLD TABLE AS old_rows
        FOR EACH STATEMENT EXECUTE FUNCTION leaderboard_histogram_trigger();
    `);
  }

  async down(db) {
    await db.query(
      `DROP TRIGGER IF EXISTS "leaderboard_histogram_delete" ON "progress_leaderboard";`,
    );
    await db.query(
      `DROP TRIGGER IF EXISTS "leaderboard_histogram_update" ON "progress_leaderboard";`,
    );
    await db.query(
      `DROP TRIGGER IF EXISTS "leaderboard_histogram_insert" ON "progress_leaderboard";`,
    );
    await db.query(`DROP FUNCTION IF EXISTS leaderboard_histogram_trigger();`);
    await db.query(
      `DROP TRIGGER IF EXISTS "collection_leaderboard_update" ON "collection";`,
    );
    await db.query(
      `DROP TRIGGER IF EXISTS "objekt_leaderboard_delete" ON "objekt";`,
    );
    await db.query(
      `DROP TRIGGER IF EXISTS "objekt_leaderboard_update" ON "objekt";`,
    );
    await db.query(
      `DROP TRIGGER IF EXISTS "objekt_leaderboard_insert" ON "objekt";`,
    );
    await db.query(`DROP FUNCTION IF EXISTS leaderboard_collection_trigger();`);
    await db.query(`DROP FUNCTION IF EXISTS leaderboard_objekt_trigger();`);
    await db.query(
      `DROP FUNCTION IF EXISTS leaderboard_apply_collection(varchar, text, text, text, integer);`,
    );
    await db.query(
      `DROP FUNCTION IF EXISTS leaderboard_apply_ownership(varchar[], text[], integer[]);`,
    );
    await db.query(`DROP TABLE IF EXISTS "progress_histogram";`);
    await db.query(`DROP TABLE IF EXISTS "progress_leaderboard";`);
    await db.query(`DROP TABLE IF EXISTS "collection_owner";`);
    await db.query(
      `ALTER TABLE "collection" DROP COLUMN IF EXISTS "unobtainable";`,
    );
  }
};
