CREATE TABLE IF NOT EXISTS "pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" "citext" NOT NULL,
	"token_id" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pins_userAddress_idx" ON "pins" ("user_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pins_token_id_idx" ON "pins" ("token_id");