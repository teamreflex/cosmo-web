DROP TABLE "notifications";--> statement-breakpoint
DROP TYPE "notification_type";--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('trade_have', 'trade_want', 'sale_listed');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" varchar(32) NOT NULL,
	"type" "notification_type" NOT NULL,
	"read_at" timestamp with time zone,
	"actor_id" varchar(32),
	"list_id" uuid,
	"collection_id" varchar(36),
	"entry_id" uuid,
	CONSTRAINT "notifications_subject_chk" CHECK ("type" not in ('trade_have', 'trade_want', 'sale_listed') or num_nonnulls("actor_id", "list_id", "collection_id") = 3)
);--> statement-breakpoint
CREATE TABLE "collection_watches" (
	"user_id" varchar(32),
	"collection_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_watches_pkey" PRIMARY KEY("user_id","collection_id")
);--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" ("user_id","created_at") WHERE ("read_at" is null);--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_trade_dedup_idx" ON "notifications" ("user_id","actor_id","type","collection_id") WHERE "type" in ('trade_have', 'trade_want');--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_sale_dedup_idx" ON "notifications" ("entry_id","user_id") WHERE "type" = 'sale_listed';--> statement-breakpoint
CREATE INDEX "collection_watches_collection_idx" ON "collection_watches" ("collection_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_list_id_objekt_lists_id_fkey" FOREIGN KEY ("list_id") REFERENCES "objekt_lists"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_entry_id_objekt_list_entries_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "objekt_list_entries"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "collection_watches" ADD CONSTRAINT "collection_watches_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
