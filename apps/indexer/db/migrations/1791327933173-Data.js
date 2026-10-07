// Addresses.SPIN in @apollo/util
const SPIN = "0xd3d5f29881ad87bb10c1100e2c709c9596de345f";

module.exports = class Data1791327933173 {
  name = "Data1791327933173";

  // collection_stats: objekt and spun counts per collection for apps/web's
  // mint-count sorts. triggers on objekt keep it exact for every writer,
  // including hot-block rollbacks and hand-run repairs, so the processor
  // never touches it. a collection's row exists while it has objekts.
  async up(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "collection_stats" (
        "collection_id" varchar(36) NOT NULL,
        "objekt_count" integer NOT NULL,
        "spun_count" integer NOT NULL,
        CONSTRAINT "PK_collection_stats" PRIMARY KEY ("collection_id")
      ) WITH (
        fillfactor = 70,
        autovacuum_vacuum_scale_factor = 0.01,
        autovacuum_analyze_scale_factor = 0.01
      );
    `);

    await db.query(`
      CREATE OR REPLACE FUNCTION collection_stats_add(cid varchar, owner text) RETURNS void
      LANGUAGE sql AS $$
        INSERT INTO collection_stats AS s (collection_id, objekt_count, spun_count)
        VALUES (cid, 1, (owner = '${SPIN}')::int)
        ON CONFLICT (collection_id) DO UPDATE
        SET objekt_count = s.objekt_count + 1,
            spun_count = s.spun_count + EXCLUDED.spun_count;
      $$;
    `);
    await db.query(`
      CREATE OR REPLACE FUNCTION collection_stats_remove(cid varchar, owner text) RETURNS void
      LANGUAGE plpgsql AS $$
      DECLARE remaining integer;
      BEGIN
        UPDATE collection_stats
        SET objekt_count = objekt_count - 1,
            spun_count = spun_count - (owner = '${SPIN}')::int
        WHERE collection_id = cid
        RETURNING objekt_count INTO remaining;
        IF remaining = 0 THEN
          DELETE FROM collection_stats WHERE collection_id = cid;
        END IF;
      END $$;
    `);
    await db.query(`
      CREATE OR REPLACE FUNCTION objekt_stats_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM collection_stats_add(NEW.collection_id, NEW.owner);
        RETURN NULL;
      END $$;
    `);
    await db.query(`
      CREATE OR REPLACE FUNCTION objekt_stats_update() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.collection_id = NEW.collection_id THEN
          UPDATE collection_stats
          SET spun_count = spun_count + (NEW.owner = '${SPIN}')::int - (OLD.owner = '${SPIN}')::int
          WHERE collection_id = NEW.collection_id;
        ELSE
          PERFORM collection_stats_remove(OLD.collection_id, OLD.owner);
          PERFORM collection_stats_add(NEW.collection_id, NEW.owner);
        END IF;
        RETURN NULL;
      END $$;
    `);
    await db.query(`
      CREATE OR REPLACE FUNCTION objekt_stats_delete() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM collection_stats_remove(OLD.collection_id, OLD.owner);
        RETURN NULL;
      END $$;
    `);

    // creating the triggers locks objekt against writes until commit, so no
    // write can land between the backfill's count and the triggers
    await db.query(`
      CREATE TRIGGER "objekt_stats_insert" AFTER INSERT ON "objekt"
      FOR EACH ROW EXECUTE FUNCTION objekt_stats_insert();
    `);
    // the WHEN clause skips the function for transfers that don't touch spin
    await db.query(`
      CREATE TRIGGER "objekt_stats_update" AFTER UPDATE OF "owner", "collection_id" ON "objekt"
      FOR EACH ROW
      WHEN (
        (OLD.owner = '${SPIN}') IS DISTINCT FROM (NEW.owner = '${SPIN}')
        OR OLD.collection_id IS DISTINCT FROM NEW.collection_id
      )
      EXECUTE FUNCTION objekt_stats_update();
    `);
    await db.query(`
      CREATE TRIGGER "objekt_stats_delete" AFTER DELETE ON "objekt"
      FOR EACH ROW EXECUTE FUNCTION objekt_stats_delete();
    `);

    await db.query(`
      INSERT INTO collection_stats (collection_id, objekt_count, spun_count)
      SELECT collection_id, count(*)::int, (count(*) FILTER (WHERE owner = '${SPIN}'))::int
      FROM objekt
      GROUP BY collection_id;
    `);
    await db.query(`ANALYZE collection_stats;`);
  }

  async down(db) {
    await db.query(`DROP TRIGGER IF EXISTS "objekt_stats_delete" ON "objekt";`);
    await db.query(`DROP TRIGGER IF EXISTS "objekt_stats_update" ON "objekt";`);
    await db.query(`DROP TRIGGER IF EXISTS "objekt_stats_insert" ON "objekt";`);
    await db.query(`DROP FUNCTION IF EXISTS objekt_stats_delete();`);
    await db.query(`DROP FUNCTION IF EXISTS objekt_stats_update();`);
    await db.query(`DROP FUNCTION IF EXISTS objekt_stats_insert();`);
    await db.query(
      `DROP FUNCTION IF EXISTS collection_stats_remove(varchar, text);`,
    );
    await db.query(
      `DROP FUNCTION IF EXISTS collection_stats_add(varchar, text);`,
    );
    await db.query(`DROP TABLE IF EXISTS "collection_stats";`);
  }
};
