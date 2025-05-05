ALTER TABLE "objekt_list_entries" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "objekt_list_entries" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "objekt_list_entries" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "objekt_lists" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "objekt_lists" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "objekt_lists" ALTER COLUMN "created_at" SET NOT NULL;