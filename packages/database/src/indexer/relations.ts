import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  collections: {
    transfers: r.many.transfers(),
    objekts: r.many.objekts(),
  },
  objekts: {
    transfers: r.many.transfers(),
    collection: r.one.collections({
      from: r.objekts.collectionId,
      to: r.collections.id,
      // a collection will always exist for an objekt
      optional: false,
    }),
  },
  transfers: {
    objekt: r.one.objekts({
      from: r.transfers.objektId,
      to: r.objekts.id,
    }),
    collection: r.one.collections({
      from: r.transfers.collectionId,
      to: r.collections.id,
    }),
  },
}));
