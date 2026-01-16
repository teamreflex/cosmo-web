DROP INDEX "profiles_priv_nickname_idx";--> statement-breakpoint
DROP INDEX "profiles_priv_objekts_idx";--> statement-breakpoint
DROP INDEX "profiles_priv_como_idx";--> statement-breakpoint
DROP INDEX "profiles_priv_trades_idx";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "privacy_nickname";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "privacy_objekts";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "privacy_como";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "privacy_trades";