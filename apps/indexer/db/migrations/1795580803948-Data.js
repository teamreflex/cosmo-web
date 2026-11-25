/**
 * The progress leaderboard counts a collection once for each of its members, so a Unit
 * collection counts toward every member it names, not only its pairing label.
 *
 * Every function is replaced in place, then the one-time difference moves the counts of the
 * collections whose members differ from [member]: until now the tables counted member alone.
 * That step isn't idempotent, so it lives only here, where the runner applies it once while
 * the processor is stopped.
 */
module.exports = class Data1795580803948 {
  name = "Data1795580803948";

  async up(db) {
    /**
     * Applies per-(collection, owner) copy deltas, then turns first-copy and last-copy
     * transitions into +1/-1 on the owner's four leaderboard rows for each of the
     * collection's members. Upserts run in key order, so a hand-run collection update can't
     * deadlock with a processor batch over the same rows.
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
        SELECT t.owner, m.member, s.season, s.on_offline, sum(t.delta)
        FROM transitions t
        JOIN collection c ON c.id = t.collection_id
        CROSS JOIN LATERAL unnest(c.members) AS m (member)
        CROSS JOIN LATERAL (VALUES ('', ''), (c.season, ''), ('', c.on_offline), (c.season, c.on_offline)) AS s (season, on_offline)
        WHERE t.delta <> 0 AND c.class NOT IN ('Welcome', 'Zero') AND NOT c.unobtainable
        GROUP BY t.owner, m.member, s.season, s.on_offline
        HAVING sum(t.delta) <> 0
        ORDER BY t.owner, m.member, s.season, s.on_offline
        ON CONFLICT (owner, member, season, on_offline) DO UPDATE SET count = lb.count + excluded.count;

        DELETE FROM collection_owner co
        USING unnest(p_collection_ids, p_owners) AS u (collection_id, owner)
        WHERE co.collection_id = u.collection_id AND co.owner = u.owner AND co.copies = 0;

        DELETE FROM progress_leaderboard lb
        USING (
          SELECT DISTINCT u.owner, m.member
          FROM unnest(p_collection_ids, p_owners) AS u (collection_id, owner)
          JOIN collection c ON c.id = u.collection_id
          CROSS JOIN LATERAL unnest(c.members) AS m (member)
        ) k
        WHERE lb.owner = k.owner AND lb.member = k.member AND lb.count = 0;
      $$;
    `);

    /**
     * Adds p_signs[i] (+1 or -1) of one collection to p_members[i]'s four leaderboard rows,
     * for every current owner. One statement in key order, so the lock order matches
     * leaderboard_apply_ownership and the histogram trigger fires once.
     */
    await db.query(`
      CREATE OR REPLACE FUNCTION leaderboard_apply_collection(p_collection_id varchar, p_members text[], p_signs integer[], p_season text, p_on_offline text)
      RETURNS void LANGUAGE sql AS $$
        INSERT INTO progress_leaderboard AS lb (owner, member, season, on_offline, count)
        SELECT co.owner, m.member, s.season, s.on_offline, m.sign
        FROM collection_owner co
        CROSS JOIN unnest(p_members, p_signs) AS m (member, sign)
        CROSS JOIN (VALUES ('', ''), (p_season, ''), ('', p_on_offline), (p_season, p_on_offline)) AS s (season, on_offline)
        WHERE co.collection_id = p_collection_id
        ORDER BY co.owner, m.member, s.season, s.on_offline
        ON CONFLICT (owner, member, season, on_offline) DO UPDATE SET count = lb.count + excluded.count;

        DELETE FROM progress_leaderboard lb
        USING collection_owner co
        WHERE co.collection_id = p_collection_id AND lb.owner = co.owner AND lb.member = ANY (p_members) AND lb.count = 0;
      $$;
    `);

    /**
     * A change to season, on_offline, class or unobtainable moves the whole collection.
     * A change to members alone moves only the members that left or joined, so the label's
     * rows and their histogram buckets aren't churned.
     */
    await db.query(`
      CREATE OR REPLACE FUNCTION leaderboard_collection_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        removed text[];
        added text[];
      BEGIN
        IF (old.season, old.on_offline, old.class, old.unobtainable)
          IS DISTINCT FROM (new.season, new.on_offline, new.class, new.unobtainable) THEN
          IF old.class NOT IN ('Welcome', 'Zero') AND NOT old.unobtainable THEN
            PERFORM leaderboard_apply_collection(old.id, old.members, array_fill(-1, ARRAY[cardinality(old.members)]), old.season, old.on_offline);
          END IF;
          IF new.class NOT IN ('Welcome', 'Zero') AND NOT new.unobtainable THEN
            PERFORM leaderboard_apply_collection(new.id, new.members, array_fill(1, ARRAY[cardinality(new.members)]), new.season, new.on_offline);
          END IF;
        ELSIF new.class NOT IN ('Welcome', 'Zero') AND NOT new.unobtainable THEN
          removed := ARRAY(SELECT unnest(old.members) EXCEPT SELECT unnest(new.members));
          added := ARRAY(SELECT unnest(new.members) EXCEPT SELECT unnest(old.members));
          PERFORM leaderboard_apply_collection(
            new.id,
            removed || added,
            array_fill(-1, ARRAY[cardinality(removed)]) || array_fill(1, ARRAY[cardinality(added)]),
            new.season,
            new.on_offline
          );
        END IF;
        RETURN NULL;
      END
      $$;
    `);

    // the processor rewrites these columns on every transfer, so WHEN skips unchanged rows
    await db.query(`
      CREATE OR REPLACE TRIGGER "collection_leaderboard_update"
        AFTER UPDATE OF members, season, on_offline, class, unobtainable ON "collection"
        FOR EACH ROW
        WHEN ((old.members, old.season, old.on_offline, old.class, old.unobtainable)
          IS DISTINCT FROM (new.members, new.season, new.on_offline, new.class, new.unobtainable))
        EXECUTE FUNCTION leaderboard_collection_trigger();
    `);
    await db.query(
      `DROP FUNCTION IF EXISTS leaderboard_apply_collection(varchar, text, text, text, integer);`,
    );

    // the one-time difference: +1 for every member beside the label, -1 for a label members lacks
    await db.query(`
      DO $$
      DECLARE
        r record;
      BEGIN
        FOR r IN
          SELECT c.id, c.season, c.on_offline, d.members, d.signs
          FROM collection c
          CROSS JOIN LATERAL (
            SELECT array_agg(x.member ORDER BY x.member) AS members, array_agg(x.sign ORDER BY x.member) AS signs
            FROM (
              SELECT m AS member, 1 AS sign FROM unnest(c.members) AS m WHERE m <> c.member
              UNION ALL
              SELECT c.member, -1 WHERE NOT c.member = ANY (c.members)
            ) x
          ) d
          WHERE c.class NOT IN ('Welcome', 'Zero') AND NOT c.unobtainable AND c.members <> ARRAY[c.member]
          ORDER BY c.id
        LOOP
          PERFORM leaderboard_apply_collection(r.id, r.members, r.signs, r.season, r.on_offline);
        END LOOP;
      END
      $$;
    `);

    /**
     * What progress_leaderboard holds when it's correct, computed from collection_owner.
     * A full rebuild inserts from it, and a drift check compares the table against it; both
     * read every owned collection, so neither belongs on a request path.
     */
    await db.query(`
      CREATE OR REPLACE VIEW progress_leaderboard_expected AS
      SELECT co.owner, m.member, s.season, s.on_offline, count(*)::integer AS count
      FROM collection_owner co
      JOIN collection c ON c.id = co.collection_id
      CROSS JOIN LATERAL unnest(c.members) AS m (member)
      CROSS JOIN LATERAL (VALUES ('', ''), (c.season, ''), ('', c.on_offline), (c.season, c.on_offline)) AS s (season, on_offline)
      WHERE c.class NOT IN ('Welcome', 'Zero') AND NOT c.unobtainable
      GROUP BY co.owner, m.member, s.season, s.on_offline;
    `);
  }

  async down(db) {
    await db.query(`DROP VIEW IF EXISTS progress_leaderboard_expected;`);

    // reverse the difference with the members-aware functions, before they're replaced
    await db.query(`
      DO $$
      DECLARE
        r record;
      BEGIN
        FOR r IN
          SELECT c.id, c.season, c.on_offline, d.members, d.signs
          FROM collection c
          CROSS JOIN LATERAL (
            SELECT array_agg(x.member ORDER BY x.member) AS members, array_agg(x.sign ORDER BY x.member) AS signs
            FROM (
              SELECT m AS member, -1 AS sign FROM unnest(c.members) AS m WHERE m <> c.member
              UNION ALL
              SELECT c.member, 1 WHERE NOT c.member = ANY (c.members)
            ) x
          ) d
          WHERE c.class NOT IN ('Welcome', 'Zero') AND NOT c.unobtainable AND c.members <> ARRAY[c.member]
          ORDER BY c.id
        LOOP
          PERFORM leaderboard_apply_collection(r.id, r.members, r.signs, r.season, r.on_offline);
        END LOOP;
      END
      $$;
    `);

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
      CREATE OR REPLACE TRIGGER "collection_leaderboard_update"
        AFTER UPDATE OF member, season, on_offline, class, unobtainable ON "collection"
        FOR EACH ROW
        WHEN ((old.member, old.season, old.on_offline, old.class, old.unobtainable)
          IS DISTINCT FROM (new.member, new.season, new.on_offline, new.class, new.unobtainable))
        EXECUTE FUNCTION leaderboard_collection_trigger();
    `);
    await db.query(
      `DROP FUNCTION IF EXISTS leaderboard_apply_collection(varchar, text[], integer[], text, text);`,
    );
  }
};
