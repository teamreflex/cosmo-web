import * as z from "zod";

export const recordKind = z.enum(["height", "worker-lookup", "worker-query"]);
export type RecordKind = z.infer<typeof recordKind>;

const headersSchema = z.array(z.tuple([z.string(), z.string()]));

const blockRangeSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative().nullable(),
});

export const proxyRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  ts: z.iso.datetime(),
  tsEnd: z.iso.datetime(),
  durationMs: z.number().nonnegative(),
  kind: recordKind,

  req: z.object({
    method: z.string(),
    incomingPath: z.string(),
    upstreamUrl: z.string(),
    headers: headersSchema,
    bodyBase64: z.string(),
    bodyHash: z.string().nullable(),
    bodyCanonical: z.string().nullable(),
  }),

  res: z.object({
    status: z.number().int().nonnegative(),
    statusText: z.string(),
    headers: headersSchema,
    contentEncoding: z.string().nullable(),
    bodyBase64: z.string(),
    bodyTruncated: z.boolean(),
    bodyTruncatedAt: z.number().int().nonnegative().nullable(),
  }),

  proxyError: z.string().nullable(),

  meta: z.object({
    blockRange: blockRangeSchema.nullable(),
    workerUrl: z.string().nullable(),
    height: z.number().int().nonnegative().nullable(),
  }),
});

export type ProxyRecord = z.infer<typeof proxyRecordSchema>;
