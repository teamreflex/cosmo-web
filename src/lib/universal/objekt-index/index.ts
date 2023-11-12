import { objekts } from "@/lib/server/db/schema";
import { InferSelectModel } from "drizzle-orm";

export type IndexedObjekt = InferSelectModel<typeof objekts>;
export type IndexedCosmoResponse = {
  hasNext: boolean;
  total: number;
  nextPage: number | undefined;
  objekts: IndexedObjekt[];
};
