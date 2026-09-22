CREATE TYPE "binder_layout" AS ENUM('3x3', '2x2', '4x3');--> statement-breakpoint
CREATE TABLE "binder_entries" (
	"binder_id" uuid,
	"page" integer,
	"slot" integer,
	"token_id" integer NOT NULL,
	"placed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "binder_entries_pkey" PRIMARY KEY("binder_id","page","slot"),
	CONSTRAINT "binder_entries_page_chk" CHECK ("page" >= 0),
	CONSTRAINT "binder_entries_slot_chk" CHECK ("slot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "binders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(24) NOT NULL,
	"slug" citext NOT NULL,
	"layout" "binder_layout" NOT NULL,
	"colour" varchar(7) NOT NULL,
	"page_count" integer DEFAULT 1 NOT NULL,
	"cover_token_id" integer,
	CONSTRAINT "binders_colour_chk" CHECK ("colour" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "binders_page_count_chk" CHECK ("page_count" BETWEEN 1 AND 20)
);
--> statement-breakpoint
ALTER TABLE "pins" ADD COLUMN "binder_id" uuid;--> statement-breakpoint
ALTER TABLE "pins" ALTER COLUMN "token_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "binder_entries_binder_token_idx" ON "binder_entries" ("binder_id","token_id");--> statement-breakpoint
CREATE INDEX "binder_entries_token_id_idx" ON "binder_entries" ("token_id");--> statement-breakpoint
CREATE UNIQUE INDEX "binders_user_slug_idx" ON "binders" ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pins_address_binder_idx" ON "pins" ("address","binder_id");--> statement-breakpoint
ALTER TABLE "binder_entries" ADD CONSTRAINT "binder_entries_binder_id_binders_id_fkey" FOREIGN KEY ("binder_id") REFERENCES "binders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "binders" ADD CONSTRAINT "binders_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_binder_id_binders_id_fkey" FOREIGN KEY ("binder_id") REFERENCES "binders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_target_chk" CHECK (num_nonnulls("token_id", "binder_id") = 1);