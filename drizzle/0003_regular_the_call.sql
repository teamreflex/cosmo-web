CREATE INDEX IF NOT EXISTS "locked_objekts_user_address_idx" ON "locked_objekts" ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locked_objekts_locked_idx" ON "locked_objekts" ("locked");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "address_locked_idx" ON "locked_objekts" ("user_address","locked");