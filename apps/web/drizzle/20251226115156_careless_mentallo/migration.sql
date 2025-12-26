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
CREATE TABLE "event_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"event_id" uuid NOT NULL,
	"collection_slug" varchar(64) NOT NULL,
	"description" varchar(255),
	"category" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"era_id" uuid,
	"slug" citext NOT NULL UNIQUE,
	"name" varchar(128) NOT NULL,
	"description" text,
	"artist" varchar(32),
	"event_type" varchar(32) NOT NULL,
	"twitter_url" varchar(255),
	"start_date" timestamp,
	"end_date" timestamp,
	"spin_available_after" timestamp,
	"is_published" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "eras_artist_idx" ON "eras" ("artist");--> statement-breakpoint
CREATE INDEX "eras_slug_idx" ON "eras" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "event_collections_unique" ON "event_collections" ("event_id","collection_slug");--> statement-breakpoint
CREATE INDEX "event_collections_slug_idx" ON "event_collections" ("collection_slug");--> statement-breakpoint
CREATE INDEX "events_artist_idx" ON "events" ("artist");--> statement-breakpoint
CREATE INDEX "events_era_idx" ON "events" ("era_id");--> statement-breakpoint
CREATE INDEX "events_slug_idx" ON "events" ("slug");--> statement-breakpoint
CREATE INDEX "events_published_idx" ON "events" ("is_published");--> statement-breakpoint
ALTER TABLE "event_collections" ADD CONSTRAINT "event_collections_event_id_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_era_id_eras_id_fkey" FOREIGN KEY ("era_id") REFERENCES "eras"("id") ON DELETE SET NULL;