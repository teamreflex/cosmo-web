ALTER TABLE "trade_offers" ADD COLUMN "proposed_by" "trade_side";--> statement-breakpoint
UPDATE trade_offers SET proposed_by = 'from' WHERE kind = 'trade' AND expires_at IS NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_offers" ADD CONSTRAINT "trade_offers_proposed_chk" CHECK (("status" <> 'pending' OR "proposed_by" IS NOT NULL) AND ("kind" = 'trade' OR "proposed_by" IS NULL));
