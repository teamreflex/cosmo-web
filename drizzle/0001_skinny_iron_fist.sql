CREATE TABLE IF NOT EXISTS "objekt_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection_id" varchar(36) NOT NULL,
	"description" varchar(255) NOT NULL,
	"dropped_at" timestamp NOT NULL,
	"user_address" "citext" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "objekt_editor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "objekt_metadata_collection_idx" ON "objekt_metadata" ("collection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "objekt_metadata_contributor_idx" ON "objekt_metadata" ("user_address");