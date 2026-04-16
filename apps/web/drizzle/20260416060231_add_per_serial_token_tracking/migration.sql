ALTER TYPE "list_type" ADD VALUE 'sale';--> statement-breakpoint
ALTER TABLE "objekt_list_entries" ADD COLUMN "token_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "objekt_list_entries_token_list_unique_idx" ON "objekt_list_entries" ("token_id","objekt_list_id") WHERE token_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD CONSTRAINT "objekt_lists_currency_type_chk" CHECK (("type" = 'sale') = ("currency" IS NOT NULL));