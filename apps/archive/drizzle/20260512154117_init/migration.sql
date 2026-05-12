CREATE TABLE "interaction" (
	"id" text PRIMARY KEY,
	"ts" timestamp with time zone NOT NULL,
	"ts_end" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"kind" text NOT NULL,
	"req_method" text NOT NULL,
	"req_path" text NOT NULL,
	"req_upstream" text NOT NULL,
	"req_headers" jsonb NOT NULL,
	"req_body" bytea NOT NULL,
	"req_hash" text,
	"req_canonical" text,
	"res_status" integer NOT NULL,
	"res_status_text" text NOT NULL,
	"res_headers" jsonb NOT NULL,
	"res_content_encoding" text,
	"res_body" bytea NOT NULL,
	"res_body_truncated" boolean DEFAULT false NOT NULL,
	"proxy_error" text,
	"block_from" integer,
	"block_to" integer,
	"worker_url" text,
	"height" integer,
	"rpc_method" text
);
--> statement-breakpoint
CREATE TABLE "replay_state" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "interaction_req_hash_idx" ON "interaction" ("req_hash");--> statement-breakpoint
CREATE INDEX "interaction_kind_ts_idx" ON "interaction" ("kind","ts");--> statement-breakpoint
CREATE INDEX "interaction_block_from_idx" ON "interaction" ("block_from");--> statement-breakpoint
CREATE INDEX "interaction_rpc_method_hash_idx" ON "interaction" ("rpc_method","req_hash");