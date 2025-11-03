ALTER TABLE "profiles" ADD COLUMN "is_modhaus" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "profiles_is_modhaus_idx" ON "profiles" USING btree ("is_modhaus");