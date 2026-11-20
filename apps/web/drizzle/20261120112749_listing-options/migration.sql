ALTER TABLE "trade_listing_wants" ADD COLUMN "option" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "listing_option" smallint;--> statement-breakpoint
DROP INDEX "trade_listing_wants_payment_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "trade_listing_wants_payment_idx" ON "trade_listing_wants" ("listing_id","option") WHERE "kind" = 'payment';--> statement-breakpoint
ALTER TABLE "trade_listing_wants" ADD CONSTRAINT "trade_listing_wants_option_chk" CHECK ("option" >= 0);--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_listing_option_chk" CHECK ("listing_option" IS NULL OR ("kind" = 'trade' AND "listing_option" >= 0));--> statement-breakpoint
UPDATE "trade_offers" SET "listing_option" = 0 WHERE "kind" = 'trade' AND EXISTS (SELECT 1 FROM "trade_offer_items" WHERE "trade_offer_items"."offer_id" = "trade_offers"."id" AND "trade_offer_items"."listing_id" IS NOT NULL);
