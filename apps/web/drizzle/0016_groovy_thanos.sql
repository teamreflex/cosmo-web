ALTER TABLE "profiles" ADD COLUMN "is_abstract" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "profiles_is_abstract_idx" ON "profiles" USING btree ("is_abstract");