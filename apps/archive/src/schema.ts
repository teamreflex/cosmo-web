import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return "bytea";
  },
});

export const interactionKind = [
  "height",
  "worker-lookup",
  "worker-query",
  "rpc",
] as const;

export type InteractionKind = (typeof interactionKind)[number];

export const interactions = pgTable(
  "interaction",
  {
    id: text("id").primaryKey(),
    ts: timestamp("ts", { withTimezone: true, mode: "string" }).notNull(),
    tsEnd: timestamp("ts_end", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    durationMs: integer("duration_ms").notNull(),
    kind: text("kind").$type<InteractionKind>().notNull(),

    reqMethod: text("req_method").notNull(),
    reqPath: text("req_path").notNull(),
    reqUpstream: text("req_upstream").notNull(),
    reqHeaders: jsonb("req_headers").$type<[string, string][]>().notNull(),
    reqBody: bytea("req_body").notNull(),
    reqHash: text("req_hash"),
    reqCanonical: text("req_canonical"),

    resStatus: integer("res_status").notNull(),
    resStatusText: text("res_status_text").notNull(),
    resHeaders: jsonb("res_headers").$type<[string, string][]>().notNull(),
    resContentEncoding: text("res_content_encoding"),
    resBody: bytea("res_body").notNull(),
    resBodyTruncated: boolean("res_body_truncated").notNull().default(false),

    proxyError: text("proxy_error"),

    // gateway-specific (nullable)
    blockFrom: integer("block_from"),
    blockTo: integer("block_to"),
    workerUrl: text("worker_url"),
    height: integer("height"),

    // RPC-specific (nullable)
    rpcMethod: text("rpc_method"),
  },
  (t) => [
    index("interaction_req_hash_idx").on(t.reqHash),
    index("interaction_kind_ts_idx").on(t.kind, t.ts),
    index("interaction_block_from_idx").on(t.blockFrom),
    index("interaction_rpc_method_hash_idx").on(t.rpcMethod, t.reqHash),
  ],
);

export const replayState = pgTable("replay_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
