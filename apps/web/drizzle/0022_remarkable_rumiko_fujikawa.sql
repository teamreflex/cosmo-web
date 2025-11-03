ALTER TABLE "locked_objekts" RENAME COLUMN "user_address" TO "address";--> statement-breakpoint
ALTER TABLE "objekt_metadata" RENAME COLUMN "user_address" TO "address";--> statement-breakpoint
ALTER TABLE "pins" RENAME COLUMN "user_address" TO "address";--> statement-breakpoint
DROP INDEX "locked_objekts_user_address_idx";--> statement-breakpoint
DROP INDEX "pins_userAddress_idx";--> statement-breakpoint
DROP INDEX "address_locked_idx";--> statement-breakpoint
DROP INDEX "address_token_idx";--> statement-breakpoint
DROP INDEX "objekt_metadata_contributor_idx";--> statement-breakpoint
CREATE INDEX "locked_objekts_address_idx" ON "locked_objekts" USING btree ("address");--> statement-breakpoint
CREATE INDEX "pins_address_idx" ON "pins" USING btree ("address");--> statement-breakpoint
CREATE INDEX "address_locked_idx" ON "locked_objekts" USING btree ("address","locked");--> statement-breakpoint
CREATE INDEX "address_token_idx" ON "locked_objekts" USING btree ("address","tokenId");--> statement-breakpoint
CREATE INDEX "objekt_metadata_contributor_idx" ON "objekt_metadata" USING btree ("address");