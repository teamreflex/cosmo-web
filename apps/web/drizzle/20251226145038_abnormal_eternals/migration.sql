DROP INDEX "events_published_idx";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "spin_available_after";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "is_published";--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "era_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "artist" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_era_id_eras_id_fkey", ADD CONSTRAINT "events_era_id_eras_id_fkey" FOREIGN KEY ("era_id") REFERENCES "eras"("id") ON DELETE CASCADE;