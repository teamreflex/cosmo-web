CREATE TABLE "eras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"slug" citext NOT NULL UNIQUE,
	"name" varchar(128) NOT NULL,
	"description" text,
	"artist" varchar(32) NOT NULL,
	"spotify_album_id" varchar(64),
	"spotify_album_art" varchar(255),
	"start_date" timestamp,
	"end_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"era_id" uuid NOT NULL,
	"slug" citext NOT NULL UNIQUE,
	"name" varchar(128) NOT NULL,
	"description" text,
	"artist" varchar(32) NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"twitter_url" varchar(255),
	"start_date" timestamp,
	"end_date" timestamp
);
--> statement-breakpoint
ALTER TABLE "objekt_metadata" RENAME TO "collection_data";--> statement-breakpoint
ALTER INDEX "objekt_metadata_collection_idx" RENAME TO "collection_data_collection_id_idx";--> statement-breakpoint
DROP INDEX "objekt_metadata_contributor_idx";--> statement-breakpoint
ALTER TABLE "collection_data" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "collection_data" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "collection_data" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "collection_data_event_idx" ON "collection_data" ("event_id");--> statement-breakpoint
CREATE INDEX "eras_artist_idx" ON "eras" ("artist");--> statement-breakpoint
CREATE INDEX "eras_slug_idx" ON "eras" ("slug");--> statement-breakpoint
CREATE INDEX "events_artist_idx" ON "events" ("artist");--> statement-breakpoint
CREATE INDEX "events_era_idx" ON "events" ("era_id");--> statement-breakpoint
CREATE INDEX "events_slug_idx" ON "events" ("slug");--> statement-breakpoint
ALTER TABLE "collection_data" ADD CONSTRAINT "collection_data_event_id_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_era_id_eras_id_fkey" FOREIGN KEY ("era_id") REFERENCES "eras"("id") ON DELETE CASCADE;