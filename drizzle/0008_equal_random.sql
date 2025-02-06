DELETE FROM "list_entries" WHERE "list_id" NOT IN (SELECT "id" FROM "lists"); -- for some reason there was orphaned entries
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;