CREATE TYPE "cosmo_link_event" AS ENUM('linked', 'unlinked');--> statement-breakpoint
CREATE TYPE "cosmo_link_reason" AS ENUM('verified', 'account-deleted', 'staff-move');--> statement-breakpoint
CREATE TABLE "cosmo_link_audit" (
	"id" serial PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cosmo_account_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"event" "cosmo_link_event" NOT NULL,
	"reason" "cosmo_link_reason" NOT NULL,
	"staff_id" text,
	CONSTRAINT "cosmo_link_audit_staff_chk" CHECK (("reason" = 'staff-move') = ("staff_id" IS NOT NULL)),
	CONSTRAINT "cosmo_link_audit_event_chk" CHECK (("reason" <> 'verified' OR "event" = 'linked') AND ("reason" <> 'account-deleted' OR "event" = 'unlinked'))
);
--> statement-breakpoint
CREATE INDEX "cosmo_link_audit_cosmo_account_idx" ON "cosmo_link_audit" ("cosmo_account_id","id");--> statement-breakpoint
CREATE INDEX "cosmo_link_audit_user_idx" ON "cosmo_link_audit" ("user_id","id");--> statement-breakpoint
ALTER TABLE "cosmo_link_audit" ADD CONSTRAINT "cosmo_link_audit_cosmo_account_id_cosmo_account_id_fkey" FOREIGN KEY ("cosmo_account_id") REFERENCES "cosmo_account"("id");--> statement-breakpoint
ALTER TABLE "cosmo_link_audit" ADD CONSTRAINT "cosmo_link_audit_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "cosmo_link_audit" ADD CONSTRAINT "cosmo_link_audit_staff_id_user_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "user"("id");