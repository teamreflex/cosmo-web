DROP INDEX "profiles_address_idx";--> statement-breakpoint
DROP INDEX "profiles_cosmo_id_idx";--> statement-breakpoint
DROP INDEX "profiles_username_idx";--> statement-breakpoint
DROP INDEX "profiles_username_address_idx";--> statement-breakpoint
ALTER TABLE "cosmo_account" ADD COLUMN "user_id" text DEFAULT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cosmo_account_address_idx" ON "cosmo_account" USING btree ("address");--> statement-breakpoint
CREATE INDEX "cosmo_account_cosmo_id_idx" ON "cosmo_account" USING btree ("cosmo_id");--> statement-breakpoint
CREATE INDEX "cosmo_account_username_idx" ON "cosmo_account" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "cosmo_account_username_address_idx" ON "cosmo_account" USING btree ("username","address");--> statement-breakpoint
CREATE INDEX "cosmo_account_user_id_idx" ON "cosmo_account" USING btree ("user_id");