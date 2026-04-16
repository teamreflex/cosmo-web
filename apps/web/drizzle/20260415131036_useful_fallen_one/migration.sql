CREATE TABLE "list_drain_cursor" (
	"name" text PRIMARY KEY,
	"seq" bigint NOT NULL
);
--> statement-breakpoint
DROP INDEX "notifications_list_match_dedup_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_list_match_dedup_idx" ON "notifications" ("user_id",(payload->>'sourceUserId'),(payload->>'collectionId')) WHERE "type" = 'list_match';