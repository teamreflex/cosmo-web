import { objekts } from "@/lib/server/db/indexer/schema";
import { lists } from "@/lib/server/db/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type IndexedObjekt = InferSelectModel<typeof objekts>;
export type IndexedCosmoResponse = {
  hasNext: boolean;
  total: number;
  nextPage: number | undefined;
  objekts: IndexedObjekt[];
};

export type ObjektList = InferSelectModel<typeof lists>;
export type CreateObjektList = InferInsertModel<typeof lists>;
export type UpdateObjektList = InferInsertModel<typeof lists>;
