CREATE TABLE "report_messages" (
	"report_id" uuid PRIMARY KEY,
	"message_id" bigint NOT NULL,
	"trade_id" uuid NOT NULL,
	"sender_id" varchar(32),
	"sent_at" timestamp with time zone NOT NULL,
	"body" bytea NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_messages" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trade_messages" ALTER COLUMN "body" SET DATA TYPE bytea USING "body"::bytea;--> statement-breakpoint
CREATE INDEX "report_messages_trade_idx" ON "report_messages" ("trade_id");--> statement-breakpoint
ALTER TABLE "report_messages" ADD CONSTRAINT "report_messages_report_id_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_messages" ADD CONSTRAINT "trade_messages_removed_chk" CHECK ("removed_at" IS NULL OR "body" IS NULL);--> statement-breakpoint
ALTER TABLE "trade_messages" DROP CONSTRAINT "trade_messages_kind_chk", ADD CONSTRAINT "trade_messages_kind_chk" CHECK (CASE "kind" WHEN 'text' THEN "event" IS NULL ELSE "event" IS NOT NULL AND num_nonnulls("body", "sender_id", "removed_at") = 0 END);