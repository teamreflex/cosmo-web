ALTER TABLE "notifications" ADD COLUMN "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "token_id" integer;--> statement-breakpoint
CREATE INDEX "notifications_offer_idx" ON "notifications" ("offer_id");--> statement-breakpoint
CREATE INDEX "trade_offers_deadline_idx" ON "trade_offers" ("deadline_at") WHERE "kind" = 'trade' AND "status" = 'accepted';--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_offer_id_trade_offers_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "trade_offers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_subject_chk", ADD CONSTRAINT "notifications_subject_chk" CHECK (CASE WHEN "type" IN ('trade_have', 'trade_want') THEN num_nonnulls("actor_id", "list_id", "collection_id") = 3 AND "offer_id" IS NULL AND "token_id" IS NULL ELSE "offer_id" IS NOT NULL AND "list_id" IS NULL AND "collection_id" IS NULL END);