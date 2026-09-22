DROP INDEX "objekt_list_entries_list_idx";--> statement-breakpoint
CREATE INDEX "objekt_list_entries_list_created_idx" ON "objekt_list_entries" ("objekt_list_id","created_at");