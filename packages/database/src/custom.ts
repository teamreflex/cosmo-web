import { customType, timestamp } from "drizzle-orm/pg-core";

export const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

/**
 * Insert-time timestamp; `createdAt` covers the common column name.
 */
export const createdTimestamp = (name: string) =>
  timestamp(name, {
    withTimezone: false,
    mode: "date",
  })
    .notNull()
    .defaultNow();

export const createdAt = createdTimestamp("created_at");
