ALTER TABLE "user" ADD COLUMN "discord" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "twitter" text;--> statement-breakpoint
CREATE INDEX "user_display_username_idx" ON "user" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "user_discord_idx" ON "user" USING btree ("discord");--> statement-breakpoint
CREATE INDEX "user_twitter_idx" ON "user" USING btree ("twitter");