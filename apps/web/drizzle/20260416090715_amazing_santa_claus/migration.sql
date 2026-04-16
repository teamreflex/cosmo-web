CREATE TYPE "list_type" AS ENUM('regular', 'have', 'want', 'sale');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('list_match');--> statement-breakpoint
CREATE TABLE "list_drain_cursor" (
	"name" text PRIMARY KEY,
	"seq" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "objekt_list_entries" ADD COLUMN "token_id" text;--> statement-breakpoint
ALTER TABLE "objekt_list_entries" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD COLUMN "type" "list_type" DEFAULT 'regular'::"list_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD COLUMN "discoverable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD COLUMN "linked_want_list_id" uuid;--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_list_match_dedup_idx" ON "notifications" ("user_id",(payload->>'sourceUserId'),(payload->>'collectionId')) WHERE "type" = 'list_match';--> statement-breakpoint
CREATE INDEX "objekt_list_entries_collection_id_idx" ON "objekt_list_entries" ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "objekt_list_entries_token_list_unique_idx" ON "objekt_list_entries" ("token_id","objekt_list_id") WHERE "token_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "objekt_lists_trade_active_idx" ON "objekt_lists" ("type","user_id") WHERE type IN ('have', 'want') AND discoverable = true;--> statement-breakpoint
CREATE UNIQUE INDEX "objekt_lists_linked_want_list_idx" ON "objekt_lists" ("linked_want_list_id") WHERE linked_want_list_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD CONSTRAINT "objekt_lists_linked_want_list_id_objekt_lists_id_fkey" FOREIGN KEY ("linked_want_list_id") REFERENCES "objekt_lists"("id") ON DELETE SET NULL;--> statement-breakpoint
-- backfill: pre-existing sale lists used currency-not-null as the side-channel; promote them to type='sale' before the CHECK is enforced
UPDATE "objekt_lists" SET "type" = 'sale' WHERE "currency" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD CONSTRAINT "objekt_lists_currency_type_chk" CHECK (("type" = 'sale') = ("currency" IS NOT NULL));