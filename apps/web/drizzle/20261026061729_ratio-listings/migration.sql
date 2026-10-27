ALTER TYPE "trade_want_kind" ADD VALUE IF NOT EXISTS 'choice';--> statement-breakpoint
CREATE TABLE "trade_listing_want_options" (
	"want_id" bigint,
	"slug" varchar(255),
	"artist" varchar(32) NOT NULL,
	"member" varchar(32) NOT NULL,
	"season" varchar(32) NOT NULL,
	"class" varchar(8) NOT NULL,
	"on_offline" varchar(16) NOT NULL,
	CONSTRAINT "trade_listing_want_options_pkey" PRIMARY KEY("want_id","slug")
);
--> statement-breakpoint
ALTER TABLE "trade_offer_items" ADD COLUMN "left_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "unit_size" smallint;--> statement-breakpoint
-- existing listings keep "all for all": one unit is every objekt they offer, and at least one, for listings left with none
UPDATE "trade_offers" AS "o" SET "unit_size" = greatest((SELECT count(*) FROM "trade_offer_items" AS "i" WHERE "i"."offer_id" = "o"."id" AND "i"."kind" = 'objekt'), 1) WHERE "o"."kind" = 'listing';--> statement-breakpoint
-- claims leave their listing open; a claimed listing's trade keeps its items live
UPDATE "trade_offers" SET "status" = 'open' WHERE "kind" = 'listing' AND "status" = 'claimed';--> statement-breakpoint
-- a filled listing's objekts left its pool when the trade that took them completed
UPDATE "trade_offer_items" AS "i" SET "left_at" = "t"."ended_at" FROM "trade_offer_items" AS "ti" JOIN "trade_offers" AS "t" ON "t"."id" = "ti"."offer_id" WHERE "ti"."listing_id" = "i"."offer_id" AND "ti"."token_id" = "i"."token_id" AND "t"."status" = 'completed' AND "i"."kind" = 'objekt' AND "i"."left_at" IS NULL AND "i"."offer_id" IN (SELECT "id" FROM "trade_offers" WHERE "kind" = 'listing' AND "status" = 'filled');--> statement-breakpoint
ALTER TABLE "trade_listing_want_options" ADD CONSTRAINT "trade_listing_want_options_want_id_trade_listing_wants_id_fkey" FOREIGN KEY ("want_id") REFERENCES "trade_listing_wants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_offer_items" ADD CONSTRAINT "trade_offer_items_left_chk" CHECK ("left_at" IS NULL OR ("listing_id" IS NULL AND NOT "live"));--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_unit_size_chk" CHECK (CASE "kind" WHEN 'listing' THEN coalesce("unit_size", 0) > 0 ELSE "unit_size" IS NULL END);--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP CONSTRAINT "trade_listing_wants_shape_chk", ADD CONSTRAINT "trade_listing_wants_shape_chk" CHECK (CASE "kind"
        WHEN 'exact' THEN coalesce("count", 0) > 0 AND num_nulls("slug", "artist", "member", "season", "class", "on_offline") = 0 AND num_nonnulls("artists", "members", "seasons", "classes", "on_offlines", "amount", "currency") = 0
        WHEN 'range' THEN coalesce("count", 0) > 0 AND num_nulls("artists", "members", "seasons", "classes", "on_offlines") = 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "amount", "currency") = 0
        WHEN 'choice' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "artists", "members", "seasons", "classes", "on_offlines", "amount", "currency") = 0
        ELSE coalesce("amount", 0) > 0 AND "currency" IS NOT NULL AND num_nonnulls("count", "slug", "artist", "member", "season", "class", "on_offline", "artists", "members", "seasons", "classes", "on_offlines") = 0
      END);