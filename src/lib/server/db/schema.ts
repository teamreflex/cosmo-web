import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  mysqlTable,
  serial,
  varchar,
} from "drizzle-orm/mysql-core";

export const lockedObjekts = mysqlTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    userAddress: varchar("user_address", { length: 42 }).notNull(),
    tokenId: int("tokenId").notNull(),
    locked: boolean("locked").notNull(),
  },
  (table) => ({
    addressIdx: index("address_idx").on(table.userAddress),
    addressTokenIdx: index("address_token_idx").on(
      table.userAddress,
      table.tokenId
    ),
  })
);

export const lists = mysqlTable(
  "lists",
  {
    id: serial("id").primaryKey(),
    userAddress: varchar("user_address", { length: 42 }).notNull(),
    name: varchar("name", { length: 24 }).notNull(),
    slug: varchar("slug", { length: 24 }).notNull(),
  },
  (table) => ({
    addressIdx: index("address_idx").on(table.userAddress),
    slugIdx: index("slug_idx").on(table.slug),
  })
);

export const listRelations = relations(lists, ({ many }) => ({
  entries: many(listEntries),
}));

export const listEntries = mysqlTable(
  "list_entries",
  {
    id: serial("id").primaryKey(),
    listId: int("list_id").notNull(),
    objektId: int("objekt_id").notNull(),
  },
  (table) => ({
    listIdx: index("list_idx").on(table.listId),
  })
);

export const listEntryRelations = relations(listEntries, ({ one }) => ({
  list: one(lists, {
    fields: [listEntries.listId],
    references: [lists.id],
  }),
}));
