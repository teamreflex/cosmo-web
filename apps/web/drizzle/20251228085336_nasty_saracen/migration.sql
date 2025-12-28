ALTER TABLE "events" ADD COLUMN "image_url" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "seasons" jsonb DEFAULT '[]' NOT NULL;