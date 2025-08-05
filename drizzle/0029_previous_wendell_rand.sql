CREATE TABLE "cosmo_account_changes" (
	"address" "citext" NOT NULL,
	"username" "citext" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cosmo_account_changes_address_idx" ON "cosmo_account_changes" USING btree ("address");--> statement-breakpoint
CREATE INDEX "cosmo_account_changes_username_idx" ON "cosmo_account_changes" USING btree ("username");--> statement-breakpoint
CREATE INDEX "cosmo_account_changes_created_at_idx" ON "cosmo_account_changes" USING btree ("created_at");