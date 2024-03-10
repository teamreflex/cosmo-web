CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS "list_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"collection_id" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" "citext" NOT NULL,
	"name" varchar(24) NOT NULL,
	"slug" "citext" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locked_objekts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" "citext" NOT NULL,
	"tokenId" integer NOT NULL,
	"locked" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" "citext" NOT NULL,
	"cosmo_id" integer NOT NULL,
	"nickname" "citext" NOT NULL,
	"artist" varchar(24) NOT NULL,
	"privacy_nickname" boolean DEFAULT false NOT NULL,
	"privacy_objekts" boolean DEFAULT false NOT NULL,
	"privacy_como" boolean DEFAULT false NOT NULL,
	"privacy_trades" boolean DEFAULT false NOT NULL,
	"grid_columns" integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "list_entries_list_idx" ON "list_entries" ("list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lists_address_idx" ON "lists" ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lists_slug_idx" ON "lists" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "address_token_idx" ON "locked_objekts" ("user_address","tokenId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_address_idx" ON "profiles" ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_cosmo_id_idx" ON "profiles" ("cosmo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_nickname_idx" ON "profiles" ("nickname");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_priv_nickname_idx" ON "profiles" ("privacy_nickname");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_priv_objekts_idx" ON "profiles" ("privacy_objekts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_priv_como_idx" ON "profiles" ("privacy_como");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_priv_trades_idx" ON "profiles" ("privacy_trades");