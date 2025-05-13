ALTER TABLE "polygon_votes" ADD COLUMN "block_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "polygon_votes" ADD COLUMN "hash" varchar(66) NOT NULL;