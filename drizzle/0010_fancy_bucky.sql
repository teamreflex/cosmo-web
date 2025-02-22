ALTER TABLE "gravities" ADD COLUMN "gravity_type" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "gravities" ADD COLUMN "poll_type" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "gravity_polls" ADD COLUMN "title" varchar(255) NOT NULL;