CREATE TABLE "collection_price_history" (
	"collection_id" varchar(36),
	"date" date,
	"floor_usd" real NOT NULL,
	"median_usd" real NOT NULL,
	"listing_count" integer NOT NULL,
	CONSTRAINT "collection_price_history_pkey" PRIMARY KEY("collection_id","date")
);
