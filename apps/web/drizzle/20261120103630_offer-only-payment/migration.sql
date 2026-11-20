ALTER TABLE "trade_listing_wants" DROP CONSTRAINT "trade_listing_wants_shape_chk", ADD CONSTRAINT "trade_listing_wants_shape_chk" CHECK (CASE "kind"
        WHEN 'exact' THEN coalesce("count", 0) > 0 AND num_nulls("slug", "artist", "member", "season", "class", "on_offline") = 0 AND num_nonnulls("amount", "currency") = 0
        WHEN 'range' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "amount", "currency") = 0
        WHEN 'choice' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "amount", "currency") = 0
        ELSE coalesce("amount", 1) > 0 AND "currency" IS NOT NULL AND num_nonnulls("count", "slug", "artist", "member", "season", "class", "on_offline") = 0
      END);