-- existing rows count as handled, so the first send-notification-emails run mails no backlog; a constant default stamps them without rewriting the table, and dropping it leaves new rows null
ALTER TABLE "notifications" ADD COLUMN "emailed_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "emailed_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_notifications" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "notifications_email_pending_idx" ON "notifications" ("created_at") WHERE ("emailed_at" is null);
