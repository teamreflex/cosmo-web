import { index, pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { citext } from "../common";

export const objektMetadata = pgTable(
  "objekt_metadata",
  {
    id: serial("id").primaryKey(),
    collectionId: varchar("collection_id", { length: 36 }).notNull().unique(), // slug: atom01-jinsoul-101z
    description: varchar("description", { length: 255 }).notNull(),
    contributor: citext("user_address", { length: 42 }).notNull(),
  },
  (t) => [
    index("objekt_metadata_collection_idx").on(t.collectionId),
    index("objekt_metadata_contributor_idx").on(t.contributor),
  ]
);
