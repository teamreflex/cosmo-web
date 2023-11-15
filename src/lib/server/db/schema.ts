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
