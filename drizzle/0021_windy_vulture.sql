CREATE TABLE "objekt_list_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"objekt_list_id" uuid NOT NULL,
	"collection_id" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objekt_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"user_id" text NOT NULL,
	"name" varchar(24) NOT NULL,
	"slug" "citext" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "objekt_list_entries" ADD CONSTRAINT "objekt_list_entries_objekt_list_id_objekt_lists_id_fk" FOREIGN KEY ("objekt_list_id") REFERENCES "public"."objekt_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objekt_lists" ADD CONSTRAINT "objekt_lists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "objekt_list_entries_list_idx" ON "objekt_list_entries" USING btree ("objekt_list_id");--> statement-breakpoint
CREATE INDEX "objekt_lists_user_idx" ON "objekt_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "objekt_lists_slug_idx" ON "objekt_lists" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "objekt_lists_user_slug_idx" ON "objekt_lists" USING btree ("user_id","slug");