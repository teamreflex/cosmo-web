ALTER TABLE "profiles" RENAME TO "cosmo_account";--> statement-breakpoint
ALTER TABLE "cosmo_account" RENAME COLUMN "nickname" TO "username";--> statement-breakpoint
ALTER TABLE "cosmo_account" RENAME COLUMN "user_address" TO "address";--> statement-breakpoint
DROP INDEX "profiles_nickname_idx";--> statement-breakpoint
DROP INDEX "profiles_nickname_address_idx";--> statement-breakpoint
DROP INDEX "profiles_address_idx";--> statement-breakpoint
CREATE INDEX "profiles_username_idx" ON "cosmo_account" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_address_idx" ON "cosmo_account" USING btree ("username","address");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_address_idx" ON "cosmo_account" USING btree ("address");