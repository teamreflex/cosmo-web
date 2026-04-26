import { customType, timestamp } from "drizzle-orm/pg-core";

export const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

// bun:sql JSON.stringifies jsonb params itself, so we skip Drizzle's built-in stringify to avoid double-encoding.
export const bunJsonb = customType<{ data: unknown; driverData: unknown }>({
  dataType() {
    return "jsonb";
  },
});

export const createdAt = timestamp("created_at", {
  withTimezone: false,
  mode: "string",
})
  .notNull()
  .defaultNow();
