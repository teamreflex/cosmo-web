CREATE TABLE "trade_listing_want_ranges" (
	"want_id" bigint,
	"position" smallint,
	"artists" varchar(32)[] DEFAULT '{}'::varchar(32)[] NOT NULL,
	"members" varchar(32)[] DEFAULT '{}'::varchar(32)[] NOT NULL,
	"seasons" varchar(32)[] DEFAULT '{}'::varchar(32)[] NOT NULL,
	"classes" varchar(8)[] DEFAULT '{}'::varchar(8)[] NOT NULL,
	"on_offlines" varchar(16)[] DEFAULT '{}'::varchar(16)[] NOT NULL,
	"collection_nos" varchar(8)[] DEFAULT '{}'::varchar(8)[] NOT NULL,
	CONSTRAINT "trade_listing_want_ranges_pkey" PRIMARY KEY("want_id","position")
);
--> statement-breakpoint
-- every existing range row becomes a row with one range; the old CHECK kept its arrays non-null
INSERT INTO "trade_listing_want_ranges" ("want_id", "position", "artists", "members", "seasons", "classes", "on_offlines", "collection_nos") SELECT "id", 0, "artists", "members", "seasons", "classes", "on_offlines", "collection_nos" FROM "trade_listing_wants" WHERE "kind" = 'range';--> statement-breakpoint
-- dropped before the columns it names, since dropping them drops it too and a later DROP CONSTRAINT would fail
ALTER TABLE "trade_listing_wants" DROP CONSTRAINT "trade_listing_wants_shape_chk";--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP COLUMN "artists";--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP COLUMN "members";--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP COLUMN "seasons";--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP COLUMN "classes";--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP COLUMN "on_offlines";--> statement-breakpoint
ALTER TABLE "trade_listing_wants" DROP COLUMN "collection_nos";--> statement-breakpoint
ALTER TABLE "trade_listing_want_ranges" ADD CONSTRAINT "trade_listing_want_ranges_want_id_trade_listing_wants_id_fkey" FOREIGN KEY ("want_id") REFERENCES "trade_listing_wants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_listing_wants" ADD CONSTRAINT "trade_listing_wants_shape_chk" CHECK (CASE "kind"
        WHEN 'exact' THEN coalesce("count", 0) > 0 AND num_nulls("slug", "artist", "member", "season", "class", "on_offline") = 0 AND num_nonnulls("amount", "currency") = 0
        WHEN 'range' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "amount", "currency") = 0
        WHEN 'choice' THEN coalesce("count", 0) > 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "amount", "currency") = 0
        ELSE coalesce("amount", 0) > 0 AND "currency" IS NOT NULL AND num_nonnulls("count", "slug", "artist", "member", "season", "class", "on_offline") = 0
      END);
