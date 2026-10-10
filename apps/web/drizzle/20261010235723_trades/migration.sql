CREATE TYPE "listing_offer_mode" AS ENUM('price_or_offer', 'price_only', 'offer_only');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('paypal_ff', 'wise', 'bank_transfer', 'promptpay', 'kakaopay', 'toss', 'gcash', 'alipay', 'wechat_pay', 'venmo', 'cashapp');--> statement-breakpoint
CREATE TYPE "trade_canceller" AS ENUM('from', 'to', 'staff');--> statement-breakpoint
CREATE TYPE "trade_item_kind" AS ENUM('objekt', 'payment');--> statement-breakpoint
CREATE TYPE "trade_message_kind" AS ENUM('text', 'event');--> statement-breakpoint
CREATE TYPE "trade_offer_kind" AS ENUM('listing', 'trade');--> statement-breakpoint
CREATE TYPE "trade_offer_status" AS ENUM('open', 'claimed', 'filled', 'broken', 'removed', 'abandoned', 'pending', 'accepted', 'disputed', 'completed', 'cancelled', 'timed_out', 'declined', 'countered', 'stale', 'withdrawn', 'expired');--> statement-breakpoint
CREATE TYPE "trade_side" AS ENUM('from', 'to');--> statement-breakpoint
CREATE TYPE "trade_want_kind" AS ENUM('exact', 'range', 'payment');--> statement-breakpoint
CREATE TABLE "trade_listing_wants" (
	"id" bigserial PRIMARY KEY,
	"listing_id" uuid NOT NULL,
	"kind" "trade_want_kind" NOT NULL,
	"count" smallint,
	"slug" varchar(255),
	"artist" varchar(32),
	"member" varchar(32),
	"season" varchar(32),
	"class" varchar(8),
	"on_offline" varchar(16),
	"artists" varchar(32)[],
	"members" varchar(32)[],
	"seasons" varchar(32)[],
	"classes" varchar(8)[],
	"on_offlines" varchar(16)[],
	"amount" numeric(14,2),
	"currency" varchar(3),
	CONSTRAINT "trade_listing_wants_shape_chk" CHECK (CASE "kind"
        WHEN 'exact' THEN coalesce("count", 0) > 0 AND num_nulls("slug", "artist", "member", "season", "class", "on_offline") = 0 AND num_nonnulls("artists", "members", "seasons", "classes", "on_offlines", "amount", "currency") = 0
        WHEN 'range' THEN coalesce("count", 0) > 0 AND num_nulls("artists", "members", "seasons", "classes", "on_offlines") = 0 AND num_nonnulls("slug", "artist", "member", "season", "class", "on_offline", "amount", "currency") = 0
        ELSE coalesce("amount", 0) > 0 AND "currency" IS NOT NULL AND num_nonnulls("count", "slug", "artist", "member", "season", "class", "on_offline", "artists", "members", "seasons", "classes", "on_offlines") = 0
      END)
);
--> statement-breakpoint
CREATE TABLE "trade_messages" (
	"id" bigserial PRIMARY KEY,
	"trade_id" uuid NOT NULL,
	"sender_id" varchar(32),
	"kind" "trade_message_kind" NOT NULL,
	"body" varchar(1000),
	"event" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_messages_kind_chk" CHECK (CASE "kind" WHEN 'text' THEN "event" IS NULL ELSE "event" IS NOT NULL AND num_nonnulls("body", "sender_id") = 0 END)
);
--> statement-breakpoint
CREATE TABLE "trade_offer_items" (
	"id" bigserial PRIMARY KEY,
	"offer_id" uuid NOT NULL,
	"listing_id" uuid,
	"sender" "trade_side" NOT NULL,
	"kind" "trade_item_kind" NOT NULL,
	"token_id" integer,
	"slug" varchar(255),
	"artist" varchar(32),
	"member" varchar(32),
	"season" varchar(32),
	"class" varchar(8),
	"on_offline" varchar(16),
	"amount" numeric(14,2),
	"currency" varchar(3),
	"method" "payment_method",
	"live" boolean DEFAULT false NOT NULL,
	"transferred_at" timestamp with time zone,
	"tx_hash" varchar(66),
	"marked_paid_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "trade_offer_items_objekt_chk" CHECK (CASE "kind" WHEN 'objekt' THEN num_nulls("token_id", "slug", "artist", "member", "season", "class", "on_offline") = 0 AND num_nonnulls("amount", "currency", "method", "marked_paid_at", "confirmed_at") = 0 ELSE num_nonnulls("token_id", "slug", "artist", "member", "season", "class", "on_offline", "transferred_at", "tx_hash") = 0 AND coalesce("amount", 0) > 0 AND "currency" IS NOT NULL AND NOT "live" END),
	CONSTRAINT "trade_offer_items_transfer_chk" CHECK (("transferred_at" IS NULL) = ("tx_hash" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "trade_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" "trade_offer_kind" NOT NULL,
	"status" "trade_offer_status" NOT NULL,
	"from_user_id" varchar(32),
	"to_user_id" varchar(32),
	"from_address" citext NOT NULL,
	"to_address" citext,
	"parent_id" uuid,
	"deadline_at" timestamp with time zone,
	"offers" "listing_offer_mode",
	"slugs" varchar(255)[] DEFAULT '{}'::varchar(255)[] NOT NULL,
	"artists" varchar(32)[] DEFAULT '{}'::varchar(32)[] NOT NULL,
	"seasons" varchar(32)[] DEFAULT '{}'::varchar(32)[] NOT NULL,
	"members" varchar(32)[] DEFAULT '{}'::varchar(32)[] NOT NULL,
	"classes" varchar(8)[] DEFAULT '{}'::varchar(8)[] NOT NULL,
	"on_offlines" varchar(16)[] DEFAULT '{}'::varchar(16)[] NOT NULL,
	"cancelled_by" "trade_canceller",
	"abandoned_by" "trade_side"[],
	"dispute_report_id" uuid,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	CONSTRAINT "trade_offers_status_chk" CHECK (CASE "kind" WHEN 'listing' THEN "status" IN ('open', 'claimed', 'filled', 'withdrawn', 'broken', 'removed', 'abandoned') ELSE "status" IN ('pending', 'accepted', 'disputed', 'completed', 'cancelled', 'timed_out', 'declined', 'withdrawn', 'countered', 'expired', 'stale') END),
	CONSTRAINT "trade_offers_listing_chk" CHECK ("kind" = 'trade' OR num_nulls("to_user_id", "to_address", "parent_id", "deadline_at", "accepted_at", "expires_at") = 6),
	CONSTRAINT "trade_offers_trade_chk" CHECK ("kind" = 'listing' OR ("to_address" IS NOT NULL AND "offers" IS NULL AND "note" IS NULL)),
	CONSTRAINT "trade_offers_accepted_chk" CHECK ("status" NOT IN ('accepted', 'disputed', 'completed', 'timed_out') OR ("deadline_at" IS NOT NULL AND "accepted_at" IS NOT NULL)),
	CONSTRAINT "trade_offers_ended_chk" CHECK (("status" IN ('filled', 'withdrawn', 'expired', 'broken', 'removed', 'abandoned', 'completed', 'cancelled', 'timed_out', 'declined', 'countered', 'stale')) = ("ended_at" IS NOT NULL)),
	CONSTRAINT "trade_offers_cancelled_chk" CHECK (("status" = 'cancelled') = ("cancelled_by" IS NOT NULL)),
	CONSTRAINT "trade_offers_abandoned_chk" CHECK (CASE WHEN "status" = 'timed_out' THEN coalesce(cardinality("abandoned_by"), 0) BETWEEN 1 AND 2 ELSE "abandoned_by" IS NULL END),
	CONSTRAINT "trade_offers_disputed_chk" CHECK ("status" <> 'disputed' OR "dispute_report_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX "trade_listing_wants_listing_idx" ON "trade_listing_wants" ("listing_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_listing_wants_payment_idx" ON "trade_listing_wants" ("listing_id") WHERE "kind" = 'payment';--> statement-breakpoint
CREATE INDEX "trade_messages_trade_idx" ON "trade_messages" ("trade_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_offer_items_live_token_idx" ON "trade_offer_items" ("token_id") WHERE "live";--> statement-breakpoint
CREATE INDEX "trade_offer_items_token_idx" ON "trade_offer_items" ("token_id");--> statement-breakpoint
CREATE INDEX "trade_offer_items_offer_idx" ON "trade_offer_items" ("offer_id");--> statement-breakpoint
CREATE INDEX "trade_offer_items_listing_idx" ON "trade_offer_items" ("listing_id");--> statement-breakpoint
CREATE INDEX "trade_offers_feed_idx" ON "trade_offers" ("created_at","id") WHERE "kind" = 'listing' AND "status" = 'open';--> statement-breakpoint
CREATE INDEX "trade_offers_feed_filters_idx" ON "trade_offers" USING gin ("slugs","artists","seasons","members","classes","on_offlines") WHERE "kind" = 'listing' AND "status" = 'open';--> statement-breakpoint
CREATE INDEX "trade_offers_from_user_idx" ON "trade_offers" ("from_user_id","status");--> statement-breakpoint
CREATE INDEX "trade_offers_to_user_idx" ON "trade_offers" ("to_user_id","status");--> statement-breakpoint
ALTER TABLE "trade_listing_wants" ADD CONSTRAINT "trade_listing_wants_listing_id_trade_offers_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "trade_offers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_messages" ADD CONSTRAINT "trade_messages_trade_id_trade_offers_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trade_offers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_messages" ADD CONSTRAINT "trade_messages_sender_id_user_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "trade_offer_items" ADD CONSTRAINT "trade_offer_items_offer_id_trade_offers_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "trade_offers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_offer_items" ADD CONSTRAINT "trade_offer_items_listing_id_trade_offers_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "trade_offers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_from_user_id_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_to_user_id_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_parent_id_trade_offers_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "trade_offers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_dispute_report_id_reports_id_fkey" FOREIGN KEY ("dispute_report_id") REFERENCES "reports"("id") ON DELETE SET NULL;