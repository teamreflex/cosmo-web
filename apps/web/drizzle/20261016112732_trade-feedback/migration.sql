CREATE TYPE "feedback_rating" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TYPE "feedback_role" AS ENUM('buyer', 'seller', 'trader');--> statement-breakpoint
CREATE TABLE "trade_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"trade_id" uuid NOT NULL,
	"from_user_id" varchar(32),
	"to_user_id" varchar(32),
	"from_address" citext NOT NULL,
	"to_address" citext NOT NULL,
	"rater_side" "trade_side" NOT NULL,
	"role" "feedback_role" NOT NULL,
	"rating" "feedback_rating" NOT NULL,
	"comment" varchar(280),
	"communication" smallint,
	"speed" smallint,
	"scored" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	CONSTRAINT "trade_feedback_stars_chk" CHECK (("communication" IS NULL OR "communication" BETWEEN 1 AND 5) AND ("speed" IS NULL OR "speed" BETWEEN 1 AND 5)),
	CONSTRAINT "trade_feedback_addresses_chk" CHECK ("from_address" <> "to_address"),
	CONSTRAINT "trade_feedback_users_chk" CHECK ("from_user_id" IS NULL OR "to_user_id" IS NULL OR "from_user_id" <> "to_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_feedback_stats" (
	"address" citext PRIMARY KEY,
	"positive" integer DEFAULT 0 NOT NULL,
	"neutral" integer DEFAULT 0 NOT NULL,
	"negative" integer DEFAULT 0 NOT NULL,
	"score" integer GENERATED ALWAYS AS (positive - negative) STORED NOT NULL,
	"percent_positive" double precision GENERATED ALWAYS AS (positive::float8 / nullif(positive + negative, 0)) STORED,
	CONSTRAINT "user_feedback_stats_positive_chk" CHECK ("positive" >= 0),
	CONSTRAINT "user_feedback_stats_neutral_chk" CHECK ("neutral" >= 0),
	CONSTRAINT "user_feedback_stats_negative_chk" CHECK ("negative" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "trade_feedback_trade_side_idx" ON "trade_feedback" ("trade_id","rater_side");--> statement-breakpoint
CREATE INDEX "trade_feedback_to_address_idx" ON "trade_feedback" ("to_address","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "trade_feedback_to_user_idx" ON "trade_feedback" ("to_user_id");--> statement-breakpoint
CREATE INDEX "trade_feedback_from_user_idx" ON "trade_feedback" ("from_user_id");--> statement-breakpoint
ALTER TABLE "trade_feedback" ADD CONSTRAINT "trade_feedback_trade_id_trade_offers_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trade_offers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_feedback" ADD CONSTRAINT "trade_feedback_from_user_id_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "trade_feedback" ADD CONSTRAINT "trade_feedback_to_user_id_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "user"("id") ON DELETE SET NULL;