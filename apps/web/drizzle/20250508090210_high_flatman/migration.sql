DROP INDEX "profiles_is_modhaus_idx";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "artist";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "privacy_votes";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "grid_columns";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "objekt_editor";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "data_source";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "is_modhaus";