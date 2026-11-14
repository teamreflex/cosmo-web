-- builds the unique index beside the old one and swaps them, so reads of locked_objekts never wait on the build
CREATE UNIQUE INDEX "address_token_unique_idx" ON "locked_objekts" ("address","tokenId");--> statement-breakpoint
DROP INDEX "address_token_idx";--> statement-breakpoint
ALTER INDEX "address_token_unique_idx" RENAME TO "address_token_idx";
