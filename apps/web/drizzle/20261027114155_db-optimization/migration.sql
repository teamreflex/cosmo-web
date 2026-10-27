-- cosmo_account is hot: run both statements below by hand first, CONCURRENTLY, so they apply as no-ops instead of locking the table until the release commits:
--   DROP INDEX CONCURRENTLY IF EXISTS "cosmo_account_user_id_idx";
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "cosmo_account_username_prefix_idx" ON "cosmo_account" (lower("username"::text) text_pattern_ops);
DROP INDEX IF EXISTS "cosmo_account_user_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cosmo_account_username_prefix_idx" ON "cosmo_account" (lower("username"::text) text_pattern_ops);--> statement-breakpoint
CREATE INDEX "objekt_list_entries_priced_idx" ON "objekt_list_entries" ("objekt_list_id","collection_id","price","created_at") WHERE "token_id" IS NOT NULL AND "price" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "pins_binder_id_idx" ON "pins" ("binder_id") WHERE "binder_id" IS NOT NULL;