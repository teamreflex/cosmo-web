CREATE TYPE "cosmo_link_event" AS ENUM('linked', 'unlinked');--> statement-breakpoint
CREATE TYPE "cosmo_link_reason" AS ENUM('verified', 'account-deleted', 'staff-move');--> statement-breakpoint
CREATE TYPE "report_status" AS ENUM('open', 'escalated', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "report_target_type" AS ENUM('user', 'message', 'listing', 'feedback', 'trade');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "collection_price_history" (
	"collection_id" varchar(36),
	"date" date,
	"floor_usd" real NOT NULL,
	"median_usd" real NOT NULL,
	"listing_count" integer NOT NULL,
	CONSTRAINT "collection_price_history_pkey" PRIMARY KEY("collection_id","date")
);
--> statement-breakpoint
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
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reporter_id" text,
	"target_type" "report_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"reason" varchar(32) NOT NULL,
	"note" varchar(1000),
	"status" "report_status" DEFAULT 'open'::"report_status" NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	CONSTRAINT "reports_resolved_chk" CHECK (("status" IN ('resolved', 'dismissed')) = ("resolved_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "staff_audit" (
	"id" serial PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"staff_id" text NOT NULL,
	"action" varchar(48) NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" text NOT NULL,
	"report_id" uuid,
	"detail" jsonb
);
--> statement-breakpoint
DROP INDEX "fx_rates_currency_idx";--> statement-breakpoint
ALTER TABLE "list_drain_cursor" ADD COLUMN "chain_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role" DEFAULT 'user'::"user_role" NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "cosmo_account_user_id_unique_idx" ON "cosmo_account" ("user_id");--> statement-breakpoint
CREATE INDEX "cosmo_link_audit_cosmo_account_idx" ON "cosmo_link_audit" ("cosmo_account_id","id");--> statement-breakpoint
CREATE INDEX "cosmo_link_audit_user_idx" ON "cosmo_link_audit" ("user_id","id");--> statement-breakpoint
CREATE INDEX "fx_rates_currency_date_idx" ON "fx_rates" ("currency","date" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "reports_open_reporter_target_idx" ON "reports" ("reporter_id","target_type","target_id") WHERE "status" IN ('open', 'escalated');--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "staff_audit_staff_idx" ON "staff_audit" ("staff_id","id");--> statement-breakpoint
CREATE INDEX "staff_audit_action_idx" ON "staff_audit" ("action","id");--> statement-breakpoint
CREATE INDEX "staff_audit_report_idx" ON "staff_audit" ("report_id");--> statement-breakpoint
CREATE INDEX "staff_audit_target_idx" ON "staff_audit" ("target_type","target_id");--> statement-breakpoint
ALTER TABLE "cosmo_link_audit" ADD CONSTRAINT "cosmo_link_audit_cosmo_account_id_cosmo_account_id_fkey" FOREIGN KEY ("cosmo_account_id") REFERENCES "cosmo_account"("id");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_user_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "staff_audit" ADD CONSTRAINT "staff_audit_report_id_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL;