ALTER TYPE "notification_type" ADD VALUE 'trade_cancel_requested';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_cancel_agreed';--> statement-breakpoint
ALTER TYPE "trade_canceller" ADD VALUE 'both';--> statement-breakpoint
ALTER TABLE "trade_offers" ADD COLUMN "cancel_requested_by" "trade_side";