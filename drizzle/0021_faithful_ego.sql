ALTER TABLE "cosmo_account" ALTER COLUMN "cosmo_id" DROP NOT NULL;--> statement-breakpoint
-- shouldn't be using 0 to denote never have been signed in
UPDATE "cosmo_account" SET "cosmo_id" = NULL WHERE "cosmo_id" = 0;