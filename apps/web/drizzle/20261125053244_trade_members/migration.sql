-- every member a copied collection names, so the feed's member filters match a Unit collection under each of its members; existing rows start as their single member
ALTER TABLE "trade_listing_want_options" ADD COLUMN "members" varchar(32)[];--> statement-breakpoint
UPDATE "trade_listing_want_options" SET "members" = ARRAY["member"];--> statement-breakpoint
ALTER TABLE "trade_listing_want_options" ALTER COLUMN "members" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_listing_wants" ADD COLUMN "members" varchar(32)[];--> statement-breakpoint
UPDATE "trade_listing_wants" SET "members" = ARRAY["member"] WHERE "kind" = 'exact';--> statement-breakpoint
ALTER TABLE "trade_offer_items" ADD COLUMN "members" varchar(32)[];--> statement-breakpoint
UPDATE "trade_offer_items" SET "members" = ARRAY["member"] WHERE "kind" = 'objekt';--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP CONSTRAINT "trade_listing_wants_shape_chk", ADD CONSTRAINT "trade_listing_wants_shape_chk" CHECK (CASE "kind"
        WHEN 'exact' THEN coalesce("count", 0) > 0 AND num_nulls("slug", "artist", "member", "members", "season", "class", "on_offline") = 0 AND cardinality("members") > 0 AND num_nonnulls("amount", "currency") = 0
        WHEN 'range' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "members", "season", "class", "on_offline", "amount", "currency") = 0
        WHEN 'choice' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "members", "season", "class", "on_offline", "amount", "currency") = 0
        ELSE coalesce("amount", 1) > 0 AND "currency" IS NOT NULL AND num_nonnulls("count", "slug", "artist", "member", "members", "season", "class", "on_offline") = 0
      END);--> statement-breakpoint
ALTER TABLE "trade_offer_items" DROP CONSTRAINT "trade_offer_items_objekt_chk", ADD CONSTRAINT "trade_offer_items_objekt_chk" CHECK (CASE "kind" WHEN 'objekt' THEN num_nulls("token_id", "slug", "artist", "member", "members", "season", "class", "on_offline") = 0 AND cardinality("members") > 0 AND num_nonnulls("amount", "currency", "method", "marked_paid_at", "confirmed_at") = 0 ELSE num_nonnulls("token_id", "slug", "artist", "member", "members", "season", "class", "on_offline", "transferred_at", "tx_hash") = 0 AND coalesce("amount", 0) > 0 AND "currency" IS NOT NULL AND NOT "live" END);
