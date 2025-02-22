CREATE TABLE "cosmo_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_token" varchar(255) NOT NULL,
	"refresh_token" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gravities" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist" "citext" NOT NULL,
	"cosmo_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"image" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gravity_poll_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"cosmo_gravity_poll_id" integer NOT NULL,
	"candidate_id" integer NOT NULL,
	"cosmo_id" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"image" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gravity_polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"cosmo_gravity_id" integer NOT NULL,
	"cosmo_id" integer NOT NULL,
	"poll_id_on_chain" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cosmo_tokens_access_token_idx" ON "cosmo_tokens" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "cosmo_tokens_refresh_token_idx" ON "cosmo_tokens" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX "gravities_artist_idx" ON "gravities" USING btree ("artist");--> statement-breakpoint
CREATE INDEX "gravities_cosmo_id_idx" ON "gravities" USING btree ("cosmo_id");--> statement-breakpoint
CREATE INDEX "gravity_poll_candidates_cosmo_gravity_poll_id_idx" ON "gravity_poll_candidates" USING btree ("cosmo_gravity_poll_id");--> statement-breakpoint
CREATE INDEX "gravity_poll_candidates_candidate_id_idx" ON "gravity_poll_candidates" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "gravity_poll_candidates_cosmo_id_idx" ON "gravity_poll_candidates" USING btree ("cosmo_id");--> statement-breakpoint
CREATE INDEX "gravity_polls_cosmo_gravity_id_idx" ON "gravity_polls" USING btree ("cosmo_gravity_id");--> statement-breakpoint
CREATE INDEX "gravity_polls_cosmo_id_idx" ON "gravity_polls" USING btree ("cosmo_id");--> statement-breakpoint
CREATE INDEX "gravity_polls_poll_id_on_chain_idx" ON "gravity_polls" USING btree ("poll_id_on_chain");