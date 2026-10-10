CREATE TYPE "notification_type" AS ENUM('trade_have', 'trade_want');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" varchar(32) NOT NULL,
	"type" "notification_type" NOT NULL,
	"read_at" timestamp with time zone,
	"actor_id" varchar(32),
	"list_id" uuid,
	"collection_id" varchar(36),
	CONSTRAINT "notifications_subject_chk" CHECK ("type" not in ('trade_have', 'trade_want') or num_nonnulls("actor_id", "list_id", "collection_id") = 3)
);
--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" ("user_id","created_at") WHERE ("read_at" is null);--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_trade_dedup_idx" ON "notifications" ("actor_id","user_id","type","collection_id") WHERE "type" in ('trade_have', 'trade_want');--> statement-breakpoint
CREATE INDEX "notifications_list_idx" ON "notifications" ("list_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_list_id_objekt_lists_id_fkey" FOREIGN KEY ("list_id") REFERENCES "objekt_lists"("id") ON DELETE CASCADE;