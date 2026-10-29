ALTER TABLE "trade_offers" ADD COLUMN "bumped_at" timestamp(3) with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "trade_offers" SET "bumped_at" = "created_at";--> statement-breakpoint
DROP INDEX "trade_offers_feed_idx";--> statement-breakpoint
CREATE INDEX "trade_offers_feed_idx" ON "trade_offers" ("bumped_at","id") WHERE "kind" = 'listing' AND "status" = 'open';
