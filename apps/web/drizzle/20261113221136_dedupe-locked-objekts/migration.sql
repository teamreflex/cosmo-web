-- holds off lock toggles until the release commits, so no duplicate lands between the dedupe and the unique index
LOCK TABLE "locked_objekts" IN SHARE ROW EXCLUSIVE MODE;--> statement-breakpoint
-- keeps the newest lock per address and token, so address_token_idx can be unique
DELETE FROM "locked_objekts" a
USING "locked_objekts" b
WHERE a."address" = b."address"
  AND a."tokenId" = b."tokenId"
  AND a."id" < b."id";
