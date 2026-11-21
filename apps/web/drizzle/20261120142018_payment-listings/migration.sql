ALTER TYPE "payment_method" ADD VALUE 'other';--> statement-breakpoint
ALTER TABLE "trade_listing_wants" ADD COLUMN "option" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "payment_side" "trade_side";--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "payment_methods" "payment_method"[] DEFAULT '{}'::"payment_method"[] NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "max_units" smallint;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "units" smallint;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "listing_option" smallint;--> statement-breakpoint
DROP INDEX "trade_listing_wants_payment_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "trade_listing_wants_payment_idx" ON "trade_listing_wants" ("listing_id","option") WHERE "kind" = 'payment';--> statement-breakpoint
ALTER TABLE "trade_listing_wants" ADD CONSTRAINT "trade_listing_wants_option_chk" CHECK ("option" >= 0);--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_listing_option_chk" CHECK ("listing_option" IS NULL OR ("kind" = 'trade' AND "listing_option" >= 0));--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_units_chk" CHECK ("units" IS NULL OR ("kind" = 'trade' AND "units" > 0));--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_payment_chk" CHECK ("kind" = 'trade' OR num_nulls("payment_side", "offers", nullif(cardinality("payment_methods"), 0)) IN (0, 3));--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP CONSTRAINT "trade_listing_wants_shape_chk", ADD CONSTRAINT "trade_listing_wants_shape_chk" CHECK (CASE "kind"
        WHEN 'exact' THEN coalesce("count", 0) > 0 AND num_nulls("slug", "artist", "member", "season", "class", "on_offline") = 0 AND num_nonnulls("amount", "currency") = 0
        WHEN 'range' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "amount", "currency") = 0
        WHEN 'choice' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "amount", "currency") = 0
        ELSE coalesce("amount", 1) > 0 AND "currency" IS NOT NULL AND num_nonnulls("count", "slug", "artist", "member", "season", "class", "on_offline") = 0
      END);--> statement-breakpoint
ALTER TABLE "trade_offers" DROP CONSTRAINT "trade_offers_trade_chk", ADD CONSTRAINT "trade_offers_trade_chk" CHECK ("kind" = 'listing' OR ("to_address" IS NOT NULL AND "offers" IS NULL AND "note" IS NULL AND "payment_side" IS NULL));--> statement-breakpoint
ALTER TABLE "trade_offers" DROP CONSTRAINT "trade_offers_unit_size_chk", ADD CONSTRAINT "trade_offers_unit_size_chk" CHECK (CASE "kind" WHEN 'listing' THEN num_nulls("unit_size", "max_units") = 1 AND coalesce("unit_size", "max_units") > 0 ELSE num_nulls("unit_size", "max_units") = 2 END);--> statement-breakpoint
UPDATE "trade_offers" SET "listing_option" = 0 WHERE "kind" = 'trade' AND EXISTS (SELECT 1 FROM "trade_offer_items" WHERE "trade_offer_items"."offer_id" = "trade_offers"."id" AND "trade_offer_items"."listing_id" IS NOT NULL);
