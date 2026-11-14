import type {
  ObjektSummariesResponseSchema,
  ObjektSummarySchema,
} from "../schema/collection";

export type ObjektSummariesResponse = typeof ObjektSummariesResponseSchema.Type;

export type ObjektSummary = typeof ObjektSummarySchema.Type;
