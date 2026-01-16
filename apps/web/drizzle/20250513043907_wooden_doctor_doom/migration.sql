CREATE TABLE "polygon_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" "citext" NOT NULL,
	"created_at" timestamp NOT NULL,
	"contract" "citext" NOT NULL,
	"poll_id" integer NOT NULL,
	"candidate_id" integer,
	"index" integer NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cosmo_account" ADD COLUMN "polygon_address" "citext" DEFAULT NULL;--> statement-breakpoint
CREATE INDEX "polygon_votes_address_idx" ON "polygon_votes" USING btree ("address");--> statement-breakpoint
CREATE INDEX "polygon_votes_poll_id_idx" ON "polygon_votes" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "polygon_votes_contract_poll_id_idx" ON "polygon_votes" USING btree ("contract","poll_id");--> statement-breakpoint
CREATE INDEX "cosmo_account_polygon_address_idx" ON "cosmo_account" USING btree ("polygon_address");