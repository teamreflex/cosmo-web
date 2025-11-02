-- clean up duplicate profiles
WITH latest_profiles AS (
  SELECT DISTINCT ON (user_address) *
  FROM profiles
  ORDER BY user_address, id DESC
),
cleanup AS (
  DELETE FROM profiles
  WHERE id NOT IN (SELECT id FROM latest_profiles)
  RETURNING *
)
SELECT count(*) as deleted_count FROM cleanup;--> statement-breakpoint
DROP INDEX IF EXISTS "profiles_address_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_address_idx" ON "profiles" USING btree ("user_address");