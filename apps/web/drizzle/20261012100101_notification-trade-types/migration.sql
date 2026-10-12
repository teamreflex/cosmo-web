ALTER TYPE "notification_type" ADD VALUE 'listing_claimed';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_completed';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_timed_out';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_cancelled';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_disputed';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_dispute_resolved';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_deadline_extended';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_token_moved';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'trade_token_untransferable';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'listing_closed';