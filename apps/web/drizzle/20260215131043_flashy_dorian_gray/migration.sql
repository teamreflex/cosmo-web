ALTER TABLE "objekt_list_entries" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "objekt_list_entries" ADD COLUMN "price" real;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD COLUMN "currency" varchar(3);