ALTER TABLE "pins" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "pins_address_position_idx" ON "pins" ("address","position");--> statement-breakpoint
-- backfill: preserve today's newest-first order (the prior desc(id) read) as ascending position per address
UPDATE "pins" SET "position" = sub.rn FROM (
  SELECT id, (row_number() OVER (PARTITION BY address ORDER BY id DESC) - 1) AS rn FROM "pins"
) sub WHERE "pins".id = sub.id;
