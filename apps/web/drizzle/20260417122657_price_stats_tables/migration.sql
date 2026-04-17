CREATE TABLE "collection_price_stats" (
	"collection_id" varchar(36) PRIMARY KEY,
	"median_price_usd" real NOT NULL,
	"listing_count" integer NOT NULL,
	"min_price_usd" real NOT NULL,
	"max_price_usd" real NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"date" date,
	"currency" varchar(3),
	"rate_to_usd" real NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fx_rates_pkey" PRIMARY KEY("date","currency")
);
--> statement-breakpoint
CREATE INDEX "collection_price_stats_median_idx" ON "collection_price_stats" ("median_price_usd");--> statement-breakpoint
CREATE INDEX "fx_rates_currency_idx" ON "fx_rates" ("currency");