ALTER TABLE "user" ADD COLUMN "grid_columns" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "collection_mode" text DEFAULT 'blockchain' NOT NULL;